"""Acceptance and release use cases.

Acceptance is the one place where money and obligations become real, so it is the
most defended transaction in the system:

* `select_for_update` on the quotation, its revision, the event's requirements and
  any existing commitment serialises concurrent attempts;
* the selected package/line set is re-validated against the *locked* data, never
  against what the client saw;
* `CommitmentLine.revision_item` is globally unique, so even a lost race surfaces
  as a 409 instead of a duplicate obligation.
"""

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.commitments.models import (
    Commitment,
    CommitmentAction,
    CommitmentAudit,
    CommitmentLine,
    CommitmentStatus,
)
from apps.core.exceptions import BusinessRuleViolation, Conflict
from apps.events.models import EventStatus, RequirementStatus, mark_requirements_committed
from apps.quotations.models import (
    Quotation,
    QuotationRevision,
    QuotationStatus,
    RevisionStatus,
)

RELEASE_REASON_MAX = 1000


def _resolve_selection(revision, package_keys, requirement_ids):
    """Turn a client selection into the exact set of quoted items it commits to.

    Packages are all-or-nothing: naming a package key commits every item carrying
    it. A requirement that belongs to a package can only be accepted with its
    package, never on its own.
    """
    items = list(revision.items.select_related("requirement"))
    if not items:
        raise ValidationError({"detail": "This quotation revision has no priced items."})

    by_package = {}
    for item in items:
        if item.package_key:
            by_package.setdefault(item.package_key, []).append(item)

    unknown_packages = sorted(set(package_keys) - set(by_package))
    if unknown_packages:
        raise ValidationError(
            {"package_keys": f"Unknown package(s): {', '.join(unknown_packages)}."}
        )

    items_by_requirement = {item.requirement_id: item for item in items}
    unknown_requirements = sorted(
        {req_id for req_id in requirement_ids if req_id not in items_by_requirement},
        key=str,
    )
    if unknown_requirements:
        raise ValidationError(
            {
                "requirement_ids": "These requirements are not priced by this revision: "
                + ", ".join(str(req_id) for req_id in unknown_requirements)
                + "."
            }
        )

    packaged_selected_directly = [
        str(items_by_requirement[req_id].package_key)
        for req_id in requirement_ids
        if items_by_requirement[req_id].package_key
    ]
    if packaged_selected_directly:
        raise ValidationError(
            {
                "requirement_ids": "These requirements belong to packages and can only be "
                "accepted as a whole package: "
                + ", ".join(sorted(set(packaged_selected_directly)))
                + "."
            }
        )

    selected = {item.id: item for item in items if item.package_key in set(package_keys)}
    selected.update(
        {
            items_by_requirement[req_id].id: items_by_requirement[req_id]
            for req_id in requirement_ids
        }
    )
    if not selected:
        raise ValidationError("Select at least one package or service line to accept.")
    return list(selected.values())


@transaction.atomic
def accept_quotation(
    *,
    actor,
    quotation_id,
    revision_id,
    package_keys=(),
    requirement_ids=(),
) -> Commitment:
    quotation = (
        Quotation.objects.select_for_update()
        .select_related("event")
        .filter(id=quotation_id)
        .first()
    )
    if quotation is None or quotation.event.customer_id != actor.id:
        raise PermissionDenied("This quotation is not available to your account.")
    if not actor.email_verified:
        raise BusinessRuleViolation("Verify your email address before accepting a quotation.")

    event = quotation.event
    if event.status != EventStatus.SUBMITTED:
        raise Conflict("Only an open event request can be accepted.")
    if quotation.status != QuotationStatus.OPEN:
        raise Conflict("This quotation has been withdrawn.")

    if Commitment.objects.filter(quotation=quotation).exists():
        raise Conflict("You have already accepted a quotation for this provider.")

    revision = (
        QuotationRevision.objects.select_for_update()
        .filter(id=revision_id, quotation=quotation)
        .first()
    )
    if revision is None:
        raise ValidationError({"revision_id": "This revision does not belong to the quotation."})
    today = timezone.localdate()
    if revision.status == RevisionStatus.EXPIRED or (
        revision.status == RevisionStatus.SUBMITTED
        and revision.valid_until is not None
        and revision.valid_until < today
    ):
        raise Conflict("This quotation has expired. Ask the provider for a new revision.")
    if revision.status != RevisionStatus.SUBMITTED:
        raise Conflict("Only a submitted quotation revision can be accepted.")

    selected = _resolve_selection(
        revision, list(package_keys), list(requirement_ids)
    )

    requirement_ids_selected = {item.requirement_id for item in selected}
    locked_open_ids = set(
        event.requirements.select_for_update()
        .filter(id__in=requirement_ids_selected, status=RequirementStatus.OPEN)
        .values_list("id", flat=True)
    )
    if locked_open_ids != requirement_ids_selected:
        raise Conflict(
            "One or more requirements in this quotation are no longer open, so this "
            "selection cannot be accepted."
        )

    total = sum(item.amount_paise for item in selected)
    now = timezone.now()
    try:
        with transaction.atomic():
            commitment = Commitment.objects.create(
                event=event,
                customer=actor,
                provider_id=quotation.provider_id,
                quotation=quotation,
                revision=revision,
                total_paise=total,
                accepted_at=now,
            )
            CommitmentLine.objects.bulk_create(
                [
                    CommitmentLine(
                        commitment=commitment,
                        revision_item=item,
                        requirement_id=item.requirement_id,
                        package_key=item.package_key,
                        title=item.title,
                        amount_paise=item.amount_paise,
                    )
                    for item in selected
                ]
            )
    except IntegrityError as exc:
        # Lost a race against another acceptance for the same quoted line.
        raise Conflict("This quotation has already been accepted.") from exc

    CommitmentAudit.objects.create(
        commitment=commitment,
        action=CommitmentAction.ACCEPTED,
        actor=actor,
        note=f"Accepted revision {revision.revision_number} "
        f"({len(selected)} line(s), {total} paise).",
    )
    mark_requirements_committed(event, requirement_ids_selected)
    return commitment


@transaction.atomic
def release_commitment(*, actor, commitment_id, reason: str = "") -> Commitment:
    commitment = (
        Commitment.objects.select_for_update().filter(id=commitment_id).first()
    )
    if commitment is None:
        raise PermissionDenied("This commitment is not available to your account.")
    if commitment.customer_id != actor.id and not actor.is_staff:
        raise PermissionDenied("Only the customer who made this commitment can release it.")
    if commitment.status == CommitmentStatus.RELEASED:
        raise Conflict("This commitment has already been released.")
    if len(reason) > RELEASE_REASON_MAX:
        raise ValidationError({"reason": "Keep the release reason under 1000 characters."})

    commitment.status = CommitmentStatus.RELEASED
    commitment.released_at = timezone.now()
    commitment.released_by = actor
    commitment.release_reason = reason
    commitment.save(
        update_fields=["status", "released_at", "released_by", "release_reason", "updated_at"]
    )
    CommitmentAudit.objects.create(
        commitment=commitment,
        action=CommitmentAction.RELEASED,
        actor=actor,
        note=reason,
    )
    # Requirements stay COMMITTED: re-opening a requirement to OPEN after a release is
    # an unresolved product decision (see docs/UNRESOLVED_DECISIONS.md A-09).
    return commitment
