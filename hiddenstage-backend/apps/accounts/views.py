"""Authentication endpoints.

Session authentication (D-005): login establishes a server-side session in an
HttpOnly cookie; the CSRF token is exposed separately so the SPA can echo it in
X-CSRFToken. No access or refresh token is ever returned to the browser.
"""

import logging
import os

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.core.files.storage import default_storage
from django.db import transaction
from django.http import FileResponse, Http404, HttpResponseRedirect
from django.middleware.csrf import get_token
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from django.core.exceptions import ValidationError as DjangoValidationError
from apps.accounts.emails import send_password_reset_email, send_verification_email
from apps.accounts.models import EmailVerificationToken, Notification, PasswordResetToken, User
from apps.accounts.policy import verification_required
from apps.accounts.serializers import (
    AccountSettingsSerializer,
    ChangePasswordSerializer,
    EmailOnlySerializer,
    LoginSerializer,
    NotificationSerializer,
    PasswordResetConfirmSerializer,
    RegisterSerializer,
    TokenSerializer,
    UserSerializer,
)
from apps.accounts.tokens import InvalidOrExpiredToken
from apps.core.validators import (
    normalize_username,
    validate_profile_image_upload,
    validate_username,
)

logger = logging.getLogger(__name__)


class CsrfTokenView(APIView):
    """Bootstrap endpoint; also sets the session cookie precedence chain."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(responses={200: None}, auth=[], description="Return and set a CSRF token.")
    def get(self, request):
        token = get_token(request)
        return Response({"csrfToken": token})


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle, UserRateThrottle]
    throttle_scope = "auth"

    @extend_schema(request=RegisterSerializer, responses={201: UserSerializer})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # When verification is switched off no token is issued and no mail is
        # attempted, so registration has no runtime dependency on a transactional
        # email provider. The token table, templates and the verify/resend
        # endpoints all stay for when it is switched back on.
        email_sent = False
        if verification_required():
            raw_token, _ = EmailVerificationToken.issue(
                user, settings.EMAIL_VERIFICATION_TTL_HOURS
            )
            try:
                send_verification_email(user, raw_token)
                email_sent = True
            except Exception:  # delivery failure must not break signup
                logger.exception("Verification email delivery failed for user %s", user.pk)

        login(request, user, backend="apps.accounts.backends.EmailBackend")
        payload = UserSerializer(user).data
        payload["verification_email_sent"] = email_sent
        return Response(payload, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle, UserRateThrottle]
    throttle_scope = "auth"

    @extend_schema(request=LoginSerializer, responses={200: UserSerializer})
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            raise AuthenticationFailed("Email or password is incorrect.")
        login(request, user)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: OpenApiResponse(description="Signed out.")})
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={200: UserSerializer, 401: None})
    def get(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        user = (
            User.objects.select_related("customer_profile", "provider_profile")
            .filter(pk=request.user.pk)
            .first()
            or request.user
        )
        return Response(UserSerializer(user).data)


class EmailVerifyView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "auth"

    @extend_schema(request=TokenSerializer, responses={200: UserSerializer})
    def post(self, request):
        serializer = TokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            record = EmailVerificationToken.consume(serializer.validated_data["token"])
            user = record.user
            user.email_verified_at = user.email_verified_at or timezone.now()
            user.save(update_fields=["email_verified_at"])
        return Response(UserSerializer(user).data)


class EmailResendView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "auth"

    @extend_schema(request=None, responses={202: None})
    def post(self, request):
        user = request.user
        if not verification_required():
            # Nothing to resend. Saying so reveals deployment configuration, not
            # any account's verification state.
            return Response(
                {
                    "detail": "Email verification is not required for this deployment.",
                    "email_sent": False,
                },
                status=status.HTTP_202_ACCEPTED,
            )
        email_sent = False
        if not user.email_verified:
            raw_token, _ = EmailVerificationToken.issue(
                user, settings.EMAIL_VERIFICATION_TTL_HOURS
            )
            try:
                send_verification_email(user, raw_token)
                email_sent = True
            except Exception:
                logger.exception("Verification email delivery failed for user %s", user.pk)
        # Always the same response: resending never reveals verification state.
        return Response(
            {
                "detail": "If verification is still required, a new email has been sent.",
                "email_sent": email_sent,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle, UserRateThrottle]
    throttle_scope = "auth"

    @extend_schema(request=EmailOnlySerializer, responses={202: None})
    def post(self, request):
        serializer = EmailOnlySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(
            email=serializer.validated_data["email"], is_active=True
        ).first()
        if user is not None:
            raw_token, _ = PasswordResetToken.issue(user, settings.PASSWORD_RESET_TTL_HOURS)
            try:
                send_password_reset_email(user, raw_token)
            except Exception:  # pragma: no cover
                logger.exception("Password reset email delivery failed for user %s", user.pk)
        # Identical response for known and unknown addresses.
        return Response(
            {"detail": "If an account exists for that email, a reset link has been sent."},
            status=status.HTTP_202_ACCEPTED,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "auth"

    @extend_schema(request=PasswordResetConfirmSerializer, responses={200: None})
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            try:
                record = PasswordResetToken.consume(serializer.validated_data["token"])
            except InvalidOrExpiredToken:
                raise
            user = record.user
            if not user.is_active:
                raise InvalidOrExpiredToken()
            user.set_password(serializer.validated_data["new_password"])
            user.save(update_fields=["password"])
        return Response({"detail": "Your password has been updated. Sign in again."})


class CheckUsernameView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        username = request.query_params.get("username", "").strip()
        if not username:
            return Response(
                {"available": False, "username": "", "message": "Username is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        norm = normalize_username(username)
        try:
            validate_username(norm)
        except DjangoValidationError as exc:
            return Response(
                {"available": False, "username": norm, "message": exc.messages[0]},
                status=status.HTTP_200_OK,
            )

        qs = User.objects.filter(username__iexact=norm)
        if request.user.is_authenticated:
            qs = qs.exclude(pk=request.user.pk)

        if qs.exists():
            return Response(
                {"available": False, "username": norm, "message": "Username is already taken."},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"available": True, "username": norm, "message": "Username is available."},
            status=status.HTTP_200_OK,
        )


class AccountSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = AccountSettingsSerializer(
            data=request.data, context={"request": request}, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.update(request.user, serializer.validated_data)
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        login(request, request.user)
        return Response({"detail": "Password updated successfully."})


class AvatarUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        action = request.data.get("action")
        if action == "remove":
            if user.avatar:
                try:
                    user.avatar.delete(save=False)
                except OSError:
                    pass
                user.avatar = None
                user.save(update_fields=["avatar"])
            return Response(UserSerializer(user).data)

        file_obj = request.FILES.get("avatar")
        if not file_obj:
            return Response(
                {"detail": "No image file provided."}, status=status.HTTP_400_BAD_REQUEST
            )

        validation_error = validate_profile_image_upload(file_obj)
        if validation_error:
            return Response(
                {"detail": validation_error},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.avatar:
            try:
                user.avatar.delete(save=False)
            except OSError:
                pass
        user.avatar = file_obj
        user.save(update_fields=["avatar"])
        return Response(UserSerializer(user).data)


class AvatarMediaView(APIView):
    """Serve uploaded user avatars publicly and securely."""

    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request, filename):
        safe_name = os.path.basename(filename)
        if not safe_name or ".." in filename:
            raise Http404("Invalid avatar filename.")

        path = f"avatars/{safe_name}"
        try:
            url = default_storage.url(path)
            if url and (url.startswith("http://") or url.startswith("https://")):
                return HttpResponseRedirect(url)
        except Exception:
            pass

        if not default_storage.exists(path):
            raise Http404("Avatar not found.")

        file_handle = default_storage.open(path, "rb")
        response = FileResponse(file_handle)
        response["Cache-Control"] = "public, max-age=86400"
        return response


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(user=request.user)
        unread_count = notifications.filter(is_read=False).count()
        serializer = NotificationSerializer(notifications[:50], many=True)
        return Response(
            {
                "unread_count": unread_count,
                "results": serializer.data,
            }
        )


class MarkNotificationsReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        notification_ids = request.data.get("ids", [])
        mark_all = request.data.get("mark_all", False)
        qs = Notification.objects.filter(user=request.user, is_read=False)
        if not mark_all and notification_ids:
            qs = qs.filter(id__in=notification_ids)
        updated_count = qs.update(is_read=True)
        return Response({"marked_read": updated_count})
