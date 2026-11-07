from rest_framework import serializers

from apps.profiles.models import ProviderProfile
from apps.quotations.models import ItemKind, Quotation, QuotationItem, QuotationRevision


class QuotationItemSerializer(serializers.ModelSerializer):
    requirement_title = serializers.CharField(source="requirement.title", read_only=True)

    class Meta:
        model = QuotationItem
        fields = [
            "id",
            "requirement",
            "requirement_title",
            "kind",
            "package_key",
            "title",
            "description",
            "amount_paise",
            "position",
        ]
        read_only_fields = fields


class QuotationRevisionSerializer(serializers.ModelSerializer):
    items = QuotationItemSerializer(many=True, read_only=True)
    is_acceptance_eligible = serializers.BooleanField(read_only=True)

    class Meta:
        model = QuotationRevision
        fields = [
            "id",
            "revision_number",
            "status",
            "notes",
            "valid_until",
            "total_paise",
            "submitted_at",
            "created_at",
            "is_acceptance_eligible",
            "items",
        ]
        read_only_fields = fields


class QuotationSerializer(serializers.ModelSerializer):
    revisions = QuotationRevisionSerializer(many=True, read_only=True)
    provider_display_name = serializers.SerializerMethodField()
    event_name = serializers.CharField(source="event.name", read_only=True)

    class Meta:
        model = Quotation
        fields = [
            "id",
            "event",
            "event_name",
            "provider",
            "provider_display_name",
            "status",
            "current_revision",
            "created_at",
            "updated_at",
            "revisions",
        ]
        read_only_fields = fields

    def get_provider_display_name(self, obj) -> str:
        profile = (
            ProviderProfile.objects.filter(user_id=obj.provider_id)
            .only("display_name")
            .first()
        )
        return profile.display_name if profile else obj.provider.full_name


class QuotationItemInputSerializer(serializers.Serializer):
    requirement_id = serializers.UUIDField()
    kind = serializers.ChoiceField(choices=ItemKind.choices, default=ItemKind.LINE)
    package_key = serializers.CharField(
        required=False, allow_blank=True, max_length=40, default=""
    )
    title = serializers.CharField(max_length=150)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    amount_paise = serializers.IntegerField(min_value=1)

    def validate(self, attrs):
        if attrs["kind"] == ItemKind.PACKAGE and not attrs.get("package_key"):
            raise serializers.ValidationError(
                {"package_key": "Package items require a package key."}
            )
        if attrs["kind"] == ItemKind.LINE and attrs.get("package_key"):
            raise serializers.ValidationError(
                {"package_key": "Service lines cannot carry a package key."}
            )
        return attrs


class RevisionWriteSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, max_length=4000)
    valid_until = serializers.DateField(required=False, allow_null=True)
    items = QuotationItemInputSerializer(many=True, required=False)


class QuotationCreateSerializer(serializers.Serializer):
    event = serializers.UUIDField()


class AcceptanceSerializer(serializers.Serializer):
    """Selection is whole packages or individual service lines.

    A package is accepted all-or-nothing: every item sharing `package_key` is
    included, and a package cannot be partially accepted.
    """

    revision_id = serializers.UUIDField()
    package_keys = serializers.ListField(
        child=serializers.CharField(max_length=40), required=False, default=list
    )
    requirement_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list
    )

    def validate(self, attrs):
        package_keys = attrs.get("package_keys") or []
        requirement_ids = attrs.get("requirement_ids") or []
        if not package_keys and not requirement_ids:
            raise serializers.ValidationError(
                "Select at least one package or service line to accept."
            )
        if len(package_keys) != len(set(package_keys)):
            raise serializers.ValidationError(
                {"package_keys": "Duplicate package keys."}
            )
        if len(requirement_ids) != len(set(requirement_ids)):
            raise serializers.ValidationError(
                {"requirement_ids": "Duplicate requirement ids."}
            )
        return attrs
