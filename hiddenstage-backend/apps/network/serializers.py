from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.network.models import (
    AssignmentStatus,
    NetworkAssociation,
    NetworkInvitation,
    WorkerAssignment,
)
from apps.profiles.serializers import ProviderCoverageSerializer


def provider_summary(profile) -> dict | None:
    if profile is None:
        return None
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "display_name": profile.display_name,
        "kind": profile.kind,
        "description": profile.description,
        "verification_status": profile.verification_status,
        "categories": profile.declared_categories(),
        "coverage": ProviderCoverageSerializer(profile.coverage.all(), many=True).data,
    }


class ProviderSummarySerializer(serializers.Serializer):
    """Public shape of a provider profile, safe to expose to a counterpart."""

    id = serializers.UUIDField(allow_null=True)
    user_id = serializers.UUIDField()
    display_name = serializers.CharField()
    kind = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    verification_status = serializers.CharField()
    categories = serializers.ListField(child=serializers.CharField())
    coverage = ProviderCoverageSerializer(many=True)


class NetworkInvitationSerializer(serializers.ModelSerializer):
    manager_profile = serializers.SerializerMethodField()
    worker_profile = serializers.SerializerMethodField()
    manager_name = serializers.CharField(source="manager.full_name", read_only=True)
    worker_name = serializers.CharField(source="worker.full_name", read_only=True)

    class Meta:
        model = NetworkInvitation
        fields = [
            "id",
            "manager",
            "manager_name",
            "manager_profile",
            "worker",
            "worker_name",
            "worker_profile",
            "message",
            "status",
            "expires_at",
            "responded_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    @extend_schema_field(ProviderSummarySerializer(allow_null=True))
    def get_manager_profile(self, obj) -> dict | None:
        return provider_summary(getattr(obj.manager, "provider_profile", None))

    @extend_schema_field(ProviderSummarySerializer(allow_null=True))
    def get_worker_profile(self, obj) -> dict | None:
        return provider_summary(getattr(obj.worker, "provider_profile", None))


class WorkerDiscoverySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    user_id = serializers.UUIDField()
    display_name = serializers.CharField()
    description = serializers.CharField()
    verification_status = serializers.CharField()
    categories = serializers.ListField(child=serializers.CharField())
    coverage = ProviderCoverageSerializer(many=True)
    relationship = serializers.CharField()
    association_id = serializers.UUIDField(allow_null=True)
    invitation_id = serializers.UUIDField(allow_null=True)


class NetworkAssociationSerializer(serializers.ModelSerializer):
    counterpart_profile = serializers.SerializerMethodField()
    counterpart_user_id = serializers.SerializerMethodField()
    active_assignments = serializers.SerializerMethodField()
    completed_assignments = serializers.SerializerMethodField()

    class Meta:
        model = NetworkAssociation
        fields = [
            "id",
            "manager",
            "worker",
            "counterpart_user_id",
            "counterpart_profile",
            "status",
            "associated_at",
            "ended_at",
            "ended_reason",
            "active_assignments",
            "completed_assignments",
        ]
        read_only_fields = fields

    def _viewer_is_manager(self, obj) -> bool:
        request = self.context.get("request")
        return bool(request and request.user.id == obj.manager_id)

    @extend_schema_field(ProviderSummarySerializer(allow_null=True))
    def get_counterpart_profile(self, obj) -> dict | None:
        other = obj.worker if self._viewer_is_manager(obj) else obj.manager
        return provider_summary(getattr(other, "provider_profile", None))

    @extend_schema_field(serializers.UUIDField(allow_null=True))
    def get_counterpart_user_id(self, obj) -> str | None:
        return obj.worker_id if self._viewer_is_manager(obj) else obj.manager_id

    @extend_schema_field(serializers.IntegerField())
    def get_active_assignments(self, obj) -> int:
        return WorkerAssignment.objects.filter(
            manager=obj.manager_id,
            worker=obj.worker_id,
            status__in=[AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS],
        ).count()

    @extend_schema_field(serializers.IntegerField())
    def get_completed_assignments(self, obj) -> int:
        return WorkerAssignment.objects.filter(
            manager=obj.manager_id,
            worker=obj.worker_id,
            status=AssignmentStatus.COMPLETED,
        ).count()


class WorkerAssignmentSerializer(serializers.ModelSerializer):
    manager_name = serializers.CharField(source="manager.full_name", read_only=True)
    worker_name = serializers.CharField(source="worker.full_name", read_only=True)
    manager_profile = serializers.SerializerMethodField()
    worker_profile = serializers.SerializerMethodField()
    event = serializers.UUIDField(source="commitment.event_id", read_only=True)
    event_name = serializers.CharField(source="commitment.event.name", read_only=True)
    event_city = serializers.CharField(source="commitment.event.city", read_only=True)
    event_locality = serializers.CharField(source="commitment.event.locality", read_only=True)
    counterpart_contact = serializers.SerializerMethodField()
    actions = serializers.SerializerMethodField()

    class Meta:
        model = WorkerAssignment
        fields = [
            "id",
            "manager",
            "manager_name",
            "manager_profile",
            "worker",
            "worker_name",
            "worker_profile",
            "commitment",
            "event",
            "event_name",
            "event_city",
            "event_locality",
            "role",
            "task_description",
            "instructions",
            "event_date",
            "start_time",
            "end_time",
            "reporting_time",
            "location",
            "compensation_paise",
            "response_deadline",
            "status",
            "responded_at",
            "accepted_at",
            "started_at",
            "completed_at",
            "cancelled_at",
            "response_note",
            "cancellation_reason",
            "completion_notes",
            "replaces",
            "counterpart_contact",
            "actions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    @extend_schema_field(ProviderSummarySerializer(allow_null=True))
    def get_manager_profile(self, obj) -> dict | None:
        return provider_summary(getattr(obj.manager, "provider_profile", None))

    @extend_schema_field(ProviderSummarySerializer(allow_null=True))
    def get_worker_profile(self, obj) -> dict | None:
        return provider_summary(getattr(obj.worker, "provider_profile", None))

    def _viewer(self):
        request = self.context.get("request")
        return request.user if request else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_counterpart_contact(self, obj) -> str | None:
        viewer = self._viewer()
        if viewer is None or obj.status not in {
            AssignmentStatus.ACCEPTED,
            AssignmentStatus.IN_PROGRESS,
            AssignmentStatus.COMPLETED,
        }:
            return None
        if viewer.id == obj.worker_id:
            profile = getattr(obj.manager, "provider_profile", None)
        elif viewer.id == obj.manager_id:
            profile = getattr(obj.worker, "provider_profile", None)
        else:
            return None
        return profile.contact if profile else None

    @extend_schema_field(serializers.DictField(child=serializers.BooleanField()))
    def get_actions(self, obj) -> dict[str, bool]:
        viewer = self._viewer()
        if viewer is None:
            return {}
        if viewer.id == obj.worker_id:
            return {
                "accept": obj.status == AssignmentStatus.SENT,
                "decline": obj.status == AssignmentStatus.SENT,
                "start": obj.status == AssignmentStatus.ACCEPTED,
                "complete": obj.status == AssignmentStatus.IN_PROGRESS,
            }
        if viewer.id == obj.manager_id:
            return {
                "cancel": obj.status
                in {
                    AssignmentStatus.DRAFT,
                    AssignmentStatus.SENT,
                    AssignmentStatus.ACCEPTED,
                    AssignmentStatus.IN_PROGRESS,
                },
                "reassign": obj.status
                in {AssignmentStatus.DECLINED, AssignmentStatus.CANCELLED},
            }
        return {}


class AssignmentCreateSerializer(serializers.Serializer):
    worker_id = serializers.UUIDField()
    commitment_id = serializers.UUIDField()
    role = serializers.CharField(max_length=120)
    task_description = serializers.CharField(max_length=4000)
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    reporting_time = serializers.TimeField(required=False, allow_null=True)
    location = serializers.CharField(required=False, allow_blank=True, max_length=1000, default="")
    instructions = serializers.CharField(
        required=False, allow_blank=True, max_length=4000, default=""
    )
    compensation_paise = serializers.IntegerField(
        required=False, allow_null=True, min_value=0
    )
    response_deadline = serializers.DateTimeField(required=False, allow_null=True)
    send = serializers.BooleanField(required=False, default=True)
    replaces_id = serializers.UUIDField(required=False, allow_null=True)


class AssignmentActionSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=2000, default="")
    completion_notes = serializers.CharField(
        required=False, allow_blank=True, max_length=4000, default=""
    )


class AvailabilityQuerySerializer(serializers.Serializer):
    worker_id = serializers.UUIDField()
    event_date = serializers.DateField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()


class NetworkInvitationCreateSerializer(serializers.Serializer):
    worker_id = serializers.UUIDField()
    message = serializers.CharField(required=False, allow_blank=True, max_length=2000, default="")
class NetworkAssociationEndSerializer(serializers.Serializer):
    """Body of `POST /network/associations/{id}/end/`."""

    reason = serializers.CharField(required=False, allow_blank=True, max_length=500, default="")


class AvailabilityResponseSerializer(serializers.Serializer):
    """Availability is privacy-safe: no other Manager's event data is returned."""

    available = serializers.BooleanField()
    conflict = serializers.BooleanField()
    event_date = serializers.DateField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
