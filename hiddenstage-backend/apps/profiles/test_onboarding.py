from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.testutils import ensure_categories, make_provider
from apps.profiles.models import ProviderProfile


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
