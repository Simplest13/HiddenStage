from rest_framework import serializers

from apps.commitments.models import Commitment, CommitmentAudit, CommitmentLine
from apps.profiles.models import ProviderProfile


class CommitmentLineSerializer(serializers.ModelSerializer):
    requirement_title = serializers.CharField(source="requirement.title", read_only=True)

    class Meta:
        model = CommitmentLine
        fields = [
            "id",
            "requirement",
            "requirement_title",
            "package_key",
            "title",
            "amount_paise",
        ]
        read_only_fields = fields


class CommitmentAuditSerializer(serializers.ModelSerializer):
    actor_email = serializers.CharField(source="actor.email", read_only=True, default=None)

    class Meta:
        model = CommitmentAudit
        fields = ["id", "action", "actor_email", "note", "created_at"]
        read_only_fields = fields


class CommitmentSerializer(serializers.ModelSerializer):
    lines = CommitmentLineSerializer(many=True, read_only=True)
    event_name = serializers.CharField(source="event.name", read_only=True)
    event_date = serializers.DateField(source="event.event_date", read_only=True)
    provider_display_name = serializers.SerializerMethodField()
    quotation_revision = serializers.IntegerField(
        source="revision.revision_number", read_only=True
    )

    class Meta:
        model = Commitment
        fields = [
            "id",
            "event",
            "event_name",
            "event_date",
            "customer",
            "provider",
            "provider_display_name",
            "quotation",
            "quotation_revision",
            "status",
            "total_paise",
            "accepted_at",
            "released_at",
            "release_reason",
            "lines",
            "created_at",
        ]
        read_only_fields = fields

    def get_provider_display_name(self, obj) -> str:
        profile = (
            ProviderProfile.objects.filter(user_id=obj.provider_id)
            .only("display_name")
            .first()
        )
        return profile.display_name if profile else obj.provider.full_name


class CommitmentDetailSerializer(CommitmentSerializer):
    audit_entries = CommitmentAuditSerializer(many=True, read_only=True)

    class Meta(CommitmentSerializer.Meta):
        fields = CommitmentSerializer.Meta.fields + ["audit_entries"]
        read_only_fields = fields


class AcceptanceRequestSerializer(serializers.Serializer):
    revision_id = serializers.UUIDField()
    package_keys = serializers.ListField(
        child=serializers.CharField(max_length=40), required=False, default=list
    )
    requirement_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list
    )

    def validate(self, attrs):
        if not attrs.get("package_keys") and not attrs.get("requirement_ids"):
            raise serializers.ValidationError(
                "Select at least one package or service line to accept."
            )
        return attrs


class ReleaseRequestSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=1000)
