from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.testutils import ensure_categories, make_provider
from apps.profiles.models import ProviderProfile, ProviderService


class ProviderOnboardingTests(TestCase):
    def setUp(self):
        ensure_categories()
        self.provider = make_provider()
        self.profile = ProviderProfile.objects.get(user=self.provider)
        self.client = APIClient()
        self.client.force_authenticate(self.provider)

    def test_individual_provider_cannot_save_multiple_categories(self):
        response = self.client.patch(
            "/api/v1/me/provider-profile/",
            {
                "kind": "INDIVIDUAL_SERVICE_PROVIDER",
                "categories": ["photography", "videography"],
                "onboarding_step": 2,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_duplicate_provider_service_returns_validation_error(self):
        ProviderService.objects.filter(provider=self.profile).delete()
        payload = {"category": "photography", "title": "Photography"}
        first = self.client.post("/api/v1/me/provider-services/", payload, format="json")
        self.assertEqual(first.status_code, 201, first.content)

        duplicate = self.client.post("/api/v1/me/provider-services/", payload, format="json")
        self.assertEqual(duplicate.status_code, 400, duplicate.content)
        self.assertIn("category", duplicate.data)

    def test_role_data_and_progress_are_persisted(self):
        response = self.client.patch(
            "/api/v1/me/provider-profile/",
            {
                "kind": "TALENT",
                "categories": ["music-and-performance"],
                "role_data": {
                    "talentCategory": "DJ",
                    "performanceStyles": "Bollywood, House",
                    "instagram": "https://instagram.com/example",
                },
                "onboarding_step": 2,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.kind, "TALENT")
        self.assertEqual(self.profile.onboarding_step, 2)
        self.assertEqual(self.profile.role_data["talentCategory"], "DJ")

    def test_social_url_must_be_valid(self):
        response = self.client.patch(
            "/api/v1/me/provider-profile/",
            {
                "role_data": {
                    "instagram": "not-a-url",
                },
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("instagram", response.data)

    def test_create_custom_category_success(self):
        response = self.client.post(
            "/api/v1/catalog/categories/custom/",
            {
                "name": "Beauty",
                "description": "Professional beauty, makeup and grooming services for events.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["code"], "beauty")
        self.assertEqual(response.data["name"], "Beauty")
        self.assertTrue(response.data.get("is_custom"))

    def test_create_duplicate_category_returns_existing(self):
        # Existing category: photography
        response = self.client.post(
            "/api/v1/catalog/categories/custom/",
            {"name": "Photography"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["code"], "photography")

    def test_create_custom_category_empty_name_fails(self):
        response = self.client.post(
            "/api/v1/catalog/categories/custom/",
            {"name": "   "},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_custom_category_saved_on_provider_profile(self):
        cat_resp = self.client.post(
            "/api/v1/catalog/categories/custom/",
            {"name": "Beauty"},
            format="json",
        )
        self.assertIn(cat_resp.status_code, [200, 201])
        code = cat_resp.data["code"]

        patch_resp = self.client.patch(
            "/api/v1/me/provider-profile/",
            {
                "kind": "INDIVIDUAL_SERVICE_PROVIDER",
                "categories": [code],
                "onboarding_step": 2,
            },
            format="json",
        )
        self.assertEqual(patch_resp.status_code, 200, patch_resp.content)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.declared_categories(), ["beauty"])
        self.assertIsNotNone(self.profile.primary_category)
        self.assertEqual(self.profile.primary_category.code, "beauty")
