"""Network and assignment use cases.

All transitions are backend-controlled. Availability is checked across every
Manager's assignments for the Worker, and acceptance locks the Worker row before
rechecking so two concurrent acceptances cannot create an overlap.
"""

from datetime import datetime, timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.models import User
from apps.accounts.policy import verification_satisfied
from apps.commitments.models import Commitment, CommitmentStatus
from apps.core.exceptions import BusinessRuleViolation, Conflict
from apps.profiles.models import ProviderKind, ProviderProfile
from apps.network.models import (
    AssignmentStatus,
    AssociationStatus,
    InvitationInitiator,
    NetworkAssociation,
    NetworkInvitation,
    NetworkInvitationStatus,
    WorkerAssignment,
)

BLOCKING_ASSIGNMENT_STATUSES = (
    AssignmentStatus.ACCEPTED,
    AssignmentStatus.IN_PROGRESS,
)
CANCELLABLE_ASSIGNMENT_STATUSES = (
    AssignmentStatus.DRAFT,
    AssignmentStatus.SENT,
    AssignmentStatus.ACCEPTED,
    AssignmentStatus.IN_PROGRESS,
)


def _profile_for(user):
    if hasattr(user, "_cached_provider_profile"):
        return user._cached_provider_profile
    profile = (
        ProviderProfile.objects.filter(user=user)
        .prefetch_related("services__category", "coverage")
        .first()
    )
    if profile:
        user._cached_provider_profile = profile
    return profile


def require_manager(user) -> ProviderProfile:
    if not user or not user.is_authenticated or not user.is_provider:
        raise PermissionDenied("Only Manager accounts can perform this action.")
    if hasattr(user, "_cached_manager_profile"):
        return user._cached_manager_profile
    if hasattr(user, "_cached_provider_profile"):
        profile = user._cached_provider_profile
    else:
        profile = ProviderProfile.objects.filter(user=user).first()
        if profile:
            user._cached_provider_profile = profile
    if profile is None or profile.kind != ProviderKind.MANAGER:
        raise PermissionDenied("Only Manager accounts can perform this action.")
    user._cached_manager_profile = profile
    return profile


def require_worker(user) -> ProviderProfile:
    if not user or not user.is_authenticated or not user.is_provider:
        raise PermissionDenied("Only Worker accounts can perform this action.")
    if hasattr(user, "_cached_worker_profile"):
        return user._cached_worker_profile
    if hasattr(user, "_cached_provider_profile"):
        profile = user._cached_provider_profile
    else:
        profile = ProviderProfile.objects.filter(user=user).first()
        if profile:
            user._cached_provider_profile = profile
    if profile is None or profile.kind != ProviderKind.WORKER:
        raise PermissionDenied("Only Worker accounts can perform this action.")
    user._cached_worker_profile = profile
    return profile


def _require_verified(user):
    if not verification_satisfied(user):
        raise BusinessRuleViolation("Verify your email address before using the network.")


def expire_stale_network_invitations(queryset=None) -> int:
    queryset = queryset if queryset is not None else NetworkInvitation.objects.all()
    return queryset.filter(
        status=NetworkInvitationStatus.PENDING, expires_at__lte=timezone.now()
    ).update(status=NetworkInvitationStatus.EXPIRED, updated_at=timezone.now())


def discover_workers(
    *, manager, category: str = "", city: str = "", pin_code: str = "", locality: str = ""
) -> list[dict]:
    """Completed, active Workers with optional explicit service/location filters."""
    require_manager(manager)
    workers = (
        ProviderProfile.objects.filter(
            kind=ProviderKind.WORKER,
            completed_at__isnull=False,
            user__is_active=True,
            services__is_active=True,
            services__category__is_active=True,
        )
        .select_related("user")
        .prefetch_related("services__category", "coverage")
        .distinct()
    )
    if category:
        workers = workers.filter(services__category__code=category).distinct()
    if pin_code:
        workers = workers.filter(coverage__pin_code=pin_code).distinct()
    if city:
        workers = workers.filter(coverage__city__iexact=city).distinct()
    if locality:
        workers = workers.filter(coverage__locality__iexact=locality).distinct()

    workers = list(workers.order_by("display_name"))
    worker_ids = [worker.user_id for worker in workers]
    associations = {
        association.worker_id: association
        for association in NetworkAssociation.objects.filter(
            manager=manager, worker_id__in=worker_ids, status=AssociationStatus.ACTIVE
        )
    }
    invitations = {
        invitation.worker_id: invitation
        for invitation in NetworkInvitation.objects.filter(
            manager=manager,
            worker_id__in=worker_ids,
            status=NetworkInvitationStatus.PENDING,
        )
    }
    results = []
    for worker in workers:
        association = associations.get(worker.user_id)
        invitation = invitations.get(worker.user_id)
        results.append(
            {
                "provider": worker,
                "association": association,
                "invitation": invitation,
                "relationship": (
                    "ASSOCIATED" if association else "INVITED" if invitation else "NONE"
                ),
            }
        )
    return results


def send_network_invitation(*, manager, worker_id, message: str = "") -> NetworkInvitation:
    require_manager(manager)
    _require_verified(manager)
    worker = User.objects.filter(id=worker_id, is_active=True).first()
    if worker is None:
        raise ValidationError({"worker": "Unknown Worker account."})
    if worker.id == manager.id:
        raise ValidationError({"worker": "You cannot invite yourself."})
    profile = _profile_for(worker)
    if (
        profile is None
        or profile.kind == ProviderKind.MANAGER
        or profile.completed_at is None
    ):
        raise ValidationError({"worker": "This account is not a completed professional profile."})
    if NetworkAssociation.objects.filter(
        manager=manager, worker=worker, status=AssociationStatus.ACTIVE
    ).exists():
        raise Conflict("This professional is already in your network.")

    expire_stale_network_invitations(
        NetworkInvitation.objects.filter(manager=manager, worker=worker)
    )
    try:
        with transaction.atomic():
            return NetworkInvitation.objects.create(
                manager=manager,
                worker=worker,
                message=message,
                status=NetworkInvitationStatus.PENDING,
                initiated_by=InvitationInitiator.MANAGER_INVITES,
                expires_at=timezone.now()
                + timedelta(days=getattr(settings, "NETWORK_INVITATION_TTL_DAYS", 14)),
            )
    except IntegrityError as exc:
        raise Conflict("An active invitation already exists for this professional.") from exc


def request_network_association(*, professional, manager_id, message: str = "") -> NetworkInvitation:
    if not professional or not professional.is_authenticated or not professional.is_provider:
        raise PermissionDenied("Only providers can request network associations.")
    _require_verified(professional)
    manager = User.objects.filter(id=manager_id, is_active=True).first()
    if manager is None:
        raise ValidationError({"manager": "Unknown Manager account."})
    if manager.id == professional.id:
        raise ValidationError({"manager": "You cannot request association with yourself."})
    profile = _profile_for(manager)
    if profile is None or profile.kind != ProviderKind.MANAGER:
        raise ValidationError({"manager": "Target account is not an active Manager profile."})
    if NetworkAssociation.objects.filter(
        manager=manager, worker=professional, status=AssociationStatus.ACTIVE
    ).exists():
        raise Conflict("You are already associated with this Manager.")

    expire_stale_network_invitations(
        NetworkInvitation.objects.filter(manager=manager, worker=professional)
    )
    try:
        with transaction.atomic():
            return NetworkInvitation.objects.create(
                manager=manager,
                worker=professional,
                message=message,
                status=NetworkInvitationStatus.PENDING,
                initiated_by=InvitationInitiator.PROFESSIONAL_REQUESTS,
                expires_at=timezone.now()
                + timedelta(days=getattr(settings, "NETWORK_INVITATION_TTL_DAYS", 14)),
            )
    except IntegrityError as exc:
        raise Conflict("An active request already exists with this Manager.") from exc


@transaction.atomic
def respond_to_network_invitation(
    *, invitation_id, actor=None, worker=None, accept: bool
) -> tuple[NetworkInvitation, NetworkAssociation | None]:
    if actor is None and worker is not None:
        actor = worker
    if actor is None:
        raise ValidationError("Actor or worker must be provided.")

    invitation = (
        NetworkInvitation.objects.select_for_update()
        .filter(id=invitation_id)
        .first()
    )
    if invitation is None:
        raise PermissionDenied("This network invitation is not available to your account.")

    # Validate who is authorized to respond
    if invitation.initiated_by == InvitationInitiator.PROFESSIONAL_REQUESTS:
        if invitation.manager_id != actor.id:
            raise PermissionDenied("Only the recipient Manager can respond to this request.")
    else:
        if invitation.worker_id != actor.id:
            raise PermissionDenied("Only the recipient professional can respond to this invitation.")

    if invitation.status != NetworkInvitationStatus.PENDING:
        raise Conflict(f"This invitation is already {invitation.status.lower()}.")
    if invitation.expires_at <= timezone.now():
        invitation.status = NetworkInvitationStatus.EXPIRED
        invitation.save(update_fields=["status", "updated_at"])
        raise Conflict("This network invitation has expired.")

    invitation.responded_at = timezone.now()
    association = None
    if accept:
        _require_verified(actor)
        existing = NetworkAssociation.objects.filter(
            manager_id=invitation.manager_id,
            worker_id=invitation.worker_id,
            status=AssociationStatus.ACTIVE,
        ).first()
        if existing is not None:
            raise Conflict("This network association is already active.")
        try:
            association = NetworkAssociation.objects.create(
                manager_id=invitation.manager_id, worker_id=invitation.worker_id
            )
        except IntegrityError as exc:
            raise Conflict("This network association already exists.") from exc
        invitation.status = NetworkInvitationStatus.ACCEPTED
    else:
        invitation.status = NetworkInvitationStatus.DECLINED
    invitation.save(update_fields=["status", "responded_at", "updated_at"])
    return invitation, association


@transaction.atomic
def cancel_network_invitation(
    *, invitation_id, actor=None, manager=None
) -> NetworkInvitation:
    if actor is None and manager is not None:
        actor = manager
    if actor is None:
        raise ValidationError("Actor or manager must be provided.")

    invitation = (
        NetworkInvitation.objects.select_for_update()
        .filter(id=invitation_id)
        .first()
    )
    if invitation is None:
        raise PermissionDenied("This network invitation is not available to your account.")
    if invitation.initiated_by == InvitationInitiator.PROFESSIONAL_REQUESTS:
        if invitation.worker_id != actor.id:
            raise PermissionDenied("Only the requesting professional can cancel this request.")
    else:
        if invitation.manager_id != actor.id:
            raise PermissionDenied("Only the inviting Manager can cancel this invitation.")

    if invitation.status != NetworkInvitationStatus.PENDING:
        raise Conflict("Only a pending invitation can be cancelled.")
    invitation.status = NetworkInvitationStatus.CANCELLED
    invitation.responded_at = timezone.now()
    invitation.save(update_fields=["status", "responded_at", "updated_at"])
    return invitation


def list_network(*, actor, include_history: bool = False) -> list[dict]:
    profile = _profile_for(actor)
    if profile is None:
        raise PermissionDenied("This account does not have a provider profile.")
    statuses = (
        [AssociationStatus.ACTIVE, AssociationStatus.ENDED]
        if include_history
        else [AssociationStatus.ACTIVE]
    )
    field = "manager" if profile.kind == ProviderKind.MANAGER else "worker"
    counterpart = "worker" if profile.kind == ProviderKind.MANAGER else "manager"
    associations = list(
        NetworkAssociation.objects.filter(status__in=statuses, **{field: actor})
        .select_related(counterpart)
        .order_by("-associated_at")
    )
    if not associations:
        return []

    from django.db.models import Count

    counterpart_user_ids = [getattr(assoc, f"{counterpart}_id") for assoc in associations]
    profiles = {
        p.user_id: p
        for p in ProviderProfile.objects.filter(user_id__in=counterpart_user_ids).prefetch_related(
            "services__category", "coverage"
        )
    }

    active_field = "worker_id" if profile.kind == ProviderKind.MANAGER else "manager_id"
    active_counts = {
        item[active_field]: item["cnt"]
        for item in WorkerAssignment.objects.filter(
            **{field: actor},
            status__in=[AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS],
        )
        .values(active_field)
        .annotate(cnt=Count("id"))
    }
    completed_counts = {
        item[active_field]: item["cnt"]
        for item in WorkerAssignment.objects.filter(
            **{field: actor},
            status=AssignmentStatus.COMPLETED,
        )
        .values(active_field)
        .annotate(cnt=Count("id"))
    }

    results = []
    for association in associations:
        other_user_id = getattr(association, f"{counterpart}_id")
        other_profile = profiles.get(other_user_id)
        if other_profile is None:
            continue
        results.append(
            {
                "association": association,
                "profile": other_profile,
                "active_assignments": active_counts.get(other_user_id, 0),
                "completed_assignments": completed_counts.get(other_user_id, 0),
            }
        )
    return results


@transaction.atomic
def end_network_association(*, association_id, actor, reason: str = "") -> NetworkAssociation:
    association = (
        NetworkAssociation.objects.select_for_update().filter(id=association_id).first()
    )
    if association is None or actor.id not in (association.manager_id, association.worker_id):
        raise PermissionDenied("This network association is not available to your account.")
    if association.status != AssociationStatus.ACTIVE:
        raise Conflict("This association has already ended.")
    association.status = AssociationStatus.ENDED
    association.ended_at = timezone.now()
    association.ended_by = actor
    association.ended_reason = reason
    association.save(
        update_fields=["status", "ended_at", "ended_by", "ended_reason"]
    )
    # Accepted assignments and independent commitments remain untouched.
    return association


def assignment_conflicts(
    *, worker, event_date, start_time, end_time, exclude_id=None
) -> list[WorkerAssignment]:
    queryset = WorkerAssignment.objects.filter(
        worker=worker,
        event_date=event_date,
        status__in=BLOCKING_ASSIGNMENT_STATUSES,
        start_time__lt=end_time,
        end_time__gt=start_time,
    ).select_related("manager")
    if exclude_id is not None:
        queryset = queryset.exclude(id=exclude_id)
    return list(queryset)


def check_availability(
    *, manager, worker_id, event_date, start_time, end_time
) -> dict:
    """Privacy-safe check. Never returns another Manager's event details."""
    require_manager(manager)
    worker = User.objects.filter(id=worker_id, is_active=True).first()
    if worker is None:
        raise ValidationError({"worker": "Unknown Worker account."})
    profile = _profile_for(worker)
    if profile is None or profile.kind != ProviderKind.WORKER:
        raise ValidationError({"worker": "This account is not a Worker."})
    if end_time <= start_time:
        raise ValidationError({"end_time": "The end time must be after the start time."})
    conflicts = assignment_conflicts(
        worker=worker, event_date=event_date, start_time=start_time, end_time=end_time
    )
    return {
        "available": not conflicts,
        "conflict": bool(conflicts),
        "event_date": event_date,
        "start_time": start_time,
        "end_time": end_time,
    }


@transaction.atomic
def create_assignment(
    *,
    manager,
    worker_id,
    commitment_id,
    role,
    task_description,
    start_time,
    end_time,
    reporting_time=None,
    location="",
    instructions="",
    compensation_paise=None,
    response_deadline=None,
    send=True,
    replaces_id=None,
) -> WorkerAssignment:
    require_manager(manager)
    _require_verified(manager)
    worker = User.objects.filter(id=worker_id, is_active=True).first()
    if worker is None:
        raise ValidationError({"worker": "Unknown Worker account."})
    worker_profile = _profile_for(worker)
    if (
        worker_profile is None
        or worker_profile.kind != ProviderKind.WORKER
        or worker_profile.completed_at is None
    ):
        raise ValidationError({"worker": "This account is not a completed Worker profile."})
    if not NetworkAssociation.objects.filter(
        manager=manager, worker=worker, status=AssociationStatus.ACTIVE
    ).exists():
        raise PermissionDenied("You can only assign Workers in your active network.")

    commitment = (
        Commitment.objects.select_for_update()
        .select_related("event")
        .filter(id=commitment_id, provider=manager)
        .first()
    )
    if commitment is None:
        raise PermissionDenied("This commitment is not available to your account.")
    if commitment.status != CommitmentStatus.ACTIVE:
        raise Conflict("Only an active commitment can receive Worker assignments.")
    if end_time <= start_time:
        raise ValidationError({"end_time": "The end time must be after the start time."})
    if response_deadline is not None and response_deadline <= timezone.now():
        raise ValidationError({"response_deadline": "The response deadline must be in the future."})

    replaces = None
    if replaces_id is not None:
        replaces = (
            WorkerAssignment.objects.select_for_update()
            .filter(id=replaces_id, manager=manager, commitment=commitment)
            .first()
        )
        if replaces is None:
            raise PermissionDenied("The assignment being replaced is not available.")
        if replaces.status not in (AssignmentStatus.DECLINED, AssignmentStatus.CANCELLED):
            raise Conflict("Only a declined or cancelled assignment can be replaced.")
        if hasattr(replaces, "replacement"):
            raise Conflict("This assignment has already been replaced.")

    assignment = WorkerAssignment.objects.create(
        manager=manager,
        worker=worker,
        commitment=commitment,
        replaces=replaces,
        role=role,
        task_description=task_description,
        instructions=instructions,
        event_date=commitment.event.event_date,
        start_time=start_time,
        end_time=end_time,
        reporting_time=reporting_time,
        location=location,
        compensation_paise=compensation_paise,
        response_deadline=response_deadline,
        status=AssignmentStatus.SENT if send else AssignmentStatus.DRAFT,
    )
    if replaces is not None:
        replaces.status = AssignmentStatus.REASSIGNED
        replaces.save(update_fields=["status", "updated_at"])
    return assignment


def list_assignments(*, actor, commitment_id=None, status=None) -> list[WorkerAssignment]:
    profile = _profile_for(actor)
    if profile is None:
        raise PermissionDenied("This account does not have a provider profile.")
    field = "manager" if profile.kind == ProviderKind.MANAGER else "worker"
    queryset = (
        WorkerAssignment.objects.filter(**{field: actor})
        .select_related("commitment__event", "manager", "worker", "replaces")
        .prefetch_related("manager__provider_profile", "worker__provider_profile")
    )
    if commitment_id:
        queryset = queryset.filter(commitment_id=commitment_id)
    if status:
        if status not in AssignmentStatus.values:
            raise ValidationError({"status": "Unknown assignment status."})
        queryset = queryset.filter(status=status)
    return list(queryset)


def get_assignment(*, actor, assignment_id) -> WorkerAssignment:
    assignment = (
        WorkerAssignment.objects.select_related(
            "commitment__event", "manager", "worker", "replaces"
        )
        .prefetch_related("manager__provider_profile", "worker__provider_profile")
        .filter(id=assignment_id)
        .first()
    )
    if assignment is None or actor.id not in (assignment.manager_id, assignment.worker_id):
        raise PermissionDenied("This assignment is not available to your account.")
    return assignment


@transaction.atomic
def respond_to_assignment(
    *, worker, assignment_id, accept: bool, reason: str = ""
) -> WorkerAssignment:
    require_worker(worker)
    # Locking the Worker serialises acceptances across every Manager.
    User.objects.select_for_update().get(pk=worker.pk)
    assignment = (
        WorkerAssignment.objects.select_for_update()
        .filter(id=assignment_id, worker=worker)
        .first()
    )
    if assignment is None:
        raise PermissionDenied("This assignment is not available to your account.")
    if assignment.status != AssignmentStatus.SENT:
        raise Conflict(f"This assignment is already {assignment.status.lower()}.")
    if not NetworkAssociation.objects.filter(
        manager_id=assignment.manager_id,
        worker=worker,
        status=AssociationStatus.ACTIVE,
    ).exists():
        raise Conflict("The Manager is no longer in your network.")
    if assignment.response_deadline is not None and assignment.response_deadline <= timezone.now():
        raise Conflict("The response deadline for this assignment has passed.")

    assignment.responded_at = timezone.now()
    if accept:
        conflicts = assignment_conflicts(
            worker=worker,
            event_date=assignment.event_date,
            start_time=assignment.start_time,
            end_time=assignment.end_time,
            exclude_id=assignment.id,
        )
        if conflicts:
            raise Conflict("This assignment overlaps another accepted assignment.")
        assignment.status = AssignmentStatus.ACCEPTED
        assignment.accepted_at = timezone.now()
    else:
        assignment.status = AssignmentStatus.DECLINED
        assignment.response_note = reason
    assignment.save(
        update_fields=["status", "responded_at", "response_note", "accepted_at", "updated_at"]
    )
    return assignment


@transaction.atomic
def start_assignment(*, worker, assignment_id) -> WorkerAssignment:
    require_worker(worker)
    assignment = (
        WorkerAssignment.objects.select_for_update()
        .filter(id=assignment_id, worker=worker)
        .first()
    )
    if assignment is None:
        raise PermissionDenied("This assignment is not available to your account.")
    if assignment.status != AssignmentStatus.ACCEPTED:
        raise Conflict("Only an accepted assignment can be started.")
    assignment.status = AssignmentStatus.IN_PROGRESS
    assignment.started_at = timezone.now()
    assignment.save(update_fields=["status", "started_at", "updated_at"])
    return assignment


@transaction.atomic
def complete_assignment(
    *, worker, assignment_id, completion_notes=""
) -> WorkerAssignment:
    require_worker(worker)
    assignment = (
        WorkerAssignment.objects.select_for_update()
        .filter(id=assignment_id, worker=worker)
        .first()
    )
    if assignment is None:
        raise PermissionDenied("This assignment is not available to your account.")
    if assignment.status != AssignmentStatus.IN_PROGRESS:
        raise Conflict("Only an in-progress assignment can be completed.")
    assignment.status = AssignmentStatus.COMPLETED
    assignment.completed_at = timezone.now()
    assignment.completion_notes = completion_notes
    assignment.save(
        update_fields=["status", "completed_at", "completion_notes", "updated_at"]
    )
    return assignment


@transaction.atomic
def cancel_assignment(*, manager, assignment_id, reason: str = "") -> WorkerAssignment:
    require_manager(manager)
    assignment = (
        WorkerAssignment.objects.select_for_update()
        .filter(id=assignment_id, manager=manager)
        .first()
    )
    if assignment is None:
        raise PermissionDenied("This assignment is not available to your account.")
    if assignment.status not in CANCELLABLE_ASSIGNMENT_STATUSES:
        raise Conflict(f"This assignment cannot be cancelled from {assignment.status.lower()}.")
    previous_status = assignment.status
    assignment.status = AssignmentStatus.CANCELLED
    assignment.cancelled_at = timezone.now()
    assignment.cancellation_reason = reason
    if assignment.responded_at is None and previous_status != AssignmentStatus.DRAFT:
        assignment.responded_at = timezone.now()
    assignment.save(
        update_fields=[
            "status",
            "cancelled_at",
            "cancellation_reason",
            "responded_at",
            "updated_at",
        ]
    )
    return assignment


def parse_time(value):
    """Small helper for tests and availability callers."""
    if isinstance(value, time):
        return value
    if isinstance(value, datetime):
        return value.time()
    return time.fromisoformat(str(value))
