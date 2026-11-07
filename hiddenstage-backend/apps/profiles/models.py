"""Customer, provider, business and service-coverage models.

D-010: business identity is separate from individual accounts, and permission
scopes belong to representatives. D-012: coverage is explicit normalized location
data; broad or inferred coverage is never derived from a PIN code prefix.
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from apps.core.models import UUIDModel, money_field, non_negative_check
from apps.core.validators import (
    normalize_pin_code,
    normalize_text,
    validate_pin_code,
)


class ServiceCategory(UUIDModel):
    """Top-level service taxonomy, aligned with the frontend category slugs."""

    code = models.SlugField(max_length=60, unique=True)
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "service categories"

    def __str__(self):
        return self.name


class Business(UUIDModel):
    """Business identity, independent of any individual account (D-010)."""

    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    city = models.CharField(max_length=80, blank=True)
    state = models.CharField(max_length=80, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "businesses"

    def __str__(self):
        return self.name


class RepresentativeScope(models.TextChoices):
    PROFILE_MANAGE = "profile.manage", "Manage business profile"
    SERVICES_MANAGE = "services.manage", "Manage services and coverage"
    QUOTATIONS_MANAGE = "quotations.manage", "Manage quotations"
    INVITATIONS_RESPOND = "invitations.respond", "Respond to invitations"
    COMMITMENTS_MANAGE = "commitments.manage", "Manage commitments"


class RepresentativeRole(models.TextChoices):
    PRIMARY = "PRIMARY", "Primary representative"
    ADDITIONAL = "ADDITIONAL", "Additional representative"


class BusinessRepresentative(UUIDModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="representatives")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="business_roles"
    )
    role = models.CharField(
        max_length=20, choices=RepresentativeRole.choices, default=RepresentativeRole.ADDITIONAL
    )
    scopes = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["business", "user"], name="uniq_business_representative"
            ),
            models.CheckConstraint(
                condition=models.Q(role__in=["PRIMARY", "ADDITIONAL"]),
                name="representative_role_valid",
            ),
            # Exactly one active primary representative per business.
            models.UniqueConstraint(
                fields=["business"],
                condition=models.Q(role="PRIMARY", is_active=True),
                name="uniq_active_primary_representative",
            ),
        ]

    def clean(self):
        valid = {choice.value for choice in RepresentativeScope}
        unknown = set(self.scopes or []) - valid
        if unknown:
            raise ValidationError({"scopes": f"Unknown scope(s): {', '.join(sorted(unknown))}"})


class VerificationStatus(models.TextChoices):
    UNVERIFIED = "UNVERIFIED", "Unverified"
    PENDING = "PENDING", "Pending review"
    VERIFIED = "VERIFIED", "Verified"
    REJECTED = "REJECTED", "Rejected"


def _normalize_location(instance):
    instance.pin_code = normalize_pin_code(instance.pin_code)
    instance.locality = normalize_text(instance.locality)
    instance.city = normalize_text(instance.city)
    instance.state = normalize_text(instance.state)


class CustomerProfile(UUIDModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="customer_profile"
    )
    pin_code = models.CharField(max_length=6, validators=[validate_pin_code])
    locality = models.CharField(max_length=120)
    city = models.CharField(max_length=80)
    state = models.CharField(max_length=80)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "customer profile"

    def save(self, *args, **kwargs):
        _normalize_location(self)
        if self.is_complete() and self.completed_at is None:
            self.completed_at = timezone.now()
        super().save(*args, **kwargs)

    def is_complete(self) -> bool:
        return all([self.pin_code, self.locality, self.city, self.state])

    def __str__(self):
        return f"Customer profile for {self.user_id}"


class ProviderProfile(UUIDModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="provider_profile"
    )
    business = models.ForeignKey(
        Business,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="provider_profiles",
    )
    display_name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    contact = models.CharField(max_length=120)
    verification_status = models.CharField(
        max_length=20, choices=VerificationStatus.choices, default=VerificationStatus.UNVERIFIED
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    verification_status__in=["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"]
                ),
                name="provider_verification_status_valid",
            )
        ]

    def __str__(self):
        return self.display_name

    def declared_categories(self):
        return list(
            self.services.filter(is_active=True)
            .order_by("category__sort_order")
            .values_list("category__code", flat=True)
        )

    def is_complete(self) -> bool:
        return bool(
            self.display_name
            and self.contact
            and self.services.filter(is_active=True).exists()
            and self.coverage.exists()
        )

    def refresh_completion(self):
        if self.is_complete() and self.completed_at is None:
            self.completed_at = timezone.now()
            self.save(update_fields=["completed_at"])


class ProviderService(UUIDModel):
    """A provider's declared, priced offering within one service category."""

    provider = models.ForeignKey(
        ProviderProfile, on_delete=models.CASCADE, related_name="services"
    )
    category = models.ForeignKey(
        ServiceCategory, on_delete=models.PROTECT, related_name="provider_services"
    )
    title = models.CharField(max_length=150, blank=True)
    description = models.TextField(blank=True)
    base_price_paise = money_field(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category__sort_order"]
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "category"], name="uniq_provider_service_category"
            ),
            non_negative_check("base_price_paise", "provider_service_price_non_negative"),
        ]

    def __str__(self):
        return f"{self.category.code} for {self.provider_id}"


class ProviderCoverage(UUIDModel):
    """One explicitly supplied serviceable location."""

    provider = models.ForeignKey(
        ProviderProfile, on_delete=models.CASCADE, related_name="coverage"
    )
    pin_code = models.CharField(max_length=6, validators=[validate_pin_code])
    locality = models.CharField(max_length=120)
    city = models.CharField(max_length=80)
    state = models.CharField(max_length=80)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "provider coverage"
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "pin_code", "locality", "city", "state"],
                name="uniq_provider_coverage_location",
            )
        ]
        indexes = [
            models.Index(fields=["pin_code", "city"], name="coverage_pin_city_idx"),
            models.Index(fields=["city", "state"], name="coverage_city_state_idx"),
        ]

    def save(self, *args, **kwargs):
        _normalize_location(self)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.locality}, {self.city} {self.pin_code}"
