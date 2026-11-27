"""Deterministic QA fixtures for the isolated audit database.

Run from hiddenstage-backend with DJANGO_ENV_FILE="" and
DJANGO_SETTINGS_MODULE=config.audit_settings. Creates one account per role plus an
event, invitation, submitted quotation, commitment and worker assignment so every
role-specific route can be rendered. Idempotent: existing fixtures are reused.
"""

from __future__ import annotations

import json
import os
from datetime import date, time, timedelta

import sys

sys.path.insert(0, os.getcwd())

import django  # noqa: E402

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.audit_settings")
os.environ.setdefault("DJANGO_ENV_FILE", "")
django.setup()

from django.utils import timezone  # noqa: E402

from apps.accounts.models import User, UserRole  # noqa: E402
from apps.commitments.services import accept_quotation  # noqa: E402
from apps.events.models import Event, EventStatus, ServiceRequirement  # noqa: E402
from apps.invitations.models import Invitation, InvitationStatus  # noqa: E402
from apps.network.services import (  # noqa: E402
    create_assignment,
    respond_to_network_invitation,
    send_network_invitation,
)
from apps.profiles.models import (  # noqa: E402
    CustomerProfile,
    ProviderCoverage,
    ProviderKind,
    ProviderProfile,
    ProviderService,
    ServiceCategory,
)
from apps.quotations.services import (  # noqa: E402
    create_draft_revision,
    create_quotation,
    submit_revision,
    update_draft_revision,
)

PASSWORD = "Qa!7pVn2Lm4x"
OUT = os.path.join(os.path.dirname(__file__), "seed_state.json")


def ensure_user(email, name, role, kind=None, admin=False):
    user, created = User.objects.get_or_create(
        email=email,
        defaults={"username": email.split("@")[0].replace(".", "_"), "full_name": name, "role": role},
    )
    user.username = user.username or email.split("@")[0].replace(".", "_")
    user.full_name = name
    user.role = role
    user.is_staff = admin
    user.is_superuser = admin
    user.set_password(PASSWORD)
    user.save()
    if role == UserRole.CUSTOMER:
        CustomerProfile.objects.update_or_create(
            user=user,
            defaults={
                "pin_code": "560001", "locality": "MG Road", "city": "Bengaluru",
                "state": "Karnataka", "bio": "QA customer fixture",
                "completed_at": timezone.now(),
            },
        )
    if role == UserRole.PROVIDER:
        profile, _ = ProviderProfile.objects.update_or_create(
            user=user,
            defaults={
                "display_name": name,
                "contact": "+919812345678",
                "kind": kind,
                "description": f"{name} fixture profile for the QA audit.",
                "is_public": True,
                "onboarding_step": 4,
                "onboarding_completed_at": timezone.now(),
                "completed_at": timezone.now(),
            },
        )
        return user, profile
    return user, None


def add_offering(profile, code, price=500000):
    category = ServiceCategory.objects.get(code=code)
    ProviderService.objects.get_or_create(
        provider=profile, category=category,
        defaults={"title": category.name, "base_price_paise": price},
    )
    ProviderCoverage.objects.get_or_create(
        provider=profile, pin_code="560001",
        defaults={"locality": "MG Road", "city": "Bengaluru", "state": "Karnataka"},
    )


def main():
    customer, _ = ensure_user("qa.customer@example.test", "QA Customer", UserRole.CUSTOMER)
    manager, manager_profile = ensure_user("qa.manager@example.test", "QA Manager", UserRole.PROVIDER, ProviderKind.MANAGER)
    individual, individual_profile = ensure_user("qa.individual@example.test", "QA Individual", UserRole.PROVIDER, ProviderKind.INDIVIDUAL_SERVICE_PROVIDER)
    associated, associated_profile = ensure_user("qa.associated@example.test", "QA Associated", UserRole.PROVIDER, ProviderKind.ASSOCIATED_SERVICE_PROVIDER)
    talent, talent_profile = ensure_user("qa.talent@example.test", "QA Talent", UserRole.PROVIDER, ProviderKind.TALENT)
    worker, worker_profile = ensure_user("qa.worker@example.test", "QA Worker", UserRole.PROVIDER, ProviderKind.WORKER)
    admin, _ = ensure_user("qa.admin@example.test", "QA Admin", UserRole.CUSTOMER, admin=True)

    for profile in (manager_profile, individual_profile, associated_profile):
        add_offering(profile, "photography")
    add_offering(talent_profile, "music-and-performance")
    add_offering(worker_profile, "photography")

    event, _ = Event.objects.get_or_create(
        customer=customer, name="QA Route Audit Event",
        defaults={
            "event_type": "Private dinner",
            "description": "Fixture event for route rendering.",
            "event_date": date.today() + timedelta(days=30),
            "start_time": time(18, 30), "end_time": time(22, 30),
            "guest_count": 40, "pin_code": "560001", "locality": "MG Road",
            "city": "Bengaluru", "state": "Karnataka", "venue_name": "QA Terrace",
            "status": EventStatus.SUBMITTED, "submitted_at": timezone.now(),
        },
    )
    if not event.requirements.exists():
        for index, (title, description) in enumerate([
            ("Photography", "Cover the evening."),
            ("Photo booth", "Two hours of guest portraits."),
        ]):
            ServiceRequirement.objects.create(
                event=event, category=ServiceCategory.objects.get(code="photography"),
                title=title, description=description, budget_paise=500000, position=index,
            )
    requirements = list(event.requirements.order_by("position"))

    invitation, _ = Invitation.objects.get_or_create(
        event=event, provider=manager, requirement=requirements[0],
        defaults={"message": "Please quote", "status": InvitationStatus.ACCEPTED,
                  "created_by": customer,
                  "expires_at": timezone.now() + timedelta(days=7),
                  "responded_at": timezone.now()},
    )
    if invitation.status != InvitationStatus.ACCEPTED:
        invitation.status = InvitationStatus.ACCEPTED
        invitation.save(update_fields=["status"])

    quotation = create_quotation(provider_user=manager, event=event)
    revision = None
    for existing in quotation.revisions.order_by("-revision_number"):
        if existing.status == "SUBMITTED":
            revision = existing
            break
    if revision is None:
        revision = create_draft_revision(quotation_id=quotation.id, actor=manager)
        update_draft_revision(
            revision_id=revision.id, actor=manager,
            notes="Full evening coverage",
            valid_until=date.today() + timedelta(days=30),
            items=[
                {"requirement_id": requirements[0].id, "kind": "LINE", "title": "Photography", "amount_paise": 750000},
                {"requirement_id": requirements[1].id, "kind": "LINE", "title": "Photo booth", "amount_paise": 250000},
            ],
        )
        revision = submit_revision(revision_id=revision.id, actor=manager)

    commitment = None
    from apps.commitments.models import Commitment
    commitment = Commitment.objects.filter(quotation=quotation, event=event).first()
    if commitment is None:
        commitment = accept_quotation(
            actor=customer, quotation_id=quotation.id, revision_id=revision.id,
            requirement_ids=[requirements[0].id],
        )

    from apps.network.models import NetworkAssociation, NetworkInvitation, WorkerAssignment

    invitation_row = NetworkInvitation.objects.filter(manager=manager, worker=worker).first()
    if invitation_row is None:
        invitation_row = send_network_invitation(manager=manager, worker_id=worker.id, message="Join the crew")
    if not NetworkAssociation.objects.filter(
        manager=manager, worker=worker, status="ACTIVE"
    ).exists():
        if invitation_row.status == "PENDING":
            respond_to_network_invitation(invitation_id=invitation_row.id, actor=worker, accept=True)
        else:
            NetworkAssociation.objects.get_or_create(
                manager=manager, worker=worker, defaults={"status": "ACTIVE"}
            )

    assignment = WorkerAssignment.objects.filter(
        manager=manager, worker=worker, commitment=commitment
    ).first()
    if assignment is None:
        assignment = create_assignment(
            manager=manager, worker_id=worker.id, commitment_id=commitment.id,
            role="Photography assistant", task_description="Assist the lead photographer.",
            start_time=time(18, 0), end_time=time(22, 0), location="QA Terrace",
            instructions="Report to the venue manager.", compensation_paise=150000,
        )

    state = {
        "event_id": str(event.id),
        "quotation_id": str(quotation.id),
        "revision_id": str(revision.id),
        "commitment_id": str(commitment.id),
        "assignment_id": str(assignment.id),
        "requirement_ids": [str(r.id) for r in requirements],
        "provider_profiles": {
            "manager": str(manager_profile.id),
            "individual": str(individual_profile.id),
            "associated": str(associated_profile.id),
            "talent": str(talent_profile.id),
            "worker": str(worker_profile.id),
        },
        "accounts": {
            "customer": customer.email, "manager": manager.email,
            "individual": individual.email, "associated": associated.email,
            "talent": talent.email, "worker": worker.email, "admin": admin.email,
        },
        "password": PASSWORD,
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=2)
    print(json.dumps(state, indent=2))


if __name__ == "__main__":
    main()
