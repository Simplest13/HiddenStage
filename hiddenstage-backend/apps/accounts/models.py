"""Accounts and authentication records.

D-005: email is the unique login identifier, sessions are server-side and CSRF
protected. D-010: only CUSTOMER and PROVIDER account roles exist; business identity
is modelled separately from the individual account, and no SUPPLIER role exists.
D-011: email verification uses expiring single-use tokens, stored hashed.
"""

import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.core.models import UUIDModel
from apps.core.validators import normalize_phone, normalize_text


class UserRole(models.TextChoices):
    CUSTOMER = "CUSTOMER", "Customer"
    PROVIDER = "PROVIDER", "Provider"


def normalize_email_address(email: str) -> str:
    return (email or "").strip().lower()


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        email = normalize_email_address(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("role", UserRole.CUSTOMER)
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("role", UserRole.CUSTOMER)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if not extra_fields["is_staff"] or not extra_fields["is_superuser"]:
            raise ValueError("Superuser must have is_staff and is_superuser set.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, UUIDModel):
    email = models.EmailField(max_length=254, unique=True)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.CUSTOMER)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        ordering = ["-date_joined"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(role__in=["CUSTOMER", "PROVIDER"]),
                name="user_role_valid",
            )
        ]

    def save(self, *args, **kwargs):
        self.email = normalize_email_address(self.email)
        self.full_name = normalize_text(self.full_name)
        if self.phone:
            self.phone = normalize_phone(self.phone)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email

    @property
    def email_verified(self) -> bool:
        return self.email_verified_at is not None

    @property
    def is_customer(self) -> bool:
        return self.role == UserRole.CUSTOMER

    @property
    def is_provider(self) -> bool:
        return self.role == UserRole.PROVIDER

    @property
    def profile_completed(self) -> bool:
        """A completed role profile is required before marketplace actions."""
        if self.is_customer:
            profile = getattr(self, "customer_profile", None)
        else:
            profile = getattr(self, "provider_profile", None)
        return bool(profile and profile.completed_at)

    def mark_email_verified(self):
        if self.email_verified_at is None:
            self.email_verified_at = timezone.now()
            self.save(update_fields=["email_verified_at"])


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


class SingleUseToken(UUIDModel):
    """Base for expiring, single-use, hashed tokens (D-011).

    The raw token is only ever held in memory long enough to be emailed. A database
    leak therefore does not expose usable verification or reset links.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_tokens",
    )
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True
        indexes = [models.Index(fields=["user", "expires_at"])]

    @classmethod
    def issue(cls, user, ttl_hours: int):
        raw_token = secrets.token_urlsafe(32)
        record = cls.objects.create(
            user=user,
            token_hash=hash_token(raw_token),
            expires_at=timezone.now() + timedelta(hours=ttl_hours),
        )
        return raw_token, record

    @classmethod
    def consume(cls, raw_token: str, *, now=None):
        """Mark a valid token used and return it. Call inside a transaction."""
        from apps.accounts.tokens import InvalidOrExpiredToken

        now = now or timezone.now()
        if not raw_token:
            raise InvalidOrExpiredToken()
        try:
            record = cls.objects.select_for_update().get(token_hash=hash_token(raw_token))
        except cls.DoesNotExist as exc:
            raise InvalidOrExpiredToken() from exc
        if record.used_at is not None or record.expires_at <= now:
            raise InvalidOrExpiredToken()
        record.used_at = now
        record.save(update_fields=["used_at"])
        return record


class EmailVerificationToken(SingleUseToken):
    class Meta(SingleUseToken.Meta):
        abstract = False
        verbose_name = "email verification token"


class PasswordResetToken(SingleUseToken):
    class Meta(SingleUseToken.Meta):
        abstract = False
        verbose_name = "password reset token"
