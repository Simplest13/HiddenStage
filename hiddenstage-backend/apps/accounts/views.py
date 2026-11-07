"""Authentication endpoints.

Session authentication (D-005): login establishes a server-side session in an
HttpOnly cookie; the CSRF token is exposed separately so the SPA can echo it in
X-CSRFToken. No access or refresh token is ever returned to the browser.
"""

import logging

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.db import transaction
from django.middleware.csrf import get_token
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.emails import send_password_reset_email, send_verification_email
from apps.accounts.models import EmailVerificationToken, PasswordResetToken, User
from apps.accounts.serializers import (
    EmailOnlySerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    RegisterSerializer,
    TokenSerializer,
    UserSerializer,
)
from apps.accounts.tokens import InvalidOrExpiredToken

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
    throttle_scope = "auth"

    @extend_schema(request=RegisterSerializer, responses={201: UserSerializer})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        raw_token, _ = EmailVerificationToken.issue(
            user, settings.EMAIL_VERIFICATION_TTL_HOURS
        )
        try:
            send_verification_email(user, raw_token)
        except Exception:  # pragma: no cover - delivery failure must not break signup
            logger.exception("Verification email delivery failed for user %s", user.pk)

        login(request, user, backend="apps.accounts.backends.EmailBackend")
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
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
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: UserSerializer})
    def get(self, request):
        return Response(UserSerializer(request.user).data)


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
        if not user.email_verified:
            raw_token, _ = EmailVerificationToken.issue(
                user, settings.EMAIL_VERIFICATION_TTL_HOURS
            )
            try:
                send_verification_email(user, raw_token)
            except Exception:  # pragma: no cover
                logger.exception("Verification email delivery failed for user %s", user.pk)
        # Always the same response: resending never reveals verification state.
        return Response(
            {"detail": "If verification is still required, a new email has been sent."},
            status=status.HTTP_202_ACCEPTED,
        )


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
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
