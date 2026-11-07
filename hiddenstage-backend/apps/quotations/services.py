"""Quotation use cases: create, draft, submit, withdraw.

Every state transition runs in one transaction and takes row locks on the
quotation (and revision where relevant) so concurrent requests cannot interleave
into an invalid lifecycle.
"""

from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.core.exceptions import BusinessRuleViolation, Conflict
from apps.events.models import EventStatus, RequirementStatus
from apps.invitations.models import Invitation, InvitationStatus
from apps.quotations.models import (
    ItemKind,
    Quotation,
    QuotationItem,
    QuotationRevision,
    QuotationStatus,
    RevisionStatus,
)

UNSET = object()


def _lock_quotation_for_provider(quotation_id, actor) -> Quotation:
    quotation = (
        Quotation.objects.select_for_update()
        .select_related("event")
        .filter(id=quotation_id)
        .first()
    )
    if quotation is None or quotation.provider_id != actor.id:
        raise PermissionDenied("This quotation is not available to your account.")
    return quotation


@transaction.atomic
def create_quotation(*, provider_user, event) -> Quotation:
    if event.status != EventStatus.SUBMITTED:
        raise BusinessRuleViolation("Only a submitted event can be quoted.")
    if not provider_user.email_verified:
        raise BusinessRuleViolation("Verify your email address before preparing quotations.")
    has_accepted = Invitation.objects.filter(
        event=event, provider=provider_user, status=InvitationStatus.ACCEPTED
    ).exists()
    if not has_accepted:
        raise PermissionDenied("Accept the customer's invitation before preparing a quotation.")

    existing = (
        Quotation.objects.select_for_update()
        .filter(event=event, provider=provider_user)
        .first()
    )
    if existing is not None:
        return existing
    try:
        with transaction.atomic():
            return Quotation.objects.create(event=event, provider=provider_user)
    except IntegrityError as exc:  # pragma: no cover - guarded by the row lock above
        raise Conflict("A quotation already exists for this event.") from exc


@transaction.atomic
def create_draft_revision(*, quotation_id, actor) -> QuotationRevision:
    quotation = _lock_quotation_for_provider(quotation_id, actor)
    if quotation.status != QuotationStatus.OPEN:
        raise Conflict("This quotation has been withdrawn.")
    if quotation.event.status != EventStatus.SUBMITTED:
        raise Conflict("The event is no longer accepting quotations.")
    if quotation.revisions.filter(status=RevisionStatus.DRAFT).exists():
        raise Conflict("A draft revision is already in progress.")
    highest = quotation.revisions.aggregate(highest=Max("revision_number"))["highest"] or 0
    return QuotationRevision.objects.create(
        quotation=quotation, revision_number=highest + 1, status=RevisionStatus.DRAFT
    )


@transaction.atomic
def update_draft_revision(*, revision_id, actor, notes=None, valid_until=UNSET, items=None):
    revision = (
        QuotationRevision.objects.select_for_update()
        .select_related("quotation__event")
        .filter(id=revision_id)
        .first()
    )
    if revision is None or revision.quotation.provider_id != actor.id:
        raise PermissionDenied("This quotation revision is not available to your account.")
    if revision.status != RevisionStatus.DRAFT:
        raise Conflict("Submitted quotation revisions cannot be edited.")

    if notes is not None:
        revision.notes = notes
    if valid_until is not UNSET:
        revision.valid_until = valid_until
    revision.save()

    if items is not None:
        event = revision.quotation.event
        requirement_map = {
            requirement.id: requirement
            for requirement in event.requirements.filter(
                id__in=[item["requirement_id"] for item in items]
            )
        }
        seen = set()
        for item in items:
            requirement = requirement_map.get(item["requirement_id"])
            if requirement is None:
                raise ValidationError(
                    {"items": f"Requirement {item['requirement_id']} is not part of this event."}
                )
            if requirement.id in seen:
                raise ValidationError(
                    {"items": "Each requirement may appear only once per revision."}
                )
            seen.add(requirement.id)
            if requirement.status != RequirementStatus.OPEN:
                raise Conflict(f"Requirement '{requirement.title}' is no longer open.")
        revision.items.all().delete()
        QuotationItem.objects.bulk_create(
            [
                QuotationItem(
                    revision=revision,
                    requirement=requirement_map[item["requirement_id"]],
                    kind=item.get("kind", ItemKind.LINE),
                    package_key=item.get("package_key") or "",
                    title=item["title"],
                    description=item.get("description", ""),
                    amount_paise=item["amount_paise"],
                    position=position,
                )
                for position, item in enumerate(items)
            ]
        )
    return revision


@transaction.atomic
def submit_revision(*, revision_id, actor) -> QuotationRevision:
    revision = (
        QuotationRevision.objects.select_for_update().filter(id=revision_id).first()
    )
    if revision is None:
        raise PermissionDenied("This quotation revision is not available to your account.")
    quotation = _lock_quotation_for_provider(revision.quotation_id, actor)
    if quotation.status != QuotationStatus.OPEN:
        raise Conflict("This quotation has been withdrawn.")
    if revision.status != RevisionStatus.DRAFT:
        raise Conflict("Only a draft revision can be submitted.")

    items = list(revision.items.select_related("requirement"))
    if not items:
        raise ValidationError({"items": "Add at least one priced item before submitting."})

    today = timezone.localdate()
    if revision.valid_until is None:
        raise ValidationError(
            {"valid_until": "Set the date this quotation remains valid until."}
        )
    if revision.valid_until < today:
        raise ValidationError({"valid_until": "The validity date cannot be in the past."})
    if revision.valid_until > today + timedelta(days=settings.QUOTATION_MAX_VALIDITY_DAYS):
        raise ValidationError(
            {
                "valid_until": "A quotation cannot remain valid for more than "
                f"{settings.QUOTATION_MAX_VALIDITY_DAYS} days."
            }
        )

    requirement_ids = {item.requirement_id for item in items}
    open_ids = set(
        quotation.event.requirements.filter(
            id__in=requirement_ids, status=RequirementStatus.OPEN
        ).values_list("id", flat=True)
    )
    if open_ids != requirement_ids:
        raise Conflict("This quotation prices a requirement that is no longer open.")

    now = timezone.now()
    total = sum(item.amount_paise for item in items)

    # Only lifecycle status changes on previously submitted revisions; their quoted
    # content is never touched (and the trigger would reject it if we tried).
    QuotationRevision.objects.filter(
        quotation=quotation, status=RevisionStatus.SUBMITTED
    ).update(status=RevisionStatus.SUPERSEDED, superseded_at=now, updated_at=now)

    revision.status = RevisionStatus.SUBMITTED
    revision.total_paise = total
    revision.submitted_at = now
    revision.save(update_fields=["status", "total_paise", "submitted_at", "updated_at"])

    quotation.current_revision = revision
    quotation.save(update_fields=["current_revision", "updated_at"])
    return revision


@transaction.atomic
def withdraw_quotation(*, quotation_id, actor) -> Quotation:
    quotation = _lock_quotation_for_provider(quotation_id, actor)
    if quotation.status == QuotationStatus.WITHDRAWN:
        return quotation
    now = timezone.now()
    quotation.revisions.filter(status=RevisionStatus.DRAFT).delete()
    quotation.revisions.filter(status=RevisionStatus.SUBMITTED).update(
        status=RevisionStatus.WITHDRAWN, updated_at=now
    )
    quotation.status = QuotationStatus.WITHDRAWN
    quotation.current_revision = None
    quotation.save(update_fields=["status", "current_revision", "updated_at"])
    return quotation


def mark_expired_revisions(queryset=None) -> int:
    """Lazily expire submitted revisions whose validity date has passed."""
    queryset = queryset if queryset is not None else QuotationRevision.objects.all()
    return queryset.filter(
        status=RevisionStatus.SUBMITTED, valid_until__lt=timezone.localdate()
    ).update(status=RevisionStatus.EXPIRED, updated_at=timezone.now())
