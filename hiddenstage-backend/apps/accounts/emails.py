"""Transactional email composition.

No email provider is approved yet, so delivery uses Django's configured backend
(console in development). Templates are intentionally plain text and contain no
HTML that could carry injected markup.
"""

import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _frontend_link(path: str, token: str) -> str:
    base = settings.FRONTEND_BASE_URL.rstrip("/")
    return f"{base}{path}?token={token}"


def send_verification_email(user, raw_token: str) -> None:
    link = _frontend_link("/verify-email", raw_token)
    send_mail(
        subject="Verify your HiddenStage email address",
        message=(
            f"Hello {user.full_name},\n\n"
            "Confirm your email address to continue setting up your HiddenStage account:\n"
            f"{link}\n\n"
            f"This link expires in {settings.EMAIL_VERIFICATION_TTL_HOURS} hours and can "
            "be used once. If you did not create this account, ignore this email.\n"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_password_reset_email(user, raw_token: str) -> None:
    link = _frontend_link("/reset-password", raw_token)
    send_mail(
        subject="Reset your HiddenStage password",
        message=(
            f"Hello {user.full_name},\n\n"
            "Use the link below to choose a new password:\n"
            f"{link}\n\n"
            f"This link expires in {settings.PASSWORD_RESET_TTL_HOURS} hour(s) and can be "
            "used once. If you did not request this, you can ignore this email.\n"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
