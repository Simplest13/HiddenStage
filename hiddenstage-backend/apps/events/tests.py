"""Event request rules: ownership, edit locking and submission validation."""

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.testutils import make_customer, make_provider
from apps.events.models import Event, EventStatus
from apps.invitations.models import Invitation, InvitationStatus

EVENTS = "/api/v1/events/"


def event_payload(**overrides):
    payload = {
        "name": "Terrace supper",
        "event_type": "Private dinner",
        "event_date": str(timezone.localdate() + timedelta(days=21)),
        "start_time": "18:30",
        "end_time": "22:30",
        "guest_count": 24,
        "pin_code": "560001",
        "locality": "MG Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "requirements": [
            {"category": "photography", "title": "Two-hour coverage", "budget_paise": 800000}
        ],
    }
    payload.update(overrides)
    return payload


class EventApiTests(TestCase):
    def setUp(self):
        self.customer = make_customer("host@example.com")
        self.client = APIClient()
        self.client.force_authenticate(self.customer)

    def test_create_and_submit_event(self):
        response = self.client.post(EVENTS, event_payload(status="SUBMITTED"), format="json")
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["status"], EventStatus.SUBMITTED)
        self.assertEqual(len(response.data["requirements"]), 1)
        self.assertIsNotNone(response.data["submitted_at"])

    def test_event_requires_at_least_one_requirement_to_submit(self):
        response = self.client.post(
            EVENTS, event_payload(status="SUBMITTED", requirements=[]), format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("requirements", response.data)

    def test_end_time_must_follow_start_time(self):
        response = self.client.post(
            EVENTS, event_payload(start_time="22:00", end_time="20:00"), format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("end_time", response.data)

    def test_overnight_event_succeeds_with_next_day_end_date(self):
        event_date = str(timezone.localdate() + timedelta(days=5))
        end_date = str(timezone.localdate() + timedelta(days=6))
        response = self.client.post(
            EVENTS,
            event_payload(
                event_date=event_date,
                end_date=end_date,
                start_time="17:00",
                end_time="02:00",
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["event_date"], event_date)
        self.assertEqual(response.data["end_date"], end_date)
        self.assertEqual(response.data["start_time"], "17:00:00")
        self.assertEqual(response.data["end_time"], "02:00:00")

    def test_invalid_end_date_before_event_date_rejected(self):
        event_date = str(timezone.localdate() + timedelta(days=5))
        end_date = str(timezone.localdate() + timedelta(days=4))
        response = self.client.post(
            EVENTS,
            event_payload(
                event_date=event_date,
                end_date=end_date,
                start_time="17:00",
                end_time="22:00",
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("end_date", response.data)

    def test_past_event_date_cannot_be_submitted(self):
        past = str(timezone.localdate() - timedelta(days=1))
        response = self.client.post(
            EVENTS, event_payload(status="SUBMITTED", event_date=past), format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("event_date", response.data)

    def test_other_customer_cannot_read_event(self):
        created = self.client.post(EVENTS, event_payload(), format="json").data
        intruder = make_customer("intruder@example.com")
        client = APIClient()
        client.force_authenticate(intruder)
        self.assertEqual(client.get(f"{EVENTS}{created['id']}/").status_code, 403)

    def test_submitted_event_locks_once_invitations_are_outstanding(self):
        created = self.client.post(
            EVENTS, event_payload(status="SUBMITTED"), format="json"
        ).data
        event = Event.objects.get(id=created["id"])
        provider = make_provider("locked-provider@example.com")
        Invitation.objects.create(
            event=event,
            provider=provider,
            requirement=event.requirements.first(),
            status=InvitationStatus.PENDING,
            expires_at=timezone.now() + timedelta(days=7),
            created_by=self.customer,
        )
        response = self.client.patch(
            f"{EVENTS}{event.id}/", {"name": "Renamed event"}, format="json"
        )
        self.assertEqual(response.status_code, 409, response.content)
        event.refresh_from_db()
        self.assertEqual(event.name, "Terrace supper")

    def test_cannot_complete_event_without_commitments(self):
        created = self.client.post(
            EVENTS, event_payload(status="SUBMITTED"), format="json"
        ).data
        response = self.client.post(f"{EVENTS}{created['id']}/complete/", format="json")
        self.assertEqual(response.status_code, 400, response.content)

    def test_customer_can_complete_event_with_commitments(self):
        from apps.commitments.services import accept_quotation
        from apps.commitments.tests import invite_and_accept, make_event, submitted_quotation
        from apps.network.models import ChatMessage

        provider = make_provider("complete-provider@example.com")
        event = make_event(self.customer)
        invite_and_accept(event, provider)
        quotation = submitted_quotation(provider, event)
        revision = quotation.revisions.get()
        accept_quotation(
            actor=self.customer,
            quotation_id=quotation.id,
            revision_id=revision.id,
            package_keys=[],
            requirement_ids=[str(revision.items.first().requirement_id)],
        )

        response = self.client.post(
            f"{EVENTS}{event.id}/complete/",
            {"feedback": "Outstanding celebration and flawless service!"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        event.refresh_from_db()
        self.assertEqual(event.status, EventStatus.CLOSED)
        self.assertIsNotNone(event.closed_at)
        self.assertTrue(
            ChatMessage.objects.filter(
                content__contains="Outstanding celebration and flawless service!"
            ).exists()
        )
