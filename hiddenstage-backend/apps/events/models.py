"""Event request, service requirement and attachment models.

State machine (see docs/UNRESOLVED_DECISIONS.md A-01):
    DRAFT -> SUBMITTED -> WITHDRAWN
                       -> CLOSED (set when all requirements are committed)
Submitted events are not silently destructive: edits are only allowed while no
invitation has been issued, and withdrawal is recorded rather than deleted.
"""

import uuid
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel, UUIDModel, money_field, non_negative_check
from apps.core.validators import normalize_pin_code, normalize_text, validate_pin_code
from apps.profiles.models import ServiceCategory


class EventStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SUBMITTED = "SUBMITTED", "Submitted"
    WITHDRAWN = "WITHDRAWN", "Withdrawn"
    CLOSED = "CLOSED", "Closed"


class RequirementStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    COMMITTED = "COMMITTED", "Committed"
    CANCELLED = "CANCELLED", "Cancelled"


class Event(UUIDModel, TimeStampedModel):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="events"
    )
    name = models.CharField(max_length=150)
    event_type = models.CharField(max_length=60)
    description = models.TextField(blank=True)
    event_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    guest_count = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    pin_code = models.CharField(max_length=6, validators=[validate_pin_code])
    locality = models.CharField(max_length=120)
    city = models.CharField(max_length=80)
    state = models.CharField(max_length=80)
    venue_name = models.CharField(max_length=200, blank=True)
    venue_address = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=EventStatus.choices, default=EventStatus.DRAFT)
    submitted_at = models.DateTimeField(null=True, blank=True)
    withdrawn_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-event_date", "-created_at"]
        indexes = [
            models.Index(fields=["customer", "status"], name="event_customer_status_idx"),
            models.Index(fields=["status", "event_date"], name="event_status_date_idx"),
            models.Index(fields=["pin_code", "city"], name="event_pin_city_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(status__in=["DRAFT", "SUBMITTED", "WITHDRAWN", "CLOSED"]),
                name="event_status_valid",
            ),
            models.CheckConstraint(
                condition=models.Q(end_time__gt=models.F("start_time")),
                name="event_end_after_start",
            ),
            models.CheckConstraint(
                condition=models.Q(guest_count__gte=1), name="event_guest_count_positive"
            ),
        ]

    def save(self, *args, **kwargs):
        self.pin_code = normalize_pin_code(self.pin_code)
        for field in ("locality", "city", "state"):
            setattr(self, field, normalize_text(getattr(self, field)))
        self.name = normalize_text(self.name)
        super().save(*args, **kwargs)

    @property
    def is_draft(self) -> bool:
        return self.status == EventStatus.DRAFT

    @property
    def is_open_for_invitations(self) -> bool:
        return self.status == EventStatus.SUBMITTED

    def __str__(self):
        return f"{self.name} ({self.event_date})"


class ServiceRequirement(UUIDModel):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="requirements")
    category = models.ForeignKey(
        ServiceCategory, on_delete=models.PROTECT, related_name="service_requirements"
    )
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    budget_paise = money_field(null=True, blank=True)
    instructions = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=RequirementStatus.choices, default=RequirementStatus.OPEN
    )
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position", "created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(status__in=["OPEN", "COMMITTED", "CANCELLED"]),
                name="requirement_status_valid",
            ),
            non_negative_check("budget_paise", "requirement_budget_non_negative"),
        ]

    def save(self, *args, **kwargs):
        self.title = normalize_text(self.title)
        super().save(*args, **kwargs)

    @property
    def is_open(self) -> bool:
        return self.status == RequirementStatus.OPEN

    def __str__(self):
        return f"{self.title} ({self.category_id})"


def attachment_upload_to(instance, filename: str) -> str:
    suffix = Path(filename).suffix.lower()[:10]
    return f"events/{instance.event_id}/{uuid.uuid4().hex}{suffix}"


class ScanStatus(models.TextChoices):
    PENDING = "PENDING", "Scan pending"
    CLEAN = "CLEAN", "Clean"
    REJECTED = "REJECTED", "Rejected"
    SKIPPED = "SKIPPED", "Scanner not configured"


class EventAttachment(UUIDModel):
    """Private attachment (D-013). Files are never publicly addressable."""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="attachments")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="uploaded_attachments"
    )
    file = models.FileField(upload_to=attachment_upload_to)
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    size_bytes = models.BigIntegerField()
    scan_status = models.CharField(
        max_length=20, choices=ScanStatus.choices, default=ScanStatus.SKIPPED
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(size_bytes__gt=0), name="attachment_size_positive"
            ),
            models.CheckConstraint(
                condition=models.Q(scan_status__in=["PENDING", "CLEAN", "REJECTED", "SKIPPED"]),
                name="attachment_scan_status_valid",
            ),
        ]

    def __str__(self):
        return self.original_name


def mark_requirements_committed(event, requirement_ids):
    """Transition open requirements to COMMITTED, then close a fully committed event."""
    updated = event.requirements.filter(
        id__in=requirement_ids, status=RequirementStatus.OPEN
    ).update(status=RequirementStatus.COMMITTED, updated_at=timezone.now())
    if not event.requirements.filter(status=RequirementStatus.OPEN).exists():
        event.status = EventStatus.CLOSED
        event.closed_at = timezone.now()
        event.save(update_fields=["status", "closed_at", "updated_at"])
    return updated


def validate_event_can_be_edited(event):
    from apps.events.services import ensure_event_editable

    ensure_event_editable(event)
