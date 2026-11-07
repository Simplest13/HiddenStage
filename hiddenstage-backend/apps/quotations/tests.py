"""Quotation rules: invitation gate, totals, supersede and immutability."""

from datetime import timedelta

from django.db import DatabaseError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.testutils import (
    invite_and_accept,
    make_customer,
    make_event,
    make_provider,
    submitted_quotation,
)
from apps.quotations.models import QuotationRevision, RevisionStatus
from apps.quotations.services import create_quotation

QUOTATIONS = "/api/v1/provider/quotations/"


class QuotationPermissionTests(TestCase):
    def setUp(self):
        self.customer = make_customer("buyer@example.com")
        self.provider = make_provider("shooter@example.com")
        self.event = make_event(self.customer)
        self.client = APIClient()
        self.client.force_authenticate(self.provider)

    def test_quotation_requires_an_accepted_invitation(self):
        response = self.client.post(QUOTATIONS, {"event": str(self.event.id)}, format="json")
        self.assertEqual(response.status_code, 403, response.content)

    def test_customer_cannot_use_provider_quotation_endpoints(self):
        invite_and_accept(self.event, self.provider)
        client = APIClient()
        client.force_authenticate(self.customer)
        response = client.post(QUOTATIONS, {"event": str(self.event.id)}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_provider_cannot_quote_another_providers_quotation(self):
        invite_and_accept(self.event, self.provider)
        quotation = create_quotation(provider_user=self.provider, event=self.event)
        rival = make_provider("rival@example.com")
        client = APIClient()
        client.force_authenticate(rival)
        self.assertEqual(client.get(f"{QUOTATIONS}{quotation.id}/").status_code, 403)

    def test_foreign_customer_cannot_list_event_quotations(self):
        invite_and_accept(self.event, self.provider)
        submitted_quotation(self.provider, self.event)
        intruder = make_customer("nosy@example.com")
        client = APIClient()
        client.force_authenticate(intruder)
        response = client.get(f"/api/v1/events/{self.event.id}/quotations/")
        self.assertEqual(response.status_code, 403)


class QuotationLifecycleTests(TestCase):
    def setUp(self):
        self.customer = make_customer("buyer2@example.com")
        self.provider = make_provider("studio@example.com", categories=("photography", "videography"))
        self.event = make_event(self.customer)
        invite_and_accept(self.event, self.provider)
        self.client = APIClient()
        self.client.force_authenticate(self.provider)
        self.requirement = self.event.requirements.first()

    def _create_revision(self):
        quotation = self.client.post(
            QUOTATIONS, {"event": str(self.event.id)}, format="json"
        )
        self.assertEqual(quotation.status_code, 201, quotation.content)
        revision = self.client.post(
            f"{QUOTATIONS}{quotation.data['id']}/revisions/", {}, format="json"
        )
        self.assertEqual(revision.status_code, 201, revision.content)
        return quotation.data["id"], revision.data["id"]

    def _draft(self, quotation_id, revision_id, items, valid_until=None):
        return self.client.patch(
            f"{QUOTATIONS}{quotation_id}/revisions/{revision_id}/",
            {
                "valid_until": valid_until or str(timezone.localdate() + timedelta(days=5)),
                "notes": "Includes two photographers.",
                "items": items,
            },
            format="json",
        )

    def test_full_flow_computes_total_from_items(self):
        quotation_id, revision_id = self._create_revision()
        draft = self._draft(
            quotation_id,
            revision_id,
            [
                {"requirement_id": str(self.requirement.id), "title": "Coverage", "amount_paise": 1_200_000},
                {"requirement_id": str(self.requirement.id), "title": "Duplicate", "amount_paise": 1},
            ],
        )
        self.assertEqual(draft.status_code, 400, draft.content)
        self.assertIn("items", draft.content.decode())

        ok = self._draft(
            quotation_id,
            revision_id,
            [
                {
                    "requirement_id": str(self.requirement.id),
                    "title": "Coverage",
                    "amount_paise": 1_200_000,
                }
            ],
        )
        self.assertEqual(ok.status_code, 200, ok.content)

        submit = self.client.post(
            f"{QUOTATIONS}{quotation_id}/revisions/{revision_id}/submit/", {}, format="json"
        )
        self.assertEqual(submit.status_code, 200, submit.content)
        self.assertEqual(submit.data["status"], RevisionStatus.SUBMITTED)
        self.assertEqual(submit.data["total_paise"], 1_200_000)

    def test_package_items_require_a_package_key(self):
        quotation_id, revision_id = self._create_revision()
        response = self._draft(
            quotation_id,
            revision_id,
            [
                {
                    "requirement_id": str(self.requirement.id),
                    "kind": "PACKAGE",
                    "title": "Bundle",
                    "amount_paise": 900_000,
                }
            ],
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("package_key", response.content.decode())

    def test_submitted_revision_cannot_be_edited_through_the_api(self):
        quotation = submitted_quotation(self.provider, self.event)
        revision = quotation.revisions.get()
        response = self.client.patch(
            f"{QUOTATIONS}{quotation.id}/revisions/{revision.id}/",
            {"notes": "Changed after submission"},
            format="json",
        )
        self.assertEqual(response.status_code, 409, response.content)
        revision.refresh_from_db()
        self.assertEqual(revision.notes, "")

    def test_database_trigger_blocks_raw_updates(self):
        quotation = submitted_quotation(self.provider, self.event)
        revision = quotation.revisions.get()
        with self.assertRaises(DatabaseError):
            with transaction.atomic():
                QuotationRevision.objects.filter(pk=revision.id).update(notes="tampered")
        revision.refresh_from_db()
        self.assertEqual(revision.notes, "")
        self.assertEqual(revision.total_paise, 1_500_000)

    def test_second_revision_supersedes_the_first(self):
        quotation = submitted_quotation(self.provider, self.event)
        first = quotation.revisions.get()
        new_revision = self.client.post(
            f"{QUOTATIONS}{quotation.id}/revisions/", {}, format="json"
        )
        self.assertEqual(new_revision.status_code, 201, new_revision.content)
        draft = self._draft(
            quotation.id,
            new_revision.data["id"],
            [
                {
                    "requirement_id": str(self.requirement.id),
                    "title": "Coverage with album",
                    "amount_paise": 1_900_000,
                }
            ],
        )
        self.assertEqual(draft.status_code, 200, draft.content)
        submit = self.client.post(
            f"{QUOTATIONS}{quotation.id}/revisions/{new_revision.data['id']}/submit/",
            {},
            format="json",
        )
        self.assertEqual(submit.status_code, 200, submit.content)

        first.refresh_from_db()
        self.assertEqual(first.status, RevisionStatus.SUPERSEDED)
        self.assertEqual(first.total_paise, 1_500_000)  # quoted history preserved
        quotation.refresh_from_db()
        self.assertEqual(quotation.current_revision_id, new_revision.data["id"])

    def test_customer_comparison_sees_all_quotations(self):
        submitted_quotation(self.provider, self.event)
        second = make_provider("second@example.com", categories=("photography",))
        invite_and_accept(self.event, second)
        submitted_quotation(second, self.event)

        client = APIClient()
        client.force_authenticate(self.customer)
        response = client.get(f"/api/v1/events/{self.event.id}/quotations/")
        self.assertEqual(response.status_code, 200, response.content)
        rows = response.data["results"] if isinstance(response.data, dict) else response.data
        self.assertEqual(len(rows), 2)
