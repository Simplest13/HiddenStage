"""Independent provider opportunities and direct quotation eligibility."""

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.commitments.services import accept_quotation, release_commitment
from apps.core.testutils import (
    invite_and_accept,
    make_customer,
    make_event,
    make_provider,
    submitted_quotation,
)
from apps.profiles.models import ProfileTeamMember, ProviderKind, ProviderProfile
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


class ProviderDetailAccessTests(TestCase):
    def setUp(self):
        self.customer = make_customer("detail-customer@example.com")
        self.other_customer = make_customer("unrelated-customer@example.com")
        self.provider = make_provider("detail-provider@example.com")
        self.event = make_event(self.customer)
        invite_and_accept(self.event, self.provider)
        quotation = submitted_quotation(self.provider, self.event)
        self.commitment = accept_quotation(
            actor=self.customer,
            quotation_id=quotation.id,
            revision_id=quotation.current_revision.id,
            requirement_ids=[self.event.requirements.first().id],
        )
        self.profile = ProviderProfile.objects.get(user=self.provider)
        self.url = f"/api/v1/providers/{self.profile.id}/"

    def test_contact_is_hidden_from_anonymous_and_unrelated_customers(self):
        client = APIClient()
        anonymous_response = client.get(self.url)
        self.assertEqual(anonymous_response.status_code, 200, anonymous_response.content)
        self.assertEqual(anonymous_response.data["contact"], "")

        client.force_authenticate(self.other_customer)
        unrelated_response = client.get(self.url)
        self.assertEqual(unrelated_response.status_code, 200, unrelated_response.content)
        self.assertEqual(unrelated_response.data["contact"], "")

    def test_matching_customer_retains_contact_after_commitment_release(self):
        client = APIClient()
        client.force_authenticate(self.customer)
        response = client.get(self.url)
        self.assertEqual(response.data["contact"], self.profile.contact)

        release_commitment(actor=self.customer, commitment_id=self.commitment.id)
        released_response = client.get(self.url)
        self.assertEqual(released_response.status_code, 200, released_response.content)
        self.assertEqual(released_response.data["contact"], self.profile.contact)

    def test_commitment_to_another_provider_does_not_grant_contact(self):
        other_provider = make_provider("other-detail-provider@example.com")
        other_profile = ProviderProfile.objects.get(user=other_provider)
        client = APIClient()
        client.force_authenticate(self.customer)

        response = client.get(f"/api/v1/providers/{other_profile.id}/")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["contact"], "")

    def test_owner_and_staff_can_read_contact(self):
        client = APIClient()
        client.force_authenticate(self.provider)
        owner_response = client.get(self.url)
        self.assertEqual(owner_response.data["contact"], self.profile.contact)

        staff = User.objects.create_user(
            email="staff@example.com", password="HiddenStage!2026", full_name="Staff"
        )
        staff.is_staff = True
        staff.save(update_fields=["is_staff"])
        client.force_authenticate(staff)
        staff_response = client.get(self.url)
        self.assertEqual(staff_response.data["contact"], self.profile.contact)

    def test_public_manager_team_detail_contains_names_only(self):
        self.profile.kind = ProviderKind.MANAGER
        self.profile.save(update_fields=["kind"])
        member = make_provider("team-member@example.com")
        member.full_name = "Production Lead"
        member.save(update_fields=["full_name"])
        ProfileTeamMember.objects.create(
            owner=self.provider,
            member=member,
            permissions=["manage_assignments"],
        )

        response = APIClient().get(self.url)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["team_members"], ["Production Lead"])
