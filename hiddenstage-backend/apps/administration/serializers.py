"""Serializers for the /api/v1/admin/ endpoints."""

from rest_framework import serializers

from apps.accounts.models import User
from apps.commitments.models import Commitment
from apps.events.models import Event
from apps.profiles.models import (
    Business,
    BusinessRepresentative,
    ProviderProfile,
    ServiceCategory,
    VerificationStatus,
)
from apps.profiles.serializers import ProviderCoverageSerializer, ProviderServiceSerializer


class AdminUserSerializer(serializers.ModelSerializer):
    email_verified = serializers.BooleanField(read_only=True)
    profile_completed = serializers.BooleanField(read_only=True)
    provider_kind = serializers.SerializerMethodField()
    verification_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "phone",
            "role",
            "is_active",
            "is_staff",
            "is_superuser",
            "email_verified",
            "email_verified_at",
            "profile_completed",
            "provider_kind",
            "verification_status",
            "date_joined",
            "last_login",
        ]
        read_only_fields = fields

    def get_provider_kind(self, obj) -> str | None:
        profile = getattr(obj, "provider_profile", None)
        return profile.kind if profile else None

    def get_verification_status(self, obj) -> str | None:
        profile = getattr(obj, "provider_profile", None)
        return profile.verification_status if profile else None


class AdminUserUpdateSerializer(serializers.Serializer):
    is_active = serializers.BooleanField(required=False)
    is_staff = serializers.BooleanField(required=False)
    mark_email_verified = serializers.BooleanField(required=False, default=False)
    note = serializers.CharField(required=False, allow_blank=True, max_length=1000, default="")


class AdminProviderSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.full_name", read_only=True)
    user_is_active = serializers.BooleanField(source="user.is_active", read_only=True)
    business_name = serializers.CharField(source="business.name", read_only=True, default="")
    services = ProviderServiceSerializer(many=True, read_only=True)
    coverage = ProviderCoverageSerializer(many=True, read_only=True)

    class Meta:
        model = ProviderProfile
        fields = [
            "id",
            "user_id",
            "user_email",
            "user_full_name",
            "user_is_active",
            "display_name",
            "kind",
            "contact",
            "description",
            "business_name",
            "verification_status",
            "completed_at",
            "services",
            "coverage",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ProviderVerificationActionSerializer(serializers.Serializer):
    verification_status = serializers.ChoiceField(choices=VerificationStatus.choices)
    note = serializers.CharField(required=False, allow_blank=True, max_length=1000, default="")


class AdminBusinessRepSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = BusinessRepresentative
        fields = ["id", "user_id", "user_email", "user_full_name", "role", "scopes", "is_active"]
        read_only_fields = fields


class AdminBusinessSerializer(serializers.ModelSerializer):
    representatives = AdminBusinessRepSerializer(many=True, read_only=True)

    class Meta:
        model = Business
        fields = ["id", "name", "description", "city", "state", "is_active", "created_at", "representatives"]
        read_only_fields = fields


class AdminBusinessUpdateSerializer(serializers.Serializer):
    is_active = serializers.BooleanField(required=False)
    name = serializers.CharField(required=False, max_length=150)
    city = serializers.CharField(required=False, allow_blank=True, max_length=80)
    state = serializers.CharField(required=False, allow_blank=True, max_length=80)
    note = serializers.CharField(required=False, allow_blank=True, max_length=1000, default="")


class AdminEventSerializer(serializers.ModelSerializer):
    customer_email = serializers.EmailField(source="customer.email", read_only=True)
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)
    requirement_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Event
        fields = [
            "id",
            "name",
            "event_type",
            "event_date",
            "city",
            "state",
            "pin_code",
            "guest_count",
            "status",
            "customer_email",
            "customer_name",
            "requirement_count",
            "submitted_at",
            "withdrawn_at",
            "created_at",
        ]
        read_only_fields = fields


class AdminReasonSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=1000, default="")


class AdminCommitmentSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(source="event.name", read_only=True)
    event_date = serializers.DateField(source="event.event_date", read_only=True)
    customer_email = serializers.EmailField(source="customer.email", read_only=True)
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)
    provider_email = serializers.EmailField(source="provider.email", read_only=True)
    provider_name = serializers.CharField(source="provider.full_name", read_only=True)
    line_count = serializers.IntegerField(source="lines.count", read_only=True)

    class Meta:
        model = Commitment
        fields = [
            "id",
            "event_id",
            "event_name",
            "event_date",
            "customer_email",
            "customer_name",
            "provider_email",
            "provider_name",
            "status",
            "total_paise",
            "line_count",
            "accepted_at",
            "released_at",
            "release_reason",
        ]
        read_only_fields = fields


class AdminCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = ["id", "code", "name", "description", "sort_order", "is_active"]
        read_only_fields = ["id"]


class AdminCategoryUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, max_length=80)
    description = serializers.CharField(required=False, allow_blank=True)
    sort_order = serializers.IntegerField(required=False, min_value=0)
    is_active = serializers.BooleanField(required=False)


class UnifiedAuditEntrySerializer(serializers.Serializer):
    id = serializers.CharField()
    source = serializers.CharField()
    action = serializers.CharField()
    actor_email = serializers.CharField(allow_blank=True)
    actor_name = serializers.CharField()
    target_type = serializers.CharField()
    target_id = serializers.CharField()
    target_label = serializers.CharField(allow_blank=True)
    note = serializers.CharField(allow_blank=True)
    metadata = serializers.DictField()
    created_at = serializers.DateTimeField()

