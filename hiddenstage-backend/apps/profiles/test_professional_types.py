"""Five professional types, manager association requests, portfolio and team access."""

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.testutils import ensure_categories, make_provider, make_user
from apps.network.models import AssociationStatus, NetworkAssociation, NetworkInvitation
from apps.profiles.models import (
    PortfolioItem,
    ProfileTeamMember,
    ProviderKind,
    ProviderProfile,
    ServiceCategory,
)

PROFILE = "/api/v1/me/provider-profile/"
PORTFOLIO = "/api/v1/me/portfolio/"
TEAM = "/api/v1/me/team/"
MANAGERS = "/api/v1/network/managers/"


def base_payload(**overrides):
    payload = {
        "display_name": "Lumen Events",
        "kind": "MANAGER",
        "description": "Full service event management studio for private celebrations.",
        "contact": "+919812345678",
        "categories": ["photography"],
        "coverage": [
            {
                "pin_code": "560001",
                "locality": "MG Road",
                "city": "Bengaluru",
                "state": "Karnataka",
            }
        ],
    }
    payload.update(overrides)
    return payload


class ProfessionalTypeTests(TestCase):
    def setUp(self):
        ensure_categories()
        self.user = make_user("pro@example.com", role="PROVIDER")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_all_five_types_are_accepted(self):
        for kind in (
            "MANAGER",
            "INDIVIDUAL_SERVICE_PROVIDER",
            "ASSOCIATED_SERVICE_PROVIDER",
            "TALENT",
            "WORKER",
        ):
            payload = base_payload(kind=kind)
            if kind == "INDIVIDUAL_SERVICE_PROVIDER":
                payload["categories"] = ["photography"]
                payload["primary_category"] = "photography"
            response = self.client.put(PROFILE, payload, format="json")
            self.assertEqual(response.status_code, 200, response.content)
            self.assertEqual(response.data["kind"], kind)
            self.assertEqual(response.data["kind_label"], ProviderKind(kind).label)

    def test_individual_provider_cannot_select_multiple_primary_services(self):
        response = self.client.put(
            PROFILE,
            base_payload(
                kind="INDIVIDUAL_SERVICE_PROVIDER",
                categories=["photography", "decor-and-styling"],
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("categories", response.data)

    def test_individual_provider_with_one_service_is_complete(self):
        response = self.client.put(
            PROFILE,
            base_payload(
                kind="INDIVIDUAL_SERVICE_PROVIDER",
                categories=["photography"],
                primary_category="photography",
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        profile = ProviderProfile.objects.get(user=self.user)
        self.assertEqual(profile.primary_category.code, "photography")
        self.assertIsNotNone(profile.completed_at)

    def test_username_is_unique(self):
        first = make_provider("first@example.com")
        ProviderProfile.objects.filter(user=first).update(username="lumen")
        response = self.client.put(PROFILE, base_payload(username="lumen"), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("username", response.data)


class ManagerAssociationTests(TestCase):
    def setUp(self):
        ensure_categories()
        self.manager_user = make_provider("manager@example.com")
        manager_profile = ProviderProfile.objects.get(user=self.manager_user)
        manager_profile.kind = ProviderKind.MANAGER
        manager_profile.username = "lumen-events"
        manager_profile.completed_at = manager_profile.completed_at
        manager_profile.save()

        self.professional = make_provider("assoc@example.com")
        profile = ProviderProfile.objects.get(user=self.professional)
        profile.kind = ProviderKind.ASSOCIATED_SERVICE_PROVIDER
        profile.completed_at = profile.completed_at
        profile.save()

        self.client = APIClient()
        self.client.force_authenticate(self.professional)

    def test_search_finds_a_manager_by_username(self):
        response = self.client.get(MANAGERS, {"q": "lumen-events"})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["username"], "lumen-events")

    def test_search_does_not_create_an_association(self):
        self.client.get(MANAGERS, {"q": "lumen"})
        self.assertFalse(NetworkAssociation.objects.exists())

    def test_request_then_manager_accepts(self):
        request = self.client.post(
            "/api/v1/network/managers/request/",
            {"manager_id": str(self.manager_user.id), "message": "Can we work together?"},
            format="json",
        )
        self.assertEqual(request.status_code, 201, request.content)
        invitation = NetworkInvitation.objects.get(id=request.data["id"])
        self.assertEqual(invitation.initiated_by, "PROFESSIONAL_REQUESTS")
        self.assertEqual(invitation.status, "PENDING")
        # A search before acceptance still shows the pending request, not a link.
        self.assertFalse(NetworkAssociation.objects.exists())

        manager_client = APIClient()
        manager_client.force_authenticate(self.manager_user)
        accept = manager_client.post(
            f"/api/v1/network/invitations/{invitation.id}/accept/", {}, format="json"
        )
        self.assertEqual(accept.status_code, 200, accept.content)
        self.assertTrue(
            NetworkAssociation.objects.filter(
                manager=self.manager_user,
                worker=self.professional,
                status=AssociationStatus.ACTIVE,
            ).exists()
        )

    def test_professional_cannot_accept_their_own_request(self):
        request = self.client.post(
            "/api/v1/network/managers/request/",
            {"manager_id": str(self.manager_user.id)},
            format="json",
        )
        invitation_id = request.data["id"]
        response = self.client.post(
            f"/api/v1/network/invitations/{invitation_id}/accept/", {}, format="json"
        )
        self.assertEqual(response.status_code, 403)

    def test_individual_provider_has_a_network_view_instead_of_an_error(self):
        individual = make_provider("individual@example.com")
        ProviderProfile.objects.filter(user=individual).update(
            kind=ProviderKind.INDIVIDUAL_SERVICE_PROVIDER
        )
        client = APIClient()
        client.force_authenticate(individual)
        response = client.get("/api/v1/network/associations/?history=1")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(list(response.data), [])

    def test_talent_is_not_treated_as_a_worker_for_assignments(self):
        talent = make_provider("talent@example.com")
        ProviderProfile.objects.filter(user=talent).update(kind=ProviderKind.TALENT)
        # The worker discovery endpoint is manager-only and lists Worker profiles.
        manager_client = APIClient()
        manager_client.force_authenticate(self.manager_user)
        response = manager_client.get("/api/v1/network/workers/")
        self.assertEqual(response.status_code, 200)
        listed = {item["user_id"] for item in response.data}
        self.assertNotIn(str(talent.id), listed)


class PortfolioTests(TestCase):
    def setUp(self):
        ensure_categories()
        self.owner = make_provider("portfolio-owner@example.com")
        self.other = make_provider("portfolio-other@example.com")
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def test_public_and_private_items_are_created_and_served_correctly(self):
        public = self.client.post(
            PORTFOLIO,
            {"title": "Wedding stage", "media_kind": "LINK", "external_url": "https://example.com/a", "visibility": "PUBLIC"},
            format="multipart",
        )
        self.assertEqual(public.status_code, 201, public.content)
        private = self.client.post(
            PORTFOLIO,
            {"title": "Internal rehearsal", "media_kind": "LINK", "external_url": "https://example.com/b", "visibility": "PRIVATE"},
            format="multipart",
        )
        self.assertEqual(private.status_code, 201, private.content)

        profile = ProviderProfile.objects.get(user=self.owner)
        from apps.events.models import Event
        from apps.core.testutils import make_customer

        # The public profile exposes only the public item.
        customer = make_customer("browse@example.com")
        anon = APIClient()
        anon.force_authenticate(customer)
        # A provider profile is only public once completed; the fixture provider is.
        response = anon.get(f"/api/v1/profiles/{profile.id}/")
        self.assertEqual(response.status_code, 200, response.content)
        titles = [item["title"] for item in response.data["portfolio"]]
        self.assertIn("Wedding stage", titles)
        self.assertNotIn("Internal rehearsal", titles)

    def test_reorder_and_delete(self):
        first = self.client.post(PORTFOLIO, {"title": "First", "media_kind": "LINK", "external_url": "https://example.com/1"}, format="multipart")
        second = self.client.post(PORTFOLIO, {"title": "Second", "media_kind": "LINK", "external_url": "https://example.com/2"}, format="multipart")
        response = self.client.post(
            "/api/v1/me/portfolio/reorder/",
            {"order": [second.data["id"], first.data["id"]]},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data[0]["title"], "Second")
        delete = self.client.delete(f"{PORTFOLIO}{first.data['id']}/")
        self.assertEqual(delete.status_code, 204)
        self.assertFalse(PortfolioItem.objects.filter(id=first.data["id"]).exists())

    def test_owner_cannot_edit_someone_elses_item(self):
        created = self.client.post(PORTFOLIO, {"title": "Mine", "media_kind": "LINK", "external_url": "https://example.com/x"}, format="multipart")
        other_client = APIClient()
        other_client.force_authenticate(self.other)
        response = other_client.patch(
            f"{PORTFOLIO}{created.data['id']}/", {"title": "Hijacked"}, format="multipart"
        )
        self.assertEqual(response.status_code, 404)


class TeamPermissionTests(TestCase):
    def setUp(self):
        ensure_categories()
        self.manager = make_provider("team-manager@example.com")
        ProviderProfile.objects.filter(user=self.manager).update(kind=ProviderKind.MANAGER)
        self.assistant = make_provider("assistant@example.com")
        self.client = APIClient()
        self.client.force_authenticate(self.manager)

    def test_manager_grants_scoped_profile_access(self):
        response = self.client.post(
            TEAM,
            {
                "invite_email": self.assistant.email,
                "permissions": ["MANAGE_BUSINESS_PROFILE"],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        membership = ProfileTeamMember.objects.get(owner=self.manager, member=self.assistant)
        self.assertEqual(membership.permissions, ["MANAGE_BUSINESS_PROFILE"])

        manager_profile = ProviderProfile.objects.get(user=self.manager)
        assistant_client = APIClient()
        assistant_client.force_authenticate(self.assistant)
        patched = assistant_client.patch(
            f"{PROFILE}?profile_id={manager_profile.id}",
            {"headline": "Managed by the team"},
            format="json",
        )
        self.assertEqual(patched.status_code, 200, patched.content)
        manager_profile.refresh_from_db()
        self.assertEqual(manager_profile.headline, "Managed by the team")

    def test_assistant_without_permission_is_rejected(self):
        self.client.post(
            TEAM,
            {"invite_email": self.assistant.email, "permissions": ["MANAGE_PORTFOLIO"]},
            format="json",
        )
        manager_profile = ProviderProfile.objects.get(user=self.manager)
        assistant_client = APIClient()
        assistant_client.force_authenticate(self.assistant)
        response = assistant_client.patch(
            f"{PROFILE}?profile_id={manager_profile.id}",
            {"headline": "Not allowed"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_revoking_access_removes_the_permission(self):
        created = self.client.post(
            TEAM,
            {"invite_email": self.assistant.email, "permissions": ["MANAGE_BUSINESS_PROFILE"]},
            format="json",
        )
        revoke = self.client.delete(f"{TEAM}{created.data['id']}/")
        self.assertEqual(revoke.status_code, 204)
        membership = ProfileTeamMember.objects.get(id=created.data["id"])
        self.assertFalse(membership.is_active)
        self.assertEqual(membership.permissions, [])

    def test_assistant_cannot_add_themselves(self):
        response = self.client.post(
            TEAM,
            {"invite_email": self.manager.email, "permissions": ["MANAGE_TEAM"]},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
