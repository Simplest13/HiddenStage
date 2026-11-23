"""Authentication contract tests.

These pin the behaviour the frontend client depends on: cookie-based sessions, a
readable CSRF cookie echoed in `X-CSRFToken`, `{"detail": ...}` errors, and email
verification as a gate for marketplace actions.
"""

from unittest.mock import patch

from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import EmailVerificationToken, User
from apps.accounts.policy import verification_required, verification_satisfied
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

    @override_settings(EMAIL_VERIFICATION_REQUIRED=True)
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

    @override_settings(
        EMAIL_VERIFICATION_REQUIRED=True,
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        FRONTEND_BASE_URL="http://localhost:5195",
    )
    def test_registration_sends_a_working_verification_link(self):
        response = self.client.post(
            REGISTER,
            {
                "email": "emailed@example.com",
                "password": "a-long-enough-passphrase",
                "full_name": "Emailed User",
                "accept_terms": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, ["emailed@example.com"])
        self.assertIn(
            "http://localhost:5195/auth/verify-email?token=",
            message.body,
        )

    @override_settings(EMAIL_VERIFICATION_REQUIRED=True)
    @patch("apps.accounts.views.send_verification_email", side_effect=RuntimeError)
    def test_registration_reports_a_delivery_failure(self, _send):
        response = self.client.post(
            REGISTER,
            {
                "email": "undelivered@example.com",
                "password": "a-long-enough-passphrase",
                "full_name": "Undelivered User",
                "accept_terms": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertFalse(response.data["verification_email_sent"])

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        FRONTEND_BASE_URL="http://localhost:5195",
    )
    def test_password_reset_email_uses_the_frontend_route(self):
        make_customer("reset@example.com")
        response = self.client.post(
            "/api/v1/auth/password/reset/",
            {"email": "reset@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, 202, response.content)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(
            "http://localhost:5195/auth/reset-password?token=",
            mail.outbox[0].body,
        )

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
        rows = response.data["results"] if isinstance(response.data, dict) else response.data
        codes = {row["code"] for row in rows}
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

class VerificationPolicyTests(TestCase):
    """`EMAIL_VERIFICATION_REQUIRED` is a policy switch, not a data change."""

    def test_the_requirement_is_a_boolean_setting(self):
        self.assertIsInstance(verification_required(), bool)

    @override_settings(EMAIL_VERIFICATION_REQUIRED=True)
    def test_the_requirement_can_be_switched_on(self):
        self.assertTrue(verification_required())

    @override_settings(EMAIL_VERIFICATION_REQUIRED=True)
    def test_an_unverified_account_is_barred_while_required(self):
        user = make_customer("gate@example.com", verified=False)
        self.assertFalse(verification_satisfied(user))

    def test_a_verified_account_passes_while_required(self):
        self.assertTrue(verification_satisfied(make_customer("ok@example.com")))

    @override_settings(EMAIL_VERIFICATION_REQUIRED=False)
    def test_switching_the_requirement_off_admits_unverified_accounts(self):
        user = make_customer("gate-off@example.com", verified=False)
        self.assertFalse(verification_required())
        self.assertTrue(verification_satisfied(user))
        # The recorded state is untouched: nobody is marked verified.
        user.refresh_from_db()
        self.assertIsNone(user.email_verified_at)
        self.assertFalse(user.email_verified)

    @override_settings(EMAIL_VERIFICATION_REQUIRED=True)
    def test_anonymous_is_never_satisfied(self):
        from django.contrib.auth.models import AnonymousUser

        self.assertFalse(verification_satisfied(AnonymousUser()))


@override_settings(
    EMAIL_VERIFICATION_REQUIRED=False,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class VerificationDisabledRegistrationTests(TestCase):
    """The launch configuration: register and sign in with no mail at all."""

    def setUp(self):
        self.client = APIClient()
        self.payload = {
            "email": "launch@example.com",
            "password": "a-long-enough-passphrase",
            "full_name": "Launch User",
            "accept_terms": True,
        }

    def test_registration_needs_no_email_and_issues_no_token(self):
        response = self.client.post(REGISTER, self.payload, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        self.assertFalse(response.data["email_verification_required"])
        self.assertFalse(response.data["email_verified"])
        self.assertFalse(response.data["verification_email_sent"])
        self.assertEqual(len(mail.outbox), 0)
        user = User.objects.get(email="launch@example.com")
        self.assertEqual(EmailVerificationToken.objects.filter(user=user).count(), 0)
        self.assertIsNone(user.email_verified_at)

    def test_registration_signs_the_account_in_immediately(self):
        self.assertEqual(self.client.post(REGISTER, self.payload, format="json").status_code, 201)
        me = self.client.get(ME)
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["email"], "launch@example.com")
        self.assertFalse(me.data["email_verified"])

    def test_a_provider_can_register_without_verifying(self):
        payload = dict(self.payload, email="provider-launch@example.com", role="PROVIDER")
        response = self.client.post(REGISTER, payload, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["role"], "PROVIDER")

    def test_an_existing_unverified_account_can_sign_in(self):
        make_customer("never-verified@example.com", verified=False)
        response = APIClient().post(
            LOGIN,
            {"email": "never-verified@example.com", "password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(response.data["email_verified"])

    def test_resend_reports_nothing_was_sent(self):
        user = make_customer("resend-off@example.com", verified=False)
        client = APIClient()
        client.force_authenticate(user)
        response = client.post("/api/v1/auth/email/resend/")
        self.assertEqual(response.status_code, 202, response.content)
        self.assertFalse(response.data["email_sent"])
        self.assertEqual(len(mail.outbox), 0)

    def test_the_verification_link_still_works_when_presented(self):
        # The endpoint, token table and templates are untouched by the switch.
        user = make_customer("still-works@example.com", verified=False)
        raw_token, _ = EmailVerificationToken.issue(user, ttl_hours=24)
        response = APIClient().post(VERIFY, {"token": raw_token}, format="json")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.data["email_verified"])

    def test_login_and_register_rate_throttles_are_configured(self):
        from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
        from apps.accounts.views import LoginView, RegisterView, PasswordResetRequestView

        self.assertIn(AnonRateThrottle, LoginView.throttle_classes)
        self.assertIn(UserRateThrottle, LoginView.throttle_classes)
        self.assertIn(AnonRateThrottle, RegisterView.throttle_classes)
        self.assertIn(UserRateThrottle, RegisterView.throttle_classes)
        self.assertIn(AnonRateThrottle, PasswordResetRequestView.throttle_classes)
        self.assertIn(UserRateThrottle, PasswordResetRequestView.throttle_classes)


class AvatarTests(TestCase):
    def setUp(self):
        self.user = make_customer("avatar-user@example.com")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_upload_and_serve_avatar(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        import os

        # 1x1 transparent PNG payload
        png_data = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05"
            b"\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        file = SimpleUploadedFile("profile.png", png_data, content_type="image/png")
        response = self.client.post("/api/v1/auth/avatar/", {"avatar": file}, format="multipart")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIsNotNone(response.data["avatar_url"])
        self.assertTrue(response.data["avatar_url"].startswith("/api/v1/auth/avatars/"))

        # Verify avatar file can be retrieved via the public avatar route
        avatar_path = response.data["avatar_url"]
        filename = os.path.basename(avatar_path)
        serve_resp = APIClient().get(f"/api/v1/auth/avatars/{filename}")
        self.assertEqual(serve_resp.status_code, 200)
        self.assertEqual(serve_resp["Content-Type"], "image/png")
        self.assertIn("max-age=86400", serve_resp["Cache-Control"])
        serve_resp.close()

        # Also verify legacy /private-media/avatars/ route serves it
        legacy_resp = APIClient().get(f"/private-media/avatars/{filename}")
        self.assertEqual(legacy_resp.status_code, 200)
        legacy_resp.close()

        # Remove avatar
        remove_resp = self.client.post("/api/v1/auth/avatar/", {"action": "remove"}, format="json")
        self.assertEqual(remove_resp.status_code, 200)
        self.assertIsNone(remove_resp.data["avatar_url"])
        self.user.refresh_from_db()
        self.assertFalse(bool(self.user.avatar))

    def test_upload_avatar_validation(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        # Invalid extension
        txt_file = SimpleUploadedFile("bad.txt", b"not-an-image", content_type="text/plain")
        resp = self.client.post("/api/v1/auth/avatar/", {"avatar": txt_file}, format="multipart")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Only JPG, PNG, and WebP", resp.data["detail"])

        # Nonexistent avatar returns 404
        serve_404 = APIClient().get("/api/v1/auth/avatars/nonexistent_avatar.png")
        self.assertEqual(serve_404.status_code, 404)


