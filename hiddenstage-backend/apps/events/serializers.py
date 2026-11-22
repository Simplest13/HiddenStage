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
            "custom_service_name",
            "custom_service_description",
            "custom_review_status",
            "status",
            "position",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "position",
            "custom_review_status",
            "created_at",
            "updated_at",
        ]

    def validate_title(self, value):
        title = normalize_text(value)
        if not title:
            raise serializers.ValidationError("Enter a requirement title.")
        return title


class EventAttachmentSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()
    # Write-only on purpose: without it `save()` dropped the bytes and stored an
    # empty file, and it must never be echoed back, because the raw storage name
    # would bypass the authorising download view.
    file = serializers.FileField(write_only=True, required=False)

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
            "file",
        ]
        read_only_fields = [
            "id",
            "original_name",
            "content_type",
            "size_bytes",
            "scan_status",
            "download_url",
            "created_at",
        ]

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
            "end_date",
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


class PublicFeedRequirementSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_code = serializers.CharField(source="category.code", read_only=True)

    class Meta:
        model = ServiceRequirement
        fields = [
            "id",
            "category_code",
            "category_name",
            "title",
            "description",
            "budget_paise",
        ]


class PublicEventFeedSerializer(serializers.ModelSerializer):
    requirements = PublicFeedRequirementSerializer(many=True, read_only=True)
    anonymized_host = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "name",
            "event_type",
            "city",
            "state",
            "event_date",
            "guest_count",
            "requirements",
            "anonymized_host",
            "created_at",
        ]

    def get_anonymized_host(self, obj) -> str:
        loc = obj.city or "India"
        return f"Event Host in {loc}"


class CustomerBookingSerializer(serializers.ModelSerializer):
    requirements = ServiceRequirementSerializer(many=True, read_only=True)
    commitments = serializers.SerializerMethodField()
    quotations_count = serializers.SerializerMethodField()
    lifecycle_stage = serializers.SerializerMethodField()
    lifecycle_label = serializers.SerializerMethodField()
    financial_summary = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "name",
            "event_type",
            "description",
            "event_date",
            "end_date",
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
            "requirements",
            "commitments",
            "quotations_count",
            "lifecycle_stage",
            "lifecycle_label",
            "financial_summary",
            "created_at",
            "updated_at",
        ]

    def _active_commits(self, obj):
        if not hasattr(obj, "_cached_active_commits"):
            obj._cached_active_commits = [c for c in obj.commitments.all() if c.status == "ACTIVE"]
        return obj._cached_active_commits

    def _all_invoices(self, obj):
        if not hasattr(obj, "_cached_all_invoices"):
            obj._cached_all_invoices = list(obj.invoices.all())
        return obj._cached_all_invoices

    def get_quotations_count(self, obj) -> int:
        return getattr(obj, "quotations", []).count() if hasattr(obj, "quotations") else 0

    def get_commitments(self, obj) -> list:
        results = []
        commits = self._active_commits(obj)
        for c in commits:
            p_profile = getattr(c.provider, "provider_profile", None)
            results.append({
                "id": str(c.id),
                "provider_id": str(c.provider_id),
                "provider_name": c.provider.full_name,
                "provider_username": getattr(c.provider, "username", None),
                "provider_avatar": c.provider.avatar.url if c.provider.avatar and hasattr(c.provider.avatar, "url") else None,
                "business_name": getattr(p_profile, "business_name", c.provider.full_name) if p_profile else c.provider.full_name,
                "quotation_id": str(c.quotation_id),
                "total_paise": c.total_paise,
                "accepted_at": c.accepted_at,
                "status": c.status,
            })
        return results

    def get_financial_summary(self, obj) -> dict:
        commits = self._active_commits(obj)
        total_booked = sum(c.total_paise for c in commits)
        invoices = self._all_invoices(obj)
        total_invoiced = sum(i.amount_paise for i in invoices)
        paid_invoices = [i for i in invoices if i.status == "PAID"]
        total_paid = sum(i.amount_paise for i in paid_invoices)
        return {
            "total_booked_paise": total_booked,
            "total_invoiced_paise": total_invoiced,
            "total_paid_paise": total_paid,
            "total_pending_paise": max(0, total_booked - total_paid),
        }

    def get_lifecycle_stage(self, obj) -> str:
        # Determine 11-step lifecycle
        today = timezone.now().date()
        commits = self._active_commits(obj)
        invoices = self._all_invoices(obj)
        has_commit = len(commits) > 0
        
        if has_commit:
            total_booked = sum(c.total_paise for c in commits)
            total_paid = sum(i.amount_paise for i in invoices if i.status == "PAID")
            is_past = obj.event_date < today if obj.event_date else False
            is_today = obj.event_date == today if obj.event_date else False

            # If event date has passed or customer confirmed event completion (closed_at set)
            if is_past or (obj.closed_at and (obj.event_date is None or obj.event_date <= today)):
                if total_paid >= total_booked and total_booked > 0:
                    return "event_completed"
                return "final_payment_pending"

            # If today is event day
            if is_today:
                return "service_in_progress"

            # Future event with active commitment
            if total_paid > 0:
                return "advance_paid_booking_confirmed"
            if any(i.status in ["PAYMENT_PENDING", "ADVANCE_PENDING"] for i in invoices):
                return "advance_payment_pending"
            return "quotation_accepted"
        
        # Quotation checks
        quotes = getattr(obj, "quotations", None)
        if quotes and quotes.exists():
            if quotes.filter(revisions__revision_number__gt=1).exists():
                return "quotation_revised"
            return "quotation_received"
        
        # Invitation check
        invs = getattr(obj, "invitations", None)
        if invs and invs.exists():
            return "invitation_sent"
        
        return "service_requested"

    def get_lifecycle_label(self, obj) -> str:
        stage = self.get_lifecycle_stage(obj)
        labels = {
            "service_requested": "Request Submitted",
            "invitation_sent": "Invitations Sent",
            "quotation_received": "Quotation Received",
            "quotation_revised": "Revision in Progress",
            "quotation_accepted": "Quotation Accepted",
            "advance_payment_pending": "Advance Payment Pending",
            "advance_paid_booking_confirmed": "Booking Confirmed",
            "service_in_progress": "Service in Progress",
            "final_payment_pending": "Final Payment Pending",
            "event_completed": "Event Completed",
            "review_submitted": "Review Submitted",
        }
        return labels.get(stage, stage.replace("_", " ").title())


class EventListSerializer(serializers.ModelSerializer):
    requirement_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Event
        fields = [
            "id",
            "name",
            "event_type",
            "event_date",
            "end_date",
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
    custom_service_name = serializers.CharField(
        max_length=150, required=False, allow_blank=True, default=""
    )
    custom_service_description = serializers.CharField(
        required=False, allow_blank=True, default=""
    )

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
            "end_date",
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
        event_date = attrs.get("event_date") or (instance.event_date if instance else None)
        end_date = attrs.get("end_date") or (instance.end_date if instance else None)

        if start and isinstance(start, str):
            start = time.fromisoformat(start)
        if end and isinstance(end, str):
            end = time.fromisoformat(end)

        if start and end:
            if event_date and end_date:
                if end_date < event_date:
                    raise serializers.ValidationError(
                        {"end_date": "The end date cannot be before the event date."}
                    )
                if end_date == event_date and end <= start:
                    raise serializers.ValidationError(
                        {"end_time": "The end time must be after the start time for same-day events."}
                    )
            elif end <= start:
                raise serializers.ValidationError(
                    {"end_time": "The end time must be after the start time."}
                )

        status_value = attrs.get("status", EventStatus.DRAFT)
        if event_date and status_value == EventStatus.SUBMITTED:
            if event_date < timezone.localdate():
                raise serializers.ValidationError(
                    {"event_date": "The event date cannot be in the past."}
                )
        if end_date and status_value == EventStatus.SUBMITTED:
            if end_date < timezone.localdate():
                raise serializers.ValidationError(
                    {"end_date": "The end date cannot be in the past."}
                )
        return attrs
