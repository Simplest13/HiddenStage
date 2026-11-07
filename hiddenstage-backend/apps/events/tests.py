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
