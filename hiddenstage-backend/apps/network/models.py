"""Manager–Worker network, invitations and work assignments.

A Worker is an independent provider account. Associations are deliberately
non-exclusive: one Worker may hold active associations with several Managers, and
ending an association only ends that relationship. Assignment rows and invitation
history are retained.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.commitments.models import Commitment
from apps.core.models import TimeStampedModel, UUIDModel, money_field, non_negative_check


class NetworkInvitationStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    ACCEPTED = "ACCEPTED", "Accepted"
    DECLINED = "DECLINED", "Declined"
    CANCELLED = "CANCELLED", "Cancelled"
    EXPIRED = "EXPIRED", "Expired"


class InvitationInitiator(models.TextChoices):
    MANAGER_INVITES = "MANAGER_INVITES", "Manager invites"
    PROFESSIONAL_REQUESTS = "PROFESSIONAL_REQUESTS", "Professional requests"


class AssociationStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    ENDED = "ENDED", "Ended"


class AssignmentStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SENT = "SENT", "Sent"
    ACCEPTED = "ACCEPTED", "Accepted"
    DECLINED = "DECLINED", "Declined"
    IN_PROGRESS = "IN_PROGRESS", "In progress"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"
    REASSIGNED = "REASSIGNED", "Reassigned"


class NetworkInvitation(UUIDModel, TimeStampedModel):
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_network_invitations",
    )
    worker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_network_invitations",
    )
    message = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=NetworkInvitationStatus.choices,
        default=NetworkInvitationStatus.PENDING,
    )
    initiated_by = models.CharField(
        max_length=30,
        choices=InvitationInitiator.choices,
        default=InvitationInitiator.MANAGER_INVITES,
        null=True,
        blank=True,
    )
    expires_at = models.DateTimeField()
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["manager", "status"], name="netinv_manager_status_idx"),
            models.Index(fields=["worker", "status"], name="netinv_worker_status_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(manager=models.F("worker")),
                name="network_invitation_distinct_users",
            ),
            models.CheckConstraint(
                condition=models.Q(
                    status__in=["PENDING", "ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED"]
                ),
                name="network_invitation_status_valid",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(
                        initiated_by__in=["MANAGER_INVITES", "PROFESSIONAL_REQUESTS"]
                    )
                    | models.Q(initiated_by__isnull=True)
                ),
                name="network_invitation_direction_valid",
            ),
            models.UniqueConstraint(
                fields=["manager", "worker"],
                condition=models.Q(status="PENDING"),
                name="uniq_pending_network_invitation",
            ),
        ]

    @property
    def is_expired(self) -> bool:
        return (
            self.status == NetworkInvitationStatus.PENDING
            and self.expires_at <= timezone.now()
        )

    def __str__(self):
        return f"Network invitation {self.manager_id} → {self.worker_id}"


class NetworkAssociation(UUIDModel):
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="worker_associations",
    )
    worker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="manager_associations",
    )
    status = models.CharField(
        max_length=20,
        choices=AssociationStatus.choices,
        default=AssociationStatus.ACTIVE,
    )
    associated_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    ended_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ended_network_associations",
    )
    ended_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-associated_at"]
        indexes = [
            models.Index(fields=["manager", "status"], name="netassoc_manager_status_idx"),
            models.Index(fields=["worker", "status"], name="netassoc_worker_status_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(manager=models.F("worker")),
                name="network_association_distinct_users",
            ),
            models.CheckConstraint(
                condition=models.Q(status__in=["ACTIVE", "ENDED"]),
                name="network_association_status_valid",
            ),
            models.UniqueConstraint(
                fields=["manager", "worker"],
                condition=models.Q(status="ACTIVE"),
                name="uniq_active_network_association",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(status="ACTIVE", ended_at__isnull=True)
                    | models.Q(status="ENDED")
                ),
                name="network_association_end_consistency",
            ),
        ]

    def __str__(self):
        return f"{self.manager_id} ↔ {self.worker_id} ({self.status})"


class WorkerAssignment(UUIDModel, TimeStampedModel):
    """A Manager's work allocation to one Worker for an accepted commitment."""

    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="issued_assignments",
    )
    worker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="received_assignments",
    )
    commitment = models.ForeignKey(
        Commitment,
        on_delete=models.PROTECT,
        related_name="worker_assignments",
    )
    replaces = models.OneToOneField(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="replacement",
    )
    role = models.CharField(max_length=120)
    task_description = models.TextField()
    instructions = models.TextField(blank=True)
    event_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    reporting_time = models.TimeField(null=True, blank=True)
    location = models.TextField(blank=True)
    compensation_paise = money_field(null=True, blank=True)
    response_deadline = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=AssignmentStatus.choices,
        default=AssignmentStatus.SENT,
    )
    responded_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    response_note = models.TextField(blank=True)
    cancellation_reason = models.TextField(blank=True)
    completion_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["event_date", "start_time", "created_at"]
        indexes = [
            models.Index(
                fields=["worker", "event_date", "status"], name="assign_worker_date_status_idx"
            ),
            models.Index(fields=["manager", "status"], name="assign_manager_status_idx"),
            models.Index(fields=["commitment", "status"], name="assign_commitment_status_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(manager=models.F("worker")),
                name="assignment_distinct_users",
            ),
            models.CheckConstraint(
                condition=models.Q(end_time__gt=models.F("start_time")),
                name="assignment_end_after_start",
            ),
            models.CheckConstraint(
                condition=models.Q(
                    status__in=[
                        "DRAFT",
                        "SENT",
                        "ACCEPTED",
                        "DECLINED",
                        "IN_PROGRESS",
                        "COMPLETED",
                        "CANCELLED",
                        "REASSIGNED",
                    ]
                ),
                name="assignment_status_valid",
            ),
            non_negative_check("compensation_paise", "assignment_compensation_non_negative"),
        ]

    def __str__(self):
        return f"{self.role} for {self.worker_id} on {self.event_date}"


class CustomerConnection(UUIDModel, TimeStampedModel):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="customer_network"
    )
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="connected_customers"
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["customer", "provider"], name="uniq_customer_provider_connection"
            )
        ]

    def __str__(self):
        return f"Connection: {self.customer_id} <-> {self.provider_id}"


class Conversation(UUIDModel, TimeStampedModel):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="customer_conversations"
    )
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="provider_conversations"
    )
    event = models.ForeignKey(
        "events.Event", on_delete=models.SET_NULL, null=True, blank=True, related_name="conversations"
    )

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Conversation: {self.customer_id} with {self.provider_id}"


class ChatMessage(UUIDModel, TimeStampedModel):
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_chat_messages"
    )
    content = models.TextField()
    attachment = models.FileField(upload_to="chat_attachments/", null=True, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Message {self.pk} in {self.conversation_id} from {self.sender_id}"
