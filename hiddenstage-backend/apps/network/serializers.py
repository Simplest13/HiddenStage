from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.network.models import (
    AssignmentStatus,
    ChatMessage,
    Conversation,
    CustomerConnection,
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
            "initiated_by",
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
        if hasattr(obj, "_cached_counterpart_profile"):
            return provider_summary(obj._cached_counterpart_profile)
        other = obj.worker if self._viewer_is_manager(obj) else obj.manager
        return provider_summary(getattr(other, "provider_profile", None))

    @extend_schema_field(serializers.UUIDField(allow_null=True))
    def get_counterpart_user_id(self, obj) -> str | None:
        return obj.worker_id if self._viewer_is_manager(obj) else obj.manager_id

    @extend_schema_field(serializers.IntegerField())
    def get_active_assignments(self, obj) -> int:
        if hasattr(obj, "_active_assignments"):
            return obj._active_assignments
        return WorkerAssignment.objects.filter(
            manager=obj.manager_id,
            worker=obj.worker_id,
            status__in=[AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS],
        ).count()

    @extend_schema_field(serializers.IntegerField())
    def get_completed_assignments(self, obj) -> int:
        if hasattr(obj, "_completed_assignments"):
            return obj._completed_assignments
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
    worker_id = serializers.UUIDField(required=False, allow_null=True)
    manager_id = serializers.UUIDField(required=False, allow_null=True)
    message = serializers.CharField(
        required=False, allow_blank=True, max_length=2000, default=""
    )

    def validate(self, attrs):
        if not attrs.get("worker_id") and not attrs.get("manager_id"):
            raise serializers.ValidationError(
                "Either worker_id or manager_id is required."
            )
        return attrs
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


class CustomerConnectionSerializer(serializers.ModelSerializer):
    provider_name = serializers.SerializerMethodField()
    provider_username = serializers.SerializerMethodField()
    provider_avatar = serializers.SerializerMethodField()
    business_name = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    has_active_booking = serializers.SerializerMethodField()
    unread_messages_count = serializers.SerializerMethodField()
    customer = serializers.PrimaryKeyRelatedField(read_only=True)
    customer_details = serializers.SerializerMethodField()

    class Meta:
        model = CustomerConnection
        fields = [
            "id",
            "customer",
            "provider",
            "provider_name",
            "provider_username",
            "provider_avatar",
            "business_name",
            "category",
            "city",
            "notes",
            "has_active_booking",
            "unread_messages_count",
            "customer_details",
            "created_at",
        ]

    def _is_provider_view(self, obj) -> bool:
        request = self.context.get("request")
        return bool(request and request.user == obj.provider)

    def get_provider_name(self, obj) -> str:
        if self._is_provider_view(obj):
            return obj.customer.full_name
        return obj.provider.full_name

    def get_provider_username(self, obj) -> str | None:
        if self._is_provider_view(obj):
            return obj.customer.username
        return obj.provider.username

    def get_provider_avatar(self, obj) -> str | None:
        target = obj.customer if self._is_provider_view(obj) else obj.provider
        return getattr(target, "avatar_url", None)

    def get_business_name(self, obj) -> str:
        if self._is_provider_view(obj):
            return obj.customer.full_name
        prof = getattr(obj.provider, "provider_profile", None)
        return prof.display_name if prof and prof.display_name else obj.provider.full_name

    def get_category(self, obj) -> str:
        if self._is_provider_view(obj):
            return "Client"
        prof = getattr(obj.provider, "provider_profile", None)
        if prof and hasattr(prof, "declared_categories"):
            cats = prof.declared_categories()
            if cats:
                return cats[0]
        return "Specialist"

    def get_city(self, obj) -> str:
        if self._is_provider_view(obj):
            return "Customer"
        prof = getattr(obj.provider, "provider_profile", None)
        if prof and hasattr(prof, "coverage"):
            covs = prof.coverage.all()
            if covs:
                return covs[0].city
        return "India"

    def get_has_active_booking(self, obj) -> bool:
        active_pairs = self.context.get("active_pairs")
        if active_pairs is not None:
            return (obj.customer_id, obj.provider_id) in active_pairs
        from apps.commitments.models import Commitment
        return Commitment.objects.filter(customer=obj.customer, provider=obj.provider, status="ACTIVE").exists()

    def get_unread_messages_count(self, obj) -> int:
        unread_map = self.context.get("unread_map")
        if unread_map is not None:
            return unread_map.get((obj.customer_id, obj.provider_id), 0)
        request = self.context.get("request")
        conv = Conversation.objects.filter(customer=obj.customer, provider=obj.provider).first()
        if not conv:
            return 0
        exclude_user = request.user if request else obj.customer
        return conv.messages.filter(is_read=False).exclude(sender=exclude_user).count()

    def get_customer_details(self, obj) -> dict:
        c = obj.customer
        prof = getattr(c, "customer_profile", None)
        return {
            "id": str(c.id),
            "full_name": c.full_name,
            "username": c.username,
            "email": c.email,
            "phone": getattr(c, "phone", "") or "",
            "avatar": getattr(c, "avatar_url", None),
            "city": prof.city if prof and prof.city else "",
            "locality": prof.locality if prof and prof.locality else "",
            "state": prof.state if prof and prof.state else "",
            "pin_code": prof.pin_code if prof and prof.pin_code else "",
            "bio": prof.bio if prof and prof.bio else "",
            "joined_at": c.date_joined,
        }


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    sender_avatar = serializers.SerializerMethodField()
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "conversation",
            "sender",
            "sender_name",
            "sender_username",
            "sender_avatar",
            "is_me",
            "content",
            "attachment",
            "is_read",
            "read_at",
            "created_at",
        ]
        read_only_fields = ["id", "conversation", "sender", "is_read", "read_at", "created_at"]

    def get_sender_avatar(self, obj) -> str | None:
        u = obj.sender
        return getattr(u, "avatar_url", None)

    def get_is_me(self, obj) -> bool:
        request = self.context.get("request")
        if request and request.user:
            return obj.sender_id == request.user.id
        return False


class ConversationSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    latest_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "customer",
            "provider",
            "event",
            "other_user",
            "latest_message",
            "unread_count",
            "created_at",
            "updated_at",
        ]

    def get_other_user(self, obj) -> dict:
        request = self.context.get("request")
        target = obj.provider if request and request.user == obj.customer else obj.customer
        prof = getattr(target, "provider_profile", None)
        return {
            "id": str(target.id),
            "name": target.full_name,
            "username": target.username,
            "avatar": getattr(target, "avatar_url", None),
            "business_name": prof.display_name if prof and prof.display_name else target.full_name,
        }

    def get_latest_message(self, obj) -> dict | None:
        if hasattr(obj, "_prefetched_objects_cache") and "messages" in obj._prefetched_objects_cache:
            msgs = sorted(obj.messages.all(), key=lambda m: m.created_at, reverse=True)
            msg = msgs[0] if msgs else None
        else:
            msg = obj.messages.order_by("-created_at").first()
        if not msg:
            return None
        return {
            "id": str(msg.id),
            "content": msg.content,
            "sender_id": str(msg.sender_id),
            "created_at": msg.created_at,
            "is_read": msg.is_read,
        }

    def get_unread_count(self, obj) -> int:
        request = self.context.get("request")
        if not request:
            return 0
        if hasattr(obj, "_prefetched_objects_cache") and "messages" in obj._prefetched_objects_cache:
            user_id = request.user.id
            return sum(1 for m in obj.messages.all() if not m.is_read and m.sender_id != user_id)
        return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
