"""Invitation records.

Invitations are the only way a provider can see a customer's event. Expiry is
enforced by the service layer (a PENDING row past `expires_at` is unusable), and
a partial unique constraint prevents duplicate live invitations to the same
provider for the same event.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import UUIDModel
from apps.events.models import Event, ServiceRequirement


class InvitationStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    ACCEPTED = "ACCEPTED", "Accepted"
    DECLINED = "DECLINED", "Declined"
    WITHDRAWN = "WITHDRAWN", "Withdrawn"
    EXPIRED = "EXPIRED", "Expired"


DEFAULT_INVITATION_TTL_DAYS = 7


class Invitation(UUIDModel):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="invitations")
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_invitations"
    )
    requirement = models.ForeignKey(
        ServiceRequirement,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="invitations",
    )
    message = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=InvitationStatus.choices, default=InvitationStatus.PENDING
    )
    expires_at = models.DateTimeField()
    responded_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_invitations"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["provider", "status"], name="invitation_provider_status_idx"),
            models.Index(fields=["event", "status"], name="invitation_event_status_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    status__in=["PENDING", "ACCEPTED", "DECLINED", "WITHDRAWN", "EXPIRED"]
                ),
                name="invitation_status_valid",
            ),
            models.UniqueConstraint(
                fields=["event", "provider"],
                condition=models.Q(status="PENDING", requirement__isnull=True),
                name="uniq_pending_event_invitation",
            ),
            models.UniqueConstraint(
                fields=["event", "provider", "requirement"],
                condition=models.Q(status="PENDING", requirement__isnull=False),
                name="uniq_pending_requirement_invitation",
            ),
        ]

    @property
    def is_expired(self) -> bool:
        return self.status == InvitationStatus.PENDING and self.expires_at <= timezone.now()

    def __str__(self):
        return f"Invitation to {self.provider_id} for {self.event_id}"
