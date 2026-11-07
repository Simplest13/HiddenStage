from rest_framework import serializers

from apps.invitations.models import Invitation
from apps.profiles.models import ProviderProfile


class InvitationCreateSerializer(serializers.Serializer):
    provider_id = serializers.UUIDField()
    requirement_id = serializers.UUIDField(required=False, allow_null=True)
    message = serializers.CharField(required=False, allow_blank=True, max_length=2000, default="")


class InvitationSerializer(serializers.ModelSerializer):
    provider_display_name = serializers.SerializerMethodField()
    requirement_title = serializers.CharField(source="requirement.title", read_only=True)
    event_name = serializers.CharField(source="event.name", read_only=True)

    class Meta:
        model = Invitation
        fields = [
            "id",
            "event",
            "event_name",
            "provider",
            "provider_display_name",
            "requirement",
            "requirement_title",
            "message",
            "status",
            "expires_at",
            "responded_at",
            "created_at",
        ]
        read_only_fields = fields

    def get_provider_display_name(self, obj) -> str:
        profile = ProviderProfile.objects.filter(user_id=obj.provider_id).only("display_name").first()
        return profile.display_name if profile else obj.provider.full_name


class ProviderInvitationSerializer(InvitationSerializer):
    """Provider inbox: includes the event summary needed to decide."""

    event_detail = serializers.SerializerMethodField()

    class Meta(InvitationSerializer.Meta):
        fields = InvitationSerializer.Meta.fields + ["event_detail"]
        read_only_fields = fields

    def get_event_detail(self, obj) -> dict:
        event = obj.event
        return {
            "id": event.id,
            "name": event.name,
            "event_type": event.event_type,
            "event_date": event.event_date,
            "start_time": event.start_time,
            "end_time": event.end_time,
            "guest_count": event.guest_count,
            "city": event.city,
            "locality": event.locality,
            "pin_code": event.pin_code,
            "status": event.status,
            "requirements": [
                {
                    "id": requirement.id,
                    "title": requirement.title,
                    "category": requirement.category.code,
                    "budget_paise": requirement.budget_paise,
                    "status": requirement.status,
                }
                for requirement in event.requirements.all()
            ],
        }
