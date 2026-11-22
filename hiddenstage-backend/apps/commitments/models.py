"""Commitment models: the recorded outcome of accepting a quotation.

`CommitmentLine.revision_item` carries a *global* unique constraint. That is the
hard, database-level guarantee that one quoted line can become a commitment only
once, so two concurrent acceptance requests cannot both succeed even if they race
past the application-level locks.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel, UUIDModel, money_field, non_negative_check
from apps.events.models import Event, ServiceRequirement
from apps.quotations.models import Quotation, QuotationItem, QuotationRevision


class CommitmentStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    RELEASED = "RELEASED", "Released"


class CommitmentAction(models.TextChoices):
    ACCEPTED = "ACCEPTED", "Accepted"
    RELEASED = "RELEASED", "Released"


class Commitment(UUIDModel, TimeStampedModel):
    event = models.ForeignKey(Event, on_delete=models.PROTECT, related_name="commitments")
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="commitments"
    )
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="received_commitments",
    )
    quotation = models.OneToOneField(
        Quotation, on_delete=models.PROTECT, related_name="commitment"
    )
    revision = models.ForeignKey(
        QuotationRevision, on_delete=models.PROTECT, related_name="commitments"
    )
    status = models.CharField(
        max_length=20, choices=CommitmentStatus.choices, default=CommitmentStatus.ACTIVE
    )
    total_paise = money_field()
    accepted_at = models.DateTimeField()
    released_at = models.DateTimeField(null=True, blank=True)
    released_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="released_commitments",
    )
    release_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-accepted_at"]
        indexes = [
            models.Index(fields=["customer", "status"], name="commit_customer_status_idx"),
            models.Index(fields=["provider", "status"], name="commit_provider_status_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(status__in=["ACTIVE", "RELEASED"]),
                name="commitment_status_valid",
            ),
            models.CheckConstraint(
                condition=models.Q(total_paise__gte=0), name="commitment_total_non_negative"
            ),
            models.CheckConstraint(
                condition=(models.Q(status="ACTIVE") & models.Q(released_at__isnull=True))
                | models.Q(status="RELEASED"),
                name="commitment_release_consistency",
            ),
        ]

    def __str__(self):
        return f"Commitment {self.pk} ({self.status})"


class CommitmentLine(UUIDModel):
    commitment = models.ForeignKey(
        Commitment, on_delete=models.CASCADE, related_name="lines"
    )
    # One accepted line per quoted line, enforced by the database itself.
    revision_item = models.OneToOneField(
        QuotationItem, on_delete=models.PROTECT, related_name="commitment_line"
    )
    requirement = models.ForeignKey(
        ServiceRequirement, on_delete=models.PROTECT, related_name="commitment_lines"
    )
    package_key = models.CharField(max_length=40, blank=True)
    title = models.CharField(max_length=150)
    amount_paise = money_field()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount_paise__gte=0),
                name="commitment_line_amount_non_negative",
            ),
        ]

    def __str__(self):
        return f"{self.title} ({self.amount_paise} paise)"


class CommitmentAudit(UUIDModel):
    """Append-only record of every commitment decision (D-014: auditable release)."""

    commitment = models.ForeignKey(
        Commitment, on_delete=models.CASCADE, related_name="audit_entries"
    )
    action = models.CharField(max_length=20, choices=CommitmentAction.choices)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(action__in=["ACCEPTED", "RELEASED"]),
                name="commitment_audit_action_valid",
            ),
        ]

    def __str__(self):
        return f"{self.action} on {self.commitment_id}"


class InvoiceStatus(models.TextChoices):
    NOT_DUE = "NOT_DUE", "Not due"
    PAYMENT_PENDING = "PAYMENT_PENDING", "Payment pending"
    ADVANCE_PENDING = "ADVANCE_PENDING", "Advance pending"
    PARTIALLY_PAID = "PARTIALLY_PAID", "Partially paid"
    PAID = "PAID", "Paid"
    OVERDUE = "OVERDUE", "Overdue"
    REFUND_PENDING = "REFUND_PENDING", "Refund pending"
    REFUNDED = "REFUNDED", "Refunded"
    CANCELLED = "CANCELLED", "Cancelled"


class Invoice(UUIDModel, TimeStampedModel):
    commitment = models.ForeignKey(
        Commitment, on_delete=models.CASCADE, related_name="invoices", null=True, blank=True
    )
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="invoices")
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="customer_invoices"
    )
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="provider_invoices"
    )
    invoice_number = models.CharField(max_length=50, unique=True)
    issue_date = models.DateField(default=timezone.now)
    due_date = models.DateField(null=True, blank=True)
    amount_paise = money_field()
    tax_paise = money_field(default=0)
    status = models.CharField(
        max_length=30, choices=InvoiceStatus.choices, default=InvoiceStatus.PAYMENT_PENDING
    )
    items = models.JSONField(default=list, blank=True)
    pdf_url = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ["-issue_date", "-created_at"]

    def __str__(self):
        return f"Invoice {self.invoice_number} ({self.status})"


class PaymentTransaction(UUIDModel, TimeStampedModel):
    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name="transactions", null=True, blank=True
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="customer_payments"
    )
    amount_paise = money_field()
    method = models.CharField(max_length=50, default="SIMULATED_ESCROW")
    reference = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, default="COMPLETED")
    paid_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-paid_at"]

    def __str__(self):
        return f"Payment {self.reference} ({self.amount_paise} paise)"
