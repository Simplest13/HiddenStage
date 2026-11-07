"""Acceptance and commitment rules.

The concurrency test at the end is the important one: two simultaneous acceptance
requests on real PostgreSQL must produce exactly one commitment.
"""

import threading
from datetime import timedelta

from django.db import DatabaseError, IntegrityError, close_old_connections, connections, transaction
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.commitments.models import (
    Commitment,
    CommitmentAudit,
    CommitmentLine,
    CommitmentStatus,
)
from apps.commitments.services import accept_quotation, release_commitment
from apps.core.exceptions import Conflict
from apps.core.testutils import (
    ensure_categories,
    invite_and_accept,
    make_customer,
    make_event,
    make_provider,
    submitted_quotation,
)
from apps.events.models import EventStatus, RequirementStatus, ServiceRequirement
from apps.events.services import create_event_with_requirements
from apps.profiles.models import ServiceCategory
from apps.quotations.services import create_quotation

ACCEPT = "/api/v1/quotations/{}/acceptance/"


class AcceptanceSetup(TestCase):
    def setUp(self):
        self.customer = make_customer("buyer@example.com")
        self.provider = make_provider("studio@example.com")
        self.event = make_event(self.customer)
        invite_and_accept(self.event, self.provider)
        self.requirement = self.event.requirements.first()
        self.client = APIClient()
        self.client.force_authenticate(self.customer)

    def _accept(self, quotation, revision, **payload):
        return self.client.post(
            ACCEPT.format(quotation.id),
            {"revision_id": str(revision.id), **payload},
            format="json",
        )


class SimpleAcceptanceTests(AcceptanceSetup):
    def test_acceptance_creates_commitment_lines_and_audit(self):
        quotation = submitted_quotation(self.provider, self.event)
        revision = quotation.revisions.get()
        response = self._accept(quotation, revision, requirement_ids=[str(self.requirement.id)])
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["status"], CommitmentStatus.ACTIVE)
        self.assertEqual(response.data["total_paise"], 1_500_000)
        self.assertEqual(len(response.data["lines"]), 1)

        commitment = Commitment.objects.get(quotation=quotation)
        self.assertEqual(commitment.customer_id, self.customer.id)
        self.assertEqual(commitment.provider_id, self.provider.id)
        self.assertEqual(CommitmentLine.objects.filter(commitment=commitment).count(), 1)
        self.assertEqual(
            CommitmentAudit.objects.filter(commitment=commitment, action="ACCEPTED").count(), 1
        )
        self.requirement.refresh_from_db()
        self.assertEqual(self.requirement.status, RequirementStatus.COMMITTED)
        self.event.refresh_from_db()
        self.assertEqual(self.event.status, EventStatus.CLOSED)

    def test_selection_is_required(self):
        quotation = submitted_quotation(self.provider, self.event)
        revision = quotation.revisions.get()
        response = self._accept(quotation, revision)
        self.assertEqual(response.status_code, 400)

    def test_provider_cannot_accept_on_the_customers_behalf(self):
        quotation = submitted_quotation(self.provider, self.event)
        revision = quotation.revisions.get()
        client = APIClient()
        client.force_authenticate(self.provider)
        response = client.post(
            ACCEPT.format(quotation.id),
            {"revision_id": str(revision.id), "requirement_ids": [str(self.requirement.id)]},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_foreign_customer_cannot_accept(self):
        quotation = submitted_quotation(self.provider, self.event)
        revision = quotation.revisions.get()
        intruder = make_customer("intruder@example.com")
        client = APIClient()
        client.force_authenticate(intruder)
        response = client.post(
            ACCEPT.format(quotation.id),
            {"revision_id": str(revision.id), "requirement_ids": [str(self.requirement.id)]},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_unverified_customer_cannot_accept(self):
        unverified = make_customer("unverified@example.com", verified=False)
        event = make_event(unverified)
        invite_and_accept(event, self.provider)
        quotation = submitted_quotation(self.provider, event)
        revision = quotation.revisions.get()
        client = APIClient()
        client.force_authenticate(unverified)
        response = client.post(
            ACCEPT.format(quotation.id),
            {
                "revision_id": str(revision.id),
                "requirement_ids": [str(event.requirements.first().id)],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

    def test_reaccepting_the_same_quotation_conflicts(self):
        quotation = submitted_quotation(self.provider, self.event)
        revision = quotation.revisions.get()
        first = self._accept(quotation, revision, requirement_ids=[str(self.requirement.id)])
        self.assertEqual(first.status_code, 201, first.content)
        second = self._accept(quotation, revision, requirement_ids=[str(self.requirement.id)])
        self.assertEqual(second.status_code, 409, second.content)
        self.assertEqual(Commitment.objects.count(), 1)

    def test_a_quoted_line_can_only_ever_be_committed_once(self):
        quotation = submitted_quotation(self.provider, self.event)
        revision = quotation.revisions.get()
        self._accept(quotation, revision, requirement_ids=[str(self.requirement.id)])
        commitment = Commitment.objects.get()
        item = revision.items.get()
        with self.assertRaises((IntegrityError, DatabaseError)):
            with transaction.atomic():
                CommitmentLine.objects.create(
                    commitment=commitment,
                    revision_item=item,
                    requirement_id=item.requirement_id,
                    title="Duplicate",
                    amount_paise=1,
                )

    def test_expired_revision_cannot_be_accepted(self):
        quotation = submitted_quotation(self.provider, self.event)
        revision = quotation.revisions.get()
        revision.status = "EXPIRED"
        revision.save(update_fields=["status", "updated_at"])
        response = self._accept(quotation, revision, requirement_ids=[str(self.requirement.id)])
        self.assertEqual(response.status_code, 409, response.content)

    def test_release_is_audited_and_idempotency_is_refused(self):
        quotation = submitted_quotation(self.provider, self.event)
        revision = quotation.revisions.get()
        self._accept(quotation, revision, requirement_ids=[str(self.requirement.id)])
        commitment = Commitment.objects.get()

        url = f"/api/v1/commitments/{commitment.id}/release/"
        released = self.client.post(url, {"reason": "Venue changed"}, format="json")
        self.assertEqual(released.status_code, 200, released.content)
        self.assertEqual(released.data["status"], CommitmentStatus.RELEASED)
        self.assertEqual(released.data["release_reason"], "Venue changed")
        self.assertEqual(CommitmentAudit.objects.filter(action="RELEASED").count(), 1)

        again = self.client.post(url, {}, format="json")
        self.assertEqual(again.status_code, 409)

    def test_provider_cannot_release_customer_commitment(self):
        quotation = submitted_quotation(self.provider, self.event)
        revision = quotation.revisions.get()
        self._accept(quotation, revision, requirement_ids=[str(self.requirement.id)])
        commitment = Commitment.objects.get()
        client = APIClient()
        client.force_authenticate(self.provider)
        self.assertEqual(
            client.post(f"/api/v1/commitments/{commitment.id}/release/", {}, format="json").status_code,
            403,
        )

    def test_commitment_list_is_scoped_to_the_signed_in_party(self):
        quotation = submitted_quotation(self.provider, self.event)
        revision = quotation.revisions.get()
        self._accept(quotation, revision, requirement_ids=[str(self.requirement.id)])

        provider_client = APIClient()
        provider_client.force_authenticate(self.provider)
        provider_rows = provider_client.get("/api/v1/provider/commitments/")
        self.assertEqual(provider_rows.status_code, 200)
        self.assertEqual(
            provider_rows.data["count"] if isinstance(provider_rows.data, dict) else len(provider_rows.data),
            1,
        )

        other = make_provider("other@example.com")
        other_client = APIClient()
        other_client.force_authenticate(other)
        hidden = other_client.get(f"/api/v1/commitments/{commitment_id(quotation)}/")
        self.assertEqual(hidden.status_code, 403)


def commitment_id(quotation):
    return Commitment.objects.get(quotation=quotation).id


class PackageAcceptanceTests(TestCase):
    """Packages are all-or-nothing, and a packaged requirement is never partial."""

    def setUp(self):
        ensure_categories()
        self.customer = make_customer("packages@example.com")
        self.provider = make_provider("bundle@example.com")
        today = timezone.localdate()
        payload = {
            "name": "Anniversary",
            "event_type": "Anniversary",
            "event_date": today + timedelta(days=45),
            "start_time": "19:00",
            "end_time": "23:00",
            "guest_count": 60,
            "pin_code": "560001",
            "locality": "MG Road",
            "city": "Bengaluru",
            "state": "Karnataka",
            "submit": True,
        }
        category = "photography"
        self.event = create_event_with_requirements(
            customer=self.customer,
            payload=payload,
            requirements=[
                {"category": category, "title": "Photography"},
                {"category": category, "title": "Album design"},
                {"category": category, "title": "Same-day edit"},
            ],
        )
        invite_and_accept(self.event, self.provider)
        r1, r2, r3 = list(self.event.requirements.order_by("position"))
        self.r1, self.r2, self.r3 = r1, r2, r3
        self.quotation = submitted_quotation(
            self.provider,
            self.event,
            lines=[
                {
                    "requirement_id": r1.id,
                    "kind": "PACKAGE",
                    "package_key": "wedding-bundle",
                    "title": "Photography day rate",
                    "amount_paise": 1_000_000,
                },
                {
                    "requirement_id": r2.id,
                    "kind": "PACKAGE",
                    "package_key": "wedding-bundle",
                    "title": "Album design",
                    "amount_paise": 500_000,
                },
                {
                    "requirement_id": r3.id,
                    "title": "Same-day edit",
                    "amount_paise": 300_000,
                },
            ],
        )
        self.revision = self.quotation.revisions.get()
        self.client = APIClient()
        self.client.force_authenticate(self.customer)

    def test_accepting_a_package_commits_every_item_in_it(self):
        response = self.client.post(
            ACCEPT.format(self.quotation.id),
            {
                "revision_id": str(self.revision.id),
                "package_keys": ["wedding-bundle"],
                "requirement_ids": [str(self.r3.id)],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["total_paise"], 1_800_000)
        self.assertEqual(len(response.data["lines"]), 3)
        self.assertEqual(CommitmentLine.objects.count(), 3)
        self.event.refresh_from_db()
        self.assertEqual(self.event.status, EventStatus.CLOSED)

    def test_packaged_requirement_cannot_be_accepted_alone(self):
        response = self.client.post(
            ACCEPT.format(self.quotation.id),
            {"revision_id": str(self.revision.id), "requirement_ids": [str(self.r1.id)]},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("package", response.content.decode())
        self.assertEqual(Commitment.objects.count(), 0)

    def test_unknown_package_key_is_rejected(self):
        response = self.client.post(
            ACCEPT.format(self.quotation.id),
            {"revision_id": str(self.revision.id), "package_keys": ["nope"]},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_unpriced_requirement_is_rejected(self):
        extra = ServiceRequirement.objects.create(
            event=self.event,
            category=ServiceCategory.objects.get(code="photography"),
            title="Not quoted",
            position=9,
        )
        response = self.client.post(
            ACCEPT.format(self.quotation.id),
            {"revision_id": str(self.revision.id), "requirement_ids": [str(extra.id)]},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)


class ConcurrentAcceptanceTests(TransactionTestCase):
    """Two threads race to accept the same revision; exactly one may win."""

    def setUp(self):
        self.customer = make_customer("race@example.com")
        self.provider = make_provider("race-studio@example.com")
        self.event = make_event(self.customer)
        invite_and_accept(self.event, self.provider)
        self.quotation = submitted_quotation(self.provider, self.event)
        self.revision = self.quotation.revisions.get()
        self.requirement_id = self.event.requirements.first().id

    def _attempt(self, barrier, results):
        close_old_connections()
        try:
            barrier.wait(timeout=10)
            commitment = accept_quotation(
                actor=self.customer,
                quotation_id=self.quotation.id,
                revision_id=self.revision.id,
                requirement_ids=[self.requirement_id],
            )
            results.append(("accepted", commitment.id))
        except Conflict as exc:
            results.append(("conflict", str(exc)))
        except Exception as exc:  # pragma: no cover - surfaced through the assertion below
            results.append(("error", repr(exc)))
        finally:
            # Child threads own their own connection objects; close them explicitly or
            # PostgreSQL refuses to drop the test database at teardown.
            connections.close_all()

    def test_only_one_commitment_is_created(self):
        barrier = threading.Barrier(2)
        results = []
        threads = [
            threading.Thread(target=self._attempt, args=(barrier, results)) for _ in range(2)
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)

        self.assertEqual(len(results), 2, results)
        self.assertEqual([r[0] for r in results].count("accepted"), 1, results)
        self.assertEqual([r[0] for r in results].count("conflict"), 1, results)
        self.assertEqual(Commitment.objects.count(), 1)
        self.assertEqual(CommitmentLine.objects.count(), 1)
        self.assertEqual(CommitmentAudit.objects.filter(action="ACCEPTED").count(), 1)

    def test_release_after_concurrent_acceptance_is_audited_once(self):
        barrier = threading.Barrier(2)
        results = []
        threads = [
            threading.Thread(target=self._attempt, args=(barrier, results)) for _ in range(2)
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)

        commitment = Commitment.objects.get()
        published = release_commitment(actor=self.customer, commitment_id=commitment.id, reason="test")
        self.assertEqual(published.status, CommitmentStatus.RELEASED)
        self.assertEqual(CommitmentAudit.objects.filter(action="RELEASED").count(), 1)
