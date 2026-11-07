"""Invitation business rules."""

from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.core.exceptions import BusinessRuleViolation, Conflict
from apps.events.models import EventStatus, RequirementStatus
from apps.invitations.models import Invitation, InvitationStatus
from apps.matching.services import provider_covers_location
from apps.profiles.models import ProviderProfile


def expire_stale_invitations(queryset=None) -> int:
    queryset = queryset if queryset is not None else Invitation.objects.all()
    return queryset.filter(
        status=InvitationStatus.PENDING, expires_at__lte=timezone.now()
    ).update(status=InvitationStatus.EXPIRED, updated_at=timezone.now())


@transaction.atomic
def create_invitation(*, customer, event, provider_user, requirement=None, message="") -> Invitation:
    if event.customer_id != customer.id:
        raise PermissionDenied("This event is not available to your account.")
    if event.status != EventStatus.SUBMITTED:
        raise BusinessRuleViolation("Only a submitted event can be invited to providers.")
    if not customer.email_verified:
        raise BusinessRuleViolation("Verify your email address before inviting providers.")
    if provider_user.id == customer.id:
        raise ValidationError({"provider_id": "You cannot invite yourself."})
    if not provider_user.is_provider or not provider_user.is_active:
        raise ValidationError({"provider_id": "This account cannot receive invitations."})

    provider = (
        ProviderProfile.objects.filter(user=provider_user, completed_at__isnull=False)
        .prefetch_related("services__category")
        .first()
    )
    if provider is None:
        raise ValidationError({"provider_id": "This provider has not completed a profile."})
    if not provider_covers_location(
        provider, pin_code=event.pin_code, city=event.city, state=event.state
    ):
        raise ValidationError(
            {"provider_id": "This provider does not cover the event location."}
        )

    if requirement is not None:
        if requirement.event_id != event.id:
            raise ValidationError({"requirement_id": "This requirement belongs to another event."})
        if requirement.status != RequirementStatus.OPEN:
            raise Conflict("This requirement is no longer open.")
        offered = set(provider.declared_categories())
        if requirement.category.code not in offered:
            raise ValidationError(
                {"provider_id": "This provider does not offer the requested service."}
            )
    else:
        open_categories = set(
            event.requirements.filter(status=RequirementStatus.OPEN).values_list(
                "category__code", flat=True
            )
        )
        if not (open_categories & set(provider.declared_categories())):
            raise ValidationError(
                {"provider_id": "This provider does not offer any requested service."}
            )

    expire_stale_invitations(
        Invitation.objects.filter(event=event, provider=provider_user)
    )
    try:
        with transaction.atomic():
            return Invitation.objects.create(
                event=event,
                provider=provider_user,
                requirement=requirement,
                message=message,
                created_by=customer,
                status=InvitationStatus.PENDING,
                expires_at=timezone.now() + timedelta(days=settings.INVITATION_TTL_DAYS),
            )
    except IntegrityError as exc:
        raise Conflict("An active invitation already exists for this provider.") from exc


@transaction.atomic
def respond_to_invitation(*, invitation_id, provider_user, accept: bool) -> Invitation:
    invitation = (
        Invitation.objects.select_for_update()
        .filter(id=invitation_id, provider=provider_user)
        .select_related("event")
        .first()
    )
    if invitation is None:
        raise PermissionDenied("This invitation is not available to your account.")
    if invitation.status != InvitationStatus.PENDING:
        raise Conflict(f"This invitation is already {invitation.status.lower()}.")
    if invitation.expires_at <= timezone.now():
        invitation.status = InvitationStatus.EXPIRED
        invitation.save(update_fields=["status", "updated_at"])
        raise Conflict("This invitation has expired.")
    if invitation.event.status != EventStatus.SUBMITTED:
        raise Conflict("The event is no longer accepting responses.")

    invitation.status = (
        InvitationStatus.ACCEPTED if accept else InvitationStatus.DECLINED
    )
    invitation.responded_at = timezone.now()
    invitation.save(update_fields=["status", "responded_at", "updated_at"])
    return invitation


@transaction.atomic
def withdraw_invitation(*, invitation_id, customer, event) -> Invitation:
    invitation = (
        Invitation.objects.select_for_update().filter(id=invitation_id, event=event).first()
    )
    if invitation is None:
        raise PermissionDenied("This invitation is not available to your account.")
    if invitation.status != InvitationStatus.PENDING:
        raise Conflict("Only a pending invitation can be withdrawn.")
    invitation.status = InvitationStatus.WITHDRAWN
    invitation.responded_at = timezone.now()
    invitation.save(update_fields=["status", "responded_at", "updated_at"])
    return invitation
