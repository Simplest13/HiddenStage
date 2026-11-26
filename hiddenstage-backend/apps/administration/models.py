"""Append-only administrative audit trail."""

from django.conf import settings
from django.db import models

from apps.core.models import UUIDModel


class AdminAuditAction(models.TextChoices):
    PROVIDER_VERIFICATION_UPDATED = (
        "PROVIDER_VERIFICATION_UPDATED",
        "Provider verification updated",
    )
    PROVIDER_FEATURED_UPDATED = (
        "PROVIDER_FEATURED_UPDATED",
        "Provider featured status updated",
    )
    BUSINESS_UPDATED = "BUSINESS_UPDATED", "Business updated"
    USER_UPDATED = "USER_UPDATED", "User updated"
    EVENT_WITHDRAWN = "EVENT_WITHDRAWN", "Event withdrawn by admin"
    COMMITMENT_RELEASED = "COMMITMENT_RELEASED", "Commitment released by admin"
    CATEGORY_CREATED = "CATEGORY_CREATED", "Service category created"
    CATEGORY_UPDATED = "CATEGORY_UPDATED", "Service category updated"


class AdminAuditLog(UUIDModel):
    """Immutable log of administrative verification, moderation and config changes."""

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="admin_audit_entries",
    )
    action = models.CharField(max_length=60, choices=AdminAuditAction.choices)
    target_type = models.CharField(max_length=40)
    target_id = models.CharField(max_length=64)
    target_label = models.CharField(max_length=255, blank=True)
    note = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"], name="admin_audit_created_idx"),
            models.Index(fields=["target_type", "target_id"], name="admin_audit_target_idx"),
            models.Index(fields=["action"], name="admin_audit_action_idx"),
        ]

    def __str__(self):
        return f"{self.action} on {self.target_type}:{self.target_id}"

