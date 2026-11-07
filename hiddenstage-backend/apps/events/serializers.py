from datetime import time

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.core.validators import normalize_pin_code, normalize_text, validate_pin_code
from apps.events.models import Event, EventAttachment, EventStatus, ServiceRequirement
from apps.profiles.models import ServiceCategory
from apps.profiles.serializers import ServiceCategorySerializer


class ServiceRequirementSerializer(serializers.ModelSerializer):
    category = serializers.SlugRelatedField(
        slug_field="code", queryset=ServiceCategory.objects.filter(is_active=True)
    )
    category_detail = ServiceCategorySerializer(source="category", read_only=True)

    class Meta:
        model = ServiceRequirement
        fields = [
            "id",
            "category",
            "category_detail",
            "title",
            "description",
            "budget_paise",
            "instructions",
            "status",
            "position",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "position", "created_at", "updated_at"]

    def validate_title(self, value):
        title = normalize_text(value)
        if not title:
            raise serializers.ValidationError("Enter a requirement title.")
        return title


class EventAttachmentSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = EventAttachment
        fields = [
            "id",
            "original_name",
            "content_type",
            "size_bytes",
            "scan_status",
            "download_url",
            "created_at",
        ]
        read_only_fields = fields

    def get_download_url(self, obj) -> str:
        return f"/api/v1/events/{obj.event_id}/attachments/{obj.id}/download/"


class EventSerializer(serializers.ModelSerializer):
    """Read representation. Money is integer paise; times are Asia/Kolkata aware."""

    requirements = ServiceRequirementSerializer(many=True, read_only=True)
    attachments = EventAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Event
        fields = [
            "id",
            "name",
            "event_type",
            "description",
            "event_date",
            "start_time",
            "end_time",
            "guest_count",
            "pin_code",
            "locality",
            "city",
            "state",
            "venue_name",
            "venue_address",
            "status",
            "submitted_at",
            "withdrawn_at",
            "closed_at",
            "requirements",
            "attachments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class EventListSerializer(serializers.ModelSerializer):
    requirement_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Event
        fields = [
            "id",
            "name",
            "event_type",
            "event_date",
            "start_time",
            "end_time",
            "city",
            "pin_code",
            "status",
            "requirement_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class EventRequirementInputSerializer(serializers.Serializer):
    category = serializers.SlugField()
    title = serializers.CharField(max_length=150)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    budget_paise = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    instructions = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_category(self, value):
        code = normalize_text(value).lower()
        if not ServiceCategory.objects.filter(code=code, is_active=True).exists():
            raise serializers.ValidationError(f"Unknown service category: {code}.")
        return code


class EventWriteSerializer(serializers.ModelSerializer):
    requirements = EventRequirementInputSerializer(many=True, required=False)
    status = serializers.ChoiceField(
        choices=[EventStatus.DRAFT, EventStatus.SUBMITTED], required=False, default=EventStatus.DRAFT
    )

    class Meta:
        model = Event
        fields = [
            "name",
            "event_type",
            "description",
            "event_date",
            "start_time",
            "end_time",
            "guest_count",
            "pin_code",
            "locality",
            "city",
            "state",
            "venue_name",
            "venue_address",
            "status",
            "requirements",
        ]

    def validate_pin_code(self, value):
        try:
            validate_pin_code(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return normalize_pin_code(value)

    def validate_name(self, value):
        name = normalize_text(value)
        if not name:
            raise serializers.ValidationError("Enter an event name.")
        return name

    def validate_event_type(self, value):
        event_type = normalize_text(value)
        if not event_type:
            raise serializers.ValidationError("Select an event type.")
        return event_type

    def validate(self, attrs):
        instance = self.instance
        start = attrs.get("start_time") or (instance.start_time if instance else None)
        end = attrs.get("end_time") or (instance.end_time if instance else None)
        if start and end:
            if isinstance(start, str):
                start = time.fromisoformat(start)
            if isinstance(end, str):
                end = time.fromisoformat(end)
            if end <= start:
                raise serializers.ValidationError(
                    {"end_time": "The end time must be after the start time."}
                )
        event_date = attrs.get("event_date") or (instance.event_date if instance else None)
        status_value = attrs.get("status", EventStatus.DRAFT)
        if event_date and status_value == EventStatus.SUBMITTED:
            if event_date < timezone.localdate():
                raise serializers.ValidationError(
                    {"event_date": "The event date cannot be in the past."}
                )
        return attrs
