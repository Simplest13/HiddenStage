"""Authentication contract tests.

These pin the behaviour the frontend client depends on: cookie-based sessions, a
readable CSRF cookie echoed in `X-CSRFToken`, `{"detail": ...}` errors, and email
verification as a gate for marketplace actions.
"""

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import EmailVerificationToken, User
from apps.core.testutils import PASSWORD, make_customer, make_provider

REGISTER = "/api/v1/auth/register/"
LOGIN = "/api/v1/auth/login/"
LOGOUT = "/api/v1/auth/logout/"
ME = "/api/v1/auth/me/"
CSRF = "/api/v1/auth/csrf/"
VERIFY = "/api/v1/auth/email/verify/"


class RegistrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_creates_unverified_customer(self):
        response = self.client.post(
            REGISTER,
            {
                "email": "New.User@Example.com",
                "password": "a-long-enough-passphrase",
                "full_name": "  New User  ",
                "role": "CUSTOMER",
                "accept_terms": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["email"], "new.user@example.com")
        self.assertEqual(response.data["full_name"], "New User")
        self.assertFalse(response.data["email_verified"])
        user = User.objects.get(email="new.user@example.com")
        self.assertTrue(user.check_password("a-long-enough-passphrase"))
        self.assertEqual(EmailVerificationToken.objects.filter(user=user).count(), 1)

    def test_duplicate_email_is_not_disclosed(self):
        make_customer("taken@example.com")
        response = self.client.post(
            REGISTER,
            {
                "email": "taken@example.com",
                "password": "a-long-enough-passphrase",
                "full_name": "Someone",
                "accept_terms": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_terms_are_required(self):
        response = self.client.post(
            REGISTER,
            {
                "email": "no-terms@example.com",
                "password": "a-long-enough-passphrase",
                "full_name": "No Terms",
                "accept_terms": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("accept_terms", response.data)

    def test_verification_token_is_single_use(self):
        user = make_customer("verify@example.com", verified=False)
        raw_token, _ = EmailVerificationToken.issue(user, ttl_hours=24)
        first = self.client.post(VERIFY, {"token": raw_token}, format="json")
        self.assertEqual(first.status_code, 200, first.content)
        self.assertTrue(first.data["email_verified"])
        second = self.client.post(VERIFY, {"token": raw_token}, format="json")
        self.assertEqual(second.status_code, 400)


class SessionTests(TestCase):
    def setUp(self):
        # Real CSRF enforcement: the default test client would silently skip it.
        self.client = APIClient(enforce_csrf_checks=True)
        self.user = make_customer("session@example.com")

    def _csrf_token(self):
        response = self.client.get(CSRF)
        self.assertEqual(response.status_code, 200)
        return response.data["csrfToken"]

    def test_login_me_logout_round_trip(self):
        login = self.client.post(
            LOGIN, {"email": "session@example.com", "password": PASSWORD}, format="json"
        )
        self.assertEqual(login.status_code, 200, login.content)
        self.assertEqual(login.data["role"], "CUSTOMER")

        me = self.client.get(ME)
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["email"], "session@example.com")
        self.assertTrue(me.data["email_verified"])

        token = self._csrf_token()
        logout = self.client.post(LOGOUT, HTTP_X_CSRFTOKEN=token)
        self.assertEqual(logout.status_code, 204, logout.content)
        self.assertIn(self.client.get(ME).status_code, (401, 403))

    def test_session_write_requires_csrf_header(self):
        self.client.post(
            LOGIN, {"email": "session@example.com", "password": PASSWORD}, format="json"
        )
        # Authenticated by session but without the echoed CSRF token: rejected.
        self.assertEqual(self.client.post(LOGOUT).status_code, 403)

    def test_anonymous_cannot_read_me(self):
        self.assertIn(self.client.get(ME).status_code, (401, 403))

    def test_login_with_wrong_password_fails_generically(self):
        response = self.client.post(
            LOGIN, {"email": "session@example.com", "password": "wrong-password"}, format="json"
        )
        # 403 (not 400/404) and a generic detail: credentials are never confirmed.
        self.assertEqual(response.status_code, 403, response.content)
        self.assertIn("detail", response.data)
        self.assertNotIn("session@example.com", str(response.data))


class RolePermissionTests(TestCase):
    def test_provider_cannot_create_customer_event(self):
        provider = make_provider("prov@example.com")
        client = APIClient()
        client.force_authenticate(provider)
        response = client.post("/api/v1/events/", {}, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertIn("detail", response.data)

    def test_anonymous_cannot_list_events(self):
        response = APIClient().get("/api/v1/events/")
        self.assertIn(response.status_code, (401, 403))

    def test_category_catalogue_matches_frontend_slugs(self):
        response = APIClient().get("/api/v1/catalog/categories/")
        self.assertEqual(response.status_code, 200)
        codes = {row["code"] for row in response.data["results"]}
        self.assertEqual(
            codes,
            {
                "spaces",
                "food-and-drink",
                "music-and-performance",
                "photography",
                "videography",
                "decor-and-styling",
                "dj-and-sound",
                "event-hosting",
                "planning",
            },
        )
