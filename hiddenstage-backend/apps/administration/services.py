"""Administrative verification, moderation, configuration and audit use cases."""

from django.core.cache import cache
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from apps.accounts.models import User, UserRole
from apps.administration.models import AdminAuditAction, AdminAuditLog
from apps.commitments.models import Commitment, CommitmentAudit, CommitmentStatus
from apps.commitments.services import release_commitment
from apps.core.exceptions import BusinessRuleViolation
from apps.events.models import Event, EventStatus
from apps.events.services import withdraw_event
from apps.invitations.models import Invitation
from apps.network.models import (
    AssignmentStatus,
    AssociationStatus,
    NetworkAssociation,
    WorkerAssignment,
)
from apps.profiles.models import (
    Business,
    ProviderKind,
    ProviderProfile,
    ServiceCategory,
    VerificationStatus,
)
from apps.quotations.models import Quotation, QuotationStatus, RevisionStatus


def _log(
    *,
    actor,
    action: str,
    target_type: str,
    target_id,
    target_label: str = "",
    note: str = "",
    metadata: dict | None = None,
) -> AdminAuditLog:
    return AdminAuditLog.objects.create(
        actor=actor,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        target_label=target_label[:255],
        note=note.strip(),
        metadata=metadata or {},
    )


def get_overview_metrics() -> dict:
    user_counts = User.objects.aggregate(
        total=Count("id"),
        active=Count("id", filter=Q(is_active=True)),
        customers=Count("id", filter=Q(role=UserRole.CUSTOMER)),
        providers=Count("id", filter=Q(role=UserRole.PROVIDER)),
        staff=Count("id", filter=Q(is_staff=True)),
    )
    provider_counts = ProviderProfile.objects.aggregate(
        total=Count("id"),
        verified=Count("id", filter=Q(verification_status=VerificationStatus.VERIFIED)),
        featured=Count("id", filter=Q(is_featured=True)),
        pending=Count("id", filter=Q(verification_status=VerificationStatus.PENDING)),
        unverified=Count("id", filter=Q(verification_status=VerificationStatus.UNVERIFIED)),
        rejected=Count("id", filter=Q(verification_status=VerificationStatus.REJECTED)),
        managers=Count("id", filter=Q(kind=ProviderKind.MANAGER)),
        workers=Count("id", filter=Q(kind=ProviderKind.WORKER)),
    )
    event_counts = Event.objects.aggregate(
        total=Count("id"),
        draft=Count("id", filter=Q(status=EventStatus.DRAFT)),
        submitted=Count("id", filter=Q(status=EventStatus.SUBMITTED)),
        withdrawn=Count("id", filter=Q(status=EventStatus.WITHDRAWN)),
        closed=Count("id", filter=Q(status=EventStatus.CLOSED)),
    )
    quotation_counts = Quotation.objects.aggregate(
        total=Count("id"),
        open=Count("id", filter=Q(status=QuotationStatus.OPEN)),
        submitted=Count(
            "id",
            filter=Q(
                status=QuotationStatus.OPEN,
                current_revision__status=RevisionStatus.SUBMITTED,
            ),
        ),
        withdrawn=Count("id", filter=Q(status=QuotationStatus.WITHDRAWN)),
    )
    commitment_counts = Commitment.objects.aggregate(
        total=Count("id"),
        active=Count("id", filter=Q(status=CommitmentStatus.ACTIVE)),
        released=Count("id", filter=Q(status=CommitmentStatus.RELEASED)),
        active_total_paise=Sum("total_paise", filter=Q(status=CommitmentStatus.ACTIVE)),
    )
    business_counts = Business.objects.aggregate(
        total=Count("id"),
        active=Count("id", filter=Q(is_active=True)),
    )
    category_counts = ServiceCategory.objects.aggregate(
        total=Count("id"),
        active=Count("id", filter=Q(is_active=True)),
    )
    network_counts = {
        "active_associations": NetworkAssociation.objects.filter(
            status=AssociationStatus.ACTIVE
        ).count(),
        "active_assignments": WorkerAssignment.objects.filter(
            status__in=[
                AssignmentStatus.SENT,
                AssignmentStatus.ACCEPTED,
                AssignmentStatus.IN_PROGRESS,
            ]
        ).count(),
        "completed_assignments": WorkerAssignment.objects.filter(
            status=AssignmentStatus.COMPLETED
        ).count(),
    }

    return {
        "users": user_counts,
        "providers": provider_counts,
        "businesses": business_counts,
        "events": event_counts,
        "invitations_total": Invitation.objects.count(),
        "quotations": quotation_counts,
        "commitments": {
            **commitment_counts,
            "active_total_paise": commitment_counts["active_total_paise"] or 0,
        },
        "network": network_counts,
        "categories": category_counts,
    }


@transaction.atomic
def update_user_admin(
    *,
    actor,
    user_id,
    is_active=None,
    is_staff=None,
    mark_email_verified: bool = False,
    note: str = "",
) -> User:
    target = User.objects.select_for_update().filter(id=user_id).first()
    if target is None:
        raise NotFound("User not found.")

    changes = {}
    update_fields = []

    if is_active is not None and is_active != target.is_active:
        if target.id == actor.id and not is_active:
            raise BusinessRuleViolation("You cannot deactivate your own administrator account.")
        if (
            target.is_superuser
            and not is_active
            and User.objects.filter(is_superuser=True, is_active=True)
            .exclude(id=target.id)
            .count()
            == 0
        ):
            raise BusinessRuleViolation("Cannot deactivate the last active superuser.")
        changes["is_active"] = {"from": target.is_active, "to": is_active}
        target.is_active = is_active
        update_fields.append("is_active")

    if is_staff is not None and is_staff != target.is_staff:
        if target.id == actor.id and not is_staff:
            raise BusinessRuleViolation("You cannot revoke your own administrator access.")
        if target.is_superuser and not is_staff:
            raise BusinessRuleViolation("Revoke superuser status in Django admin before removing staff access.")
        changes["is_staff"] = {"from": target.is_staff, "to": is_staff}
        target.is_staff = is_staff
        update_fields.append("is_staff")

    if mark_email_verified and target.email_verified_at is None:
        now = timezone.now()
        changes["email_verified"] = {"from": False, "to": True}
        target.email_verified_at = now
        update_fields.append("email_verified_at")

    if not update_fields:
        return target

    target.save(update_fields=update_fields)
    _log(
        actor=actor,
        action=AdminAuditAction.USER_UPDATED,
        target_type="user",
        target_id=target.id,
        target_label=target.email,
        note=note,
        metadata={"changes": changes},
    )
    return target


@transaction.atomic
def set_provider_verification(
    *, actor, provider_id, verification_status: str, note: str = ""
) -> ProviderProfile:
    if verification_status not in VerificationStatus.values:
        raise ValidationError({"verification_status": "Unknown verification status."})

    profile = (
        ProviderProfile.objects.select_for_update(of=("self",))
        .select_related("user", "business")
        .filter(id=provider_id)
        .first()
    )
    if profile is None:
        raise NotFound("Provider profile not found.")

    previous = profile.verification_status
    profile.verification_status = verification_status
    profile.save(update_fields=["verification_status", "updated_at"])

    _log(
        actor=actor,
        action=AdminAuditAction.PROVIDER_VERIFICATION_UPDATED,
        target_type="provider_profile",
        target_id=profile.id,
        target_label=f"{profile.display_name} ({profile.user.email})",
        note=note,
        metadata={"from": previous, "to": verification_status, "kind": profile.kind},
    )
    return profile


@transaction.atomic
def set_provider_featured(
    *, actor, provider_id, is_featured: bool, note: str = ""
) -> ProviderProfile:
    profile = (
        ProviderProfile.objects.select_for_update(of=("self",))
        .select_related("user", "business")
        .filter(id=provider_id)
        .first()
    )
    if profile is None:
        raise NotFound("Provider profile not found.")

    previous = profile.is_featured
    profile.is_featured = is_featured
    profile.save(update_fields=["is_featured", "updated_at"])

    _log(
        actor=actor,
        action=AdminAuditAction.PROVIDER_FEATURED_UPDATED,
        target_type="provider_profile",
        target_id=profile.id,
        target_label=f"{profile.display_name} ({profile.user.email})",
        note=note,
        metadata={"from": previous, "to": is_featured, "kind": profile.kind},
    )
    cache.clear()
    return profile


@transaction.atomic
def update_business_admin(
    *, actor, business_id, is_active=None, name=None, city=None, state=None, note: str = ""
) -> Business:
    business = Business.objects.select_for_update().filter(id=business_id).first()
    if business is None:
        raise NotFound("Business not found.")

    changes = {}
    update_fields = []
    for field, value in (("is_active", is_active), ("name", name), ("city", city), ("state", state)):
        if value is not None and getattr(business, field) != value:
            changes[field] = {"from": getattr(business, field), "to": value}
            setattr(business, field, value)
            update_fields.append(field)

    if not update_fields:
        return business

    business.save(update_fields=update_fields)
    _log(
        actor=actor,
        action=AdminAuditAction.BUSINESS_UPDATED,
        target_type="business",
        target_id=business.id,
        target_label=business.name,
        note=note,
        metadata={"changes": changes},
    )
    return business


@transaction.atomic
def withdraw_event_as_admin(*, actor, event_id, reason: str = "") -> Event:
    event = Event.objects.select_for_update().select_related("customer").filter(id=event_id).first()
    if event is None:
        raise NotFound("Event not found.")
    previous_status = event.status
    event = withdraw_event(event)
    _log(
        actor=actor,
        action=AdminAuditAction.EVENT_WITHDRAWN,
        target_type="event",
        target_id=event.id,
        target_label=f"{event.name} ({event.customer.email})",
        note=reason,
        metadata={"from_status": previous_status, "to_status": event.status},
    )
    return event


@transaction.atomic
def release_commitment_as_admin(*, actor, commitment_id, reason: str = "") -> Commitment:
    commitment = release_commitment(actor=actor, commitment_id=commitment_id, reason=reason)
    _log(
        actor=actor,
        action=AdminAuditAction.COMMITMENT_RELEASED,
        target_type="commitment",
        target_id=commitment.id,
        target_label=f"{commitment.event.name} ({commitment.provider.email})",
        note=reason,
        metadata={"total_paise": commitment.total_paise},
    )
    return commitment


@transaction.atomic
def create_category_as_admin(*, actor, data: dict) -> ServiceCategory:
    category = ServiceCategory.objects.create(**data)
    _log(
        actor=actor,
        action=AdminAuditAction.CATEGORY_CREATED,
        target_type="service_category",
        target_id=category.id,
        target_label=f"{category.name} ({category.code})",
        metadata={"code": category.code, "is_active": category.is_active},
    )
    return category


@transaction.atomic
def update_category_as_admin(*, actor, category_id, data: dict) -> ServiceCategory:
    category = ServiceCategory.objects.select_for_update().filter(id=category_id).first()
    if category is None:
        raise NotFound("Service category not found.")

    changes = {}
    update_fields = []
    for field in ("name", "description", "sort_order", "is_active"):
        if field in data and getattr(category, field) != data[field]:
            changes[field] = {"from": getattr(category, field), "to": data[field]}
            setattr(category, field, data[field])
            update_fields.append(field)

    if not update_fields:
        return category

    category.save(update_fields=update_fields)
    _log(
        actor=actor,
        action=AdminAuditAction.CATEGORY_UPDATED,
        target_type="service_category",
        target_id=category.id,
        target_label=f"{category.name} ({category.code})",
        metadata={"changes": changes},
    )
    return category


def list_unified_audit_entries(*, source: str = "all", query: str = "", limit: int = 100) -> list[dict]:
    """Return newest-first audit entries across AdminAuditLog and CommitmentAudit."""
    entries: list[dict] = []
    q = (query or "").strip().lower()

    if source in {"all", "admin"}:
        admin_qs = AdminAuditLog.objects.select_related("actor").order_by("-created_at")[:limit]
        for row in admin_qs:
            item = {
                "id": str(row.id),
                "source": "admin",
                "action": row.action,
                "actor_email": row.actor.email if row.actor else "",
                "actor_name": row.actor.full_name if row.actor else "System",
                "target_type": row.target_type,
                "target_id": row.target_id,
                "target_label": row.target_label,
                "note": row.note,
                "metadata": row.metadata,
                "created_at": row.created_at,
            }
            if not q or _matches_query(item, q):
                entries.append(item)

    if source in {"all", "commitments"}:
        commit_qs = CommitmentAudit.objects.select_related(
            "actor", "commitment__event", "commitment__provider", "commitment__customer"
        ).order_by("-created_at")[:limit]
        for row in commit_qs:
            item = {
                "id": str(row.id),
                "source": "commitments",
                "action": f"COMMITMENT_{row.action}",
                "actor_email": row.actor.email if row.actor else "",
                "actor_name": row.actor.full_name if row.actor else "System",
                "target_type": "commitment",
                "target_id": str(row.commitment_id),
                "target_label": (
                    f"{row.commitment.event.name} · {row.commitment.provider.email}"
                ),
                "note": row.note,
                "metadata": {
                    "event_id": str(row.commitment.event_id),
                    "customer_email": row.commitment.customer.email,
                    "provider_email": row.commitment.provider.email,
                    "total_paise": row.commitment.total_paise,
                },
                "created_at": row.created_at,
            }
            if not q or _matches_query(item, q):
                entries.append(item)

    entries.sort(key=lambda item: item["created_at"], reverse=True)
    return entries[:limit]


def _matches_query(item: dict, q: str) -> bool:
    haystack = " ".join(
        [
            item["action"],
            item["actor_email"],
            item["actor_name"],
            item["target_type"],
            item["target_label"],
            item["note"],
        ]
    ).lower()
    return q in haystack

