"""Quotation, revision and line-item models (D-007).

A submitted revision is immutable. Two layers enforce it:

1. `QuotationRevision.save()` compares against the *stored* status and refuses
   content changes once that status has left DRAFT. Lifecycle-only changes
   (submit, supersede, withdraw, expire) remain possible.
2. A PostgreSQL trigger (migration 0002) enforces the same rule for raw SQL and
   `queryset.update()`, so immutability does not depend on application code paths.

Deleting a submitted revision is never allowed; drafts may be discarded.
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel, money_field, non_negative_check
from apps.events.models import Event, ServiceRequirement

CONTENT_FIELDS = ("revision_number", "notes", "valid_until", "total_paise", "quotation_id")
LIFECYCLE_FIELDS = {"status", "submitted_at", "superseded_at", "updated_at"}


class QuotationStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    WITHDRAWN = "WITHDRAWN", "Withdrawn"


class RevisionStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SUBMITTED = "SUBMITTED", "Submitted"
    SUPERSEDED = "SUPERSEDED", "Superseded"
    WITHDRAWN = "WITHDRAWN", "Withdrawn"
    EXPIRED = "EXPIRED", "Expired"


class ItemKind(models.TextChoices):
    LINE = "LINE", "Service line"
    PACKAGE = "PACKAGE", "Package line"


class Quotation(UUIDModel, TimeStampedModel):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="quotations")
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quotations"
    )
    status = models.CharField(
        max_length=20, choices=QuotationStatus.choices, default=QuotationStatus.OPEN
    )
    current_revision = models.ForeignKey(
        "QuotationRevision",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["event", "provider"], name="uniq_quotation_per_event_provider"
            ),
            models.CheckConstraint(
                condition=models.Q(status__in=["OPEN", "WITHDRAWN"]),
                name="quotation_status_valid",
            ),
        ]

    def __str__(self):
        return f"Quotation {self.pk} for event {self.event_id}"


class QuotationRevision(UUIDModel):
    quotation = models.ForeignKey(
        Quotation, on_delete=models.CASCADE, related_name="revisions"
    )
    revision_number = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20, choices=RevisionStatus.choices, default=RevisionStatus.DRAFT
    )
    notes = models.TextField(blank=True)
    valid_until = models.DateField(null=True, blank=True)
    total_paise = money_field(default=0)
    submitted_at = models.DateTimeField(null=True, blank=True)
    superseded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-revision_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["quotation", "revision_number"], name="uniq_revision_number"
            ),
            models.CheckConstraint(
                condition=models.Q(revision_number__gte=1), name="revision_number_positive"
            ),
            models.CheckConstraint(
                condition=models.Q(
                    status__in=["DRAFT", "SUBMITTED", "SUPERSEDED", "WITHDRAWN", "EXPIRED"]
                ),
                name="revision_status_valid",
            ),
            non_negative_check("total_paise", "revision_total_non_negative"),
        ]

    def save(self, *args, **kwargs):
        if self.pk:
            stored = (
                QuotationRevision.objects.filter(pk=self.pk)
                .values(*CONTENT_FIELDS, "status")
                .first()
            )
            if stored is not None and stored["status"] != RevisionStatus.DRAFT:
                changed = [
                    field
                    for field in CONTENT_FIELDS
                    if getattr(self, field) != stored[field]
                ]
                update_fields = kwargs.get("update_fields")
                if update_fields:
                    changed += [
                        field
                        for field in set(update_fields) & set(CONTENT_FIELDS)
                        if field not in changed
                    ]
                if changed:
                    raise ValidationError(
                        "A submitted quotation revision cannot be modified "
                        f"({', '.join(sorted(set(changed)))})."
                    )
        super().save(*args, **kwargs)

    @property
    def is_acceptance_eligible(self) -> bool:
        return self.status == RevisionStatus.SUBMITTED

    def __str__(self):
        return f"Revision {self.revision_number} of quotation {self.quotation_id}"


class QuotationItem(UUIDModel):
    revision = models.ForeignKey(
        QuotationRevision, on_delete=models.CASCADE, related_name="items"
    )
    requirement = models.ForeignKey(
        ServiceRequirement, on_delete=models.PROTECT, related_name="quotation_items"
    )
    kind = models.CharField(max_length=10, choices=ItemKind.choices, default=ItemKind.LINE)
    package_key = models.CharField(max_length=40, blank=True)
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    amount_paise = money_field()
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["revision", "requirement"], name="uniq_revision_requirement_item"
            ),
            models.CheckConstraint(
                condition=models.Q(kind__in=["LINE", "PACKAGE"]),
                name="quotation_item_kind_valid",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(kind="LINE", package_key="")
                    | (models.Q(kind="PACKAGE") & ~models.Q(package_key=""))
                ),
                name="quotation_item_package_key_rules",
            ),
            non_negative_check("amount_paise", "quotation_item_amount_non_negative"),
        ]

    def _assert_draft_parent(self):
        if not self.revision_id:
            return
        status = (
            QuotationRevision.objects.filter(pk=self.revision_id)
            .values_list("status", flat=True)
            .first()
        )
        if status is not None and status != RevisionStatus.DRAFT:
            raise ValidationError(
                "Items of a submitted quotation revision cannot be modified."
            )

    def save(self, *args, **kwargs):
        self._assert_draft_parent()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        self._assert_draft_parent()
        return super().delete(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.amount_paise} paise)"
