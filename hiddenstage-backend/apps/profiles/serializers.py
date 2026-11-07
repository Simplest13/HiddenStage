from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from apps.core.validators import normalize_pin_code, normalize_text, validate_pin_code
from apps.profiles.models import (
    CustomerProfile,
    ProviderCoverage,
    ProviderProfile,
    ProviderService,
    ServiceCategory,
    VerificationStatus,
)


class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = ["id", "code", "name", "description", "sort_order"]
        read_only_fields = fields


class CustomerProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)

    class Meta:
        model = CustomerProfile
        fields = [
            "id",
            "full_name",
            "email",
            "phone",
            "pin_code",
            "locality",
            "city",
            "state",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "completed_at", "created_at", "updated_at"]

    def validate_pin_code(self, value):
        try:
            validate_pin_code(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return normalize_pin_code(value)

    def validate_locality(self, value):
        return normalize_text(value)

    def validate_city(self, value):
        return normalize_text(value)

    def validate_state(self, value):
        return normalize_text(value)


class ProviderCoverageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProviderCoverage
        fields = ["id", "pin_code", "locality", "city", "state"]
        read_only_fields = ["id"]

    def validate_pin_code(self, value):
        try:
            validate_pin_code(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return normalize_pin_code(value)

    def validate_locality(self, value):
        return normalize_text(value)

    def validate_city(self, value):
        return normalize_text(value)

    def validate_state(self, value):
        return normalize_text(value)


class ProviderServiceSerializer(serializers.ModelSerializer):
    category = serializers.SlugRelatedField(
        slug_field="code", queryset=ServiceCategory.objects.filter(is_active=True)
    )
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = ProviderService
        fields = [
            "id",
            "category",
            "category_name",
            "title",
            "description",
            "base_price_paise",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ProviderProfileSerializer(serializers.ModelSerializer):
    categories = serializers.ListField(
        child=serializers.SlugField(), write_only=True, required=False, allow_empty=True
    )
    coverage = ProviderCoverageSerializer(many=True, required=False)
    services = ProviderServiceSerializer(many=True, read_only=True)
    verification_status = serializers.CharField(read_only=True)

    class Meta:
        model = ProviderProfile
        fields = [
            "id",
            "display_name",
            "description",
            "contact",
            "categories",
            "coverage",
            "services",
            "verification_status",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "completed_at", "created_at", "updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["categories"] = instance.declared_categories()
        return data

    def validate_categories(self, value):
        codes = [normalize_text(code).lower() for code in value]
        if len(codes) != len(set(codes)):
            raise serializers.ValidationError("Duplicate service categories are not allowed.")
        known = set(
            ServiceCategory.objects.filter(code__in=codes, is_active=True).values_list(
                "code", flat=True
            )
        )
        unknown = sorted(set(codes) - known)
        if unknown:
            raise serializers.ValidationError(
                f"Unknown service categories: {', '.join(unknown)}."
            )
        return codes

    def validate(self, attrs):
        instance = self.instance
        categories = attrs.get("categories")
        if instance is not None:
            desired = (
                set(categories)
                if categories is not None
                else set(instance.declared_categories())
            )
            if not desired and "categories" in attrs:
                raise serializers.ValidationError(
                    {"categories": "Select at least one service category."}
                )
        return attrs

    def _sync_categories(self, profile, codes):
        categories = {c.code: c for c in ServiceCategory.objects.filter(code__in=codes)}
        existing = {s.category.code: s for s in profile.services.select_related("category")}
        with transaction.atomic():
            for code in codes:
                if code in existing:
                    service = existing[code]
                    if not service.is_active:
                        service.is_active = True
                        service.save(update_fields=["is_active"])
                else:
                    ProviderService.objects.create(
                        provider=profile, category=categories[code]
                    )
            for code, service in existing.items():
                if code not in codes and service.is_active:
                    service.is_active = False
                    service.save(update_fields=["is_active"])

    def _sync_coverage(self, profile, coverage_rows):
        seen = set()
        for row in coverage_rows:
            key = (row["pin_code"], row["locality"], row["city"], row["state"])
            if key in seen:
                raise serializers.ValidationError(
                    {"coverage": "Duplicate coverage locations are not allowed."}
                )
            seen.add(key)
        profile.coverage.all().delete()
        ProviderCoverage.objects.bulk_create(
            [ProviderCoverage(provider=profile, **row) for row in coverage_rows]
        )

    def create(self, validated_data):
        codes = validated_data.pop("categories", [])
        coverage_rows = validated_data.pop("coverage", [])
        profile = ProviderProfile.objects.create(**validated_data)
        if codes:
            self._sync_categories(profile, codes)
        if coverage_rows:
            self._sync_coverage(profile, coverage_rows)
        profile.refresh_completion()
        return profile

    def update(self, instance, validated_data):
        codes = validated_data.pop("categories", None)
        coverage_rows = validated_data.pop("coverage", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if codes is not None:
            if not codes:
                raise serializers.ValidationError(
                    {"categories": "Select at least one service category."}
                )
            self._sync_categories(instance, codes)
        if coverage_rows is not None:
            self._sync_coverage(instance, coverage_rows)
        instance.refresh_completion()
        return instance


class ProviderPublicSerializer(serializers.ModelSerializer):
    """Limited provider card used in discovery results."""

    categories = serializers.SerializerMethodField()
    matching_locations = serializers.SerializerMethodField()

    class Meta:
        model = ProviderProfile
        fields = [
            "id",
            "display_name",
            "description",
            "verification_status",
            "categories",
            "matching_locations",
        ]

    def get_categories(self, obj):
        return obj.declared_categories()

    def get_matching_locations(self, obj):
        locations = self.context.get("matching_locations")
        if locations is None:
            return []
        return ProviderCoverageSerializer(locations, many=True).data


__all__ = [
    "CustomerProfileSerializer",
    "ProviderCoverageSerializer",
    "ProviderProfileSerializer",
    "ProviderPublicSerializer",
    "ProviderServiceSerializer",
    "ServiceCategorySerializer",
    "VerificationStatus",
]
