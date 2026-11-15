"""Independent provider opportunities and direct quotation eligibility."""

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.testutils import (
    make_customer,
    make_event,
    make_provider,
)
from apps.profiles.models import ProviderKind, ProviderProfile
from apps.quotations.services import create_quotation

OPPORTUNITIES = "/api/v1/provider/opportunities/"


class ProviderOpportunityTests(TestCase):
    def setUp(self):
        self.customer = make_customer("organiser@example.com")
        self.worker = make_provider("worker@example.com", categories=("photography",))
        ProviderProfile.objects.filter(user=self.worker).update(kind=ProviderKind.WORKER)
        self.event = make_event(self.customer, category="photography")

    def test_matched_worker_sees_the_public_request(self):
        client = APIClient()
        client.force_authenticate(self.worker)
        response = client.get(OPPORTUNITIES)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data), 1, response.data)
        opportunity = response.data[0]
        self.assertEqual(str(opportunity["id"]), str(self.event.id))
        self.assertEqual(opportunity["requirements"][0]["category"], "photography")
        self.assertIsNone(opportunity["invitation_status"])
        self.assertFalse(opportunity["already_quoted"])

    def test_opportunity_hides_customer_contact_and_exact_venue(self):
        client = APIClient()
        client.force_authenticate(self.worker)
        opportunity = client.get(OPPORTUNITIES).data[0]
        self.assertNotIn("pin_code", opportunity)
        self.assertNotIn("venue_name", opportunity)
        self.assertNotIn("venue_address", opportunity)
        self.assertNotIn("customer", opportunity)
        self.assertNotIn("email", opportunity)

    def test_worker_can_create_a_quotation_without_an_invitation(self):
        quotation = create_quotation(provider_user=self.worker, event=self.event)
        self.assertEqual(quotation.event_id, self.event.id)
        self.assertEqual(quotation.provider_id, self.worker.id)

    def test_provider_outside_coverage_does_not_see_the_request(self):
        remote = make_provider(
            "remote@example.com",
            categories=("photography",),
            pin_code="400001",
            city="Mumbai",
        )
        client = APIClient()
        client.force_authenticate(remote)
        response = client.get(OPPORTUNITIES)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data, [])

    def test_provider_without_the_category_does_not_see_the_request(self):
        chef = make_provider("chef@example.com", categories=("food-and-drink",))
        client = APIClient()
        client.force_authenticate(chef)
        self.assertEqual(client.get(OPPORTUNITIES).data, [])

    def test_customer_cannot_read_the_provider_opportunity_feed(self):
        client = APIClient()
        client.force_authenticate(self.customer)
        self.assertEqual(client.get(OPPORTUNITIES).status_code, 403)

    def test_provider_kind_is_exposed_in_public_detail(self):
        client = APIClient()
        client.force_authenticate(self.customer)
        profile = ProviderProfile.objects.get(user=self.worker)
        response = client.get(f"/api/v1/providers/{profile.id}/")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["kind"], ProviderKind.WORKER)
