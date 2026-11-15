"""Email-verification policy.

`EMAIL_VERIFICATION_REQUIRED` (settings, from the environment) decides whether an
account must have followed the emailed link before it may take a verification-
gated action. It never touches persisted state: `User.email_verified_at` keeps
recording exactly what was proven, so turning the requirement off marks nobody
verified, and turning it back on restores the old behaviour for every account
that already proved its address.

Read through these helpers rather than the setting or the column directly, so
the policy has a single definition.
"""

from django.conf import settings


def verification_required() -> bool:
    """Whether an unverified account is currently barred from gated actions."""
    return bool(getattr(settings, "EMAIL_VERIFICATION_REQUIRED", True))


def verification_satisfied(user) -> bool:
    """True when `user` may perform a verification-gated action."""
    if user is None or not getattr(user, "is_authenticated", False):
        return False
    if not verification_required():
        return True
    return bool(getattr(user, "email_verified", False))
