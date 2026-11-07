"""Business rules for event requests and requirement edits."""

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.core.exceptions import BusinessRuleViolation, Conflict
from apps.events.models import Event, EventStatus, RequirementStatus
from apps.invitations.models import Invitation, InvitationStatus


def get_owned_event(*, actor, event_id: str) -> Event:
    """Fetch an event the actor owns, or fail without revealing foreign events."""
    event = (
        Event.objects.filter(id=event_id, customer=actor)
        .prefetch_related("requirements__category", "attachments")
        .first()
    )
    if event is None:
        raise PermissionDenied("This event is not available to your account.")
    return event


def has_active_invitations(event: Event) -> bool:
    return Invitation.objects.filter(event=event, status=InvitationStatus.PENDING).exists()


def ensure_event_editable(event: Event) -> None:
    """Drafts are freely editable. A submitted request is editable only while no
    provider invitation is outstanding, so quoted terms cannot silently change."""
    if event.status == EventStatus.DRAFT:
        return
    if event.status == EventStatus.SUBMITTED:
        if has_active_invitations(event):
            raise Conflict(
                "This event has outstanding invitations and can no longer be edited. "
                "Withdraw it and create a new request."
            )
        return
    raise Conflict("Only draft or submitted events can be edited.")


def validate_submittable(event: Event) -> None:
    if not event.requirements.filter(status=RequirementStatus.OPEN).exists():
        raise ValidationError({"requirements": "Add at least one service requirement."})
    if event.event_date < timezone.localdate():
        raise ValidationError({"event_date": "The event date cannot be in the past."})
    if event.status not in {EventStatus.DRAFT, EventStatus.SUBMITTED}:
        raise Conflict("Only a draft event can be submitted.")


@transaction.atomic
def submit_event(event: Event) -> Event:
    event = Event.objects.select_for_update().get(pk=event.pk)
    if event.status == EventStatus.SUBMITTED:
        return event
    validate_submittable(event)
    event.status = EventStatus.SUBMITTED
    event.submitted_at = event.submitted_at or timezone.now()
    event.save(update_fields=["status", "submitted_at", "updated_at"])
    return event


@transaction.atomic
def withdraw_event(event: Event) -> Event:
    event = Event.objects.select_for_update().get(pk=event.pk)
    if event.status != EventStatus.SUBMITTED:
        raise BusinessRuleViolation("Only a submitted event can be withdrawn.")
    event.status = EventStatus.WITHDRAWN
    event.withdrawn_at = timezone.now()
    event.save(update_fields=["status", "withdrawn_at", "updated_at"])
    # Outstanding invitations can no longer be acted on.
    Invitation.objects.filter(event=event, status=InvitationStatus.PENDING).update(
        status=InvitationStatus.WITHDRAWN,
        responded_at=timezone.now(),
        updated_at=timezone.now(),
    )
    return event


@transaction.atomic
def create_event_with_requirements(*, customer, payload: dict, requirements: list[dict]):
    """Create an event and its requirements from API-shaped input.

    Serializers validate and emit category *codes*; the model needs category rows, so
    the lookup happens here, once, inside the same transaction.
    """
    from apps.events.models import ServiceRequirement
    from apps.profiles.models import ServiceCategory

    submit = payload.pop("submit", False)
    event = Event.objects.create(customer=customer, **payload)

    codes = [requirement["category"] for requirement in requirements]
    categories = {
        category.code: category
        for category in ServiceCategory.objects.filter(code__in=codes, is_active=True)
    }
    unknown = sorted(set(codes) - set(categories))
    if unknown:
        raise ValidationError(
            {"requirements": f"Unknown service categories: {', '.join(unknown)}."}
        )

    for position, requirement in enumerate(requirements):
        data = dict(requirement)
        category = categories[data.pop("category")]
        ServiceRequirement.objects.create(
            event=event, position=position, category=category, **data
        )
    if submit:
        event = submit_event(event)
    return event
