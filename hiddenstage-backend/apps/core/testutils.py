"""Shared test fixtures.

These build real rows through the same models the API uses, so tests exercise the
database constraints rather than mocks.
"""

from datetime import time, timedelta

from django.utils import timezone

from apps.accounts.models import User, UserRole
from apps.events.models import Event, EventStatus, ServiceRequirement
from apps.events.services import create_event_with_requirements
from apps.profiles.models import (
    CustomerProfile,
    ProviderCoverage,
    ProviderProfile,
    ProviderService,
    ServiceCategory,
)

PASSWORD = "HiddenStage!2026"

CATEGORY_CODES = (
    "spaces",
    "food-and-drink",
    "music-and-performance",
    "photography",
    "videography",
    "decor-and-styling",
    "dj-and-sound",
    "event-hosting",
    "planning",
)


def ensure_categories():
    """Re-seed the taxonomy after a TransactionTestCase flush removes migrated rows."""
    for order, code in enumerate(CATEGORY_CODES):
        ServiceCategory.objects.get_or_create(
            code=code,
            defaults={"name": code.replace("-", " ").title(), "sort_order": order},
        )


def make_user(email, role=UserRole.CUSTOMER, verified=True):
    user = User.objects.create_user(
        email=email,
        password=PASSWORD,
        full_name="Test " + role.title(),
        role=role,
    )
    if verified:
        user.mark_email_verified()
    return user


def make_customer(email="customer@example.com", complete=True, verified=True):
    user = make_user(email, UserRole.CUSTOMER, verified=verified)
    if complete:
        CustomerProfile.objects.create(
            user=user,
            pin_code="560001",
            locality="MG Road",
            city="Bengaluru",
            state="Karnataka",
        )
    return user


def make_provider(
    email="provider@example.com",
    categories=("photography",),
    pin_code="560001",
    city="Bengaluru",
    verified=True,
):
    ensure_categories()
    user = make_user(email, UserRole.PROVIDER, verified=verified)
    profile = ProviderProfile.objects.create(
        user=user, display_name="Test Studio", contact="+919812345678"
    )
    for code in categories:
        ProviderService.objects.create(
            provider=profile, category=ServiceCategory.objects.get(code=code)
        )
    ProviderCoverage.objects.create(
        provider=profile,
        pin_code=pin_code,
        locality="MG Road",
        city=city,
        state="Karnataka",
    )
    profile.refresh_completion()
    return user


def make_event(customer, category="photography", submit=True, **overrides):
    ensure_categories()
    today = timezone.localdate()
    payload = {
        "name": "Rooftop dinner",
        "event_type": "Private dinner",
        "event_date": today + timedelta(days=30),
        "start_time": time(18, 0),
        "end_time": time(22, 0),
        "guest_count": 40,
        "pin_code": "560001",
        "locality": "MG Road",
        "city": "Bengaluru",
        "state": "Karnataka",
    }
    payload.update(overrides)
    requirements = [{"category": category, "title": "Coverage for the evening"}]
    return create_event_with_requirements(
        customer=customer, payload={**payload, "submit": submit}, requirements=requirements
    )


def invite_and_accept(event, provider, requirement=None):
    """Shortcut through the invitation rules so quotation tests start from a legal state."""
    from apps.invitations.models import Invitation, InvitationStatus

    requirement = requirement or event.requirements.first()
    return Invitation.objects.create(
        event=event,
        provider=provider,
        requirement=requirement,
        status=InvitationStatus.ACCEPTED,
        expires_at=timezone.now() + timedelta(days=7),
        responded_at=timezone.now(),
        created_by=event.customer,
    )


def submitted_quotation(provider, event, lines=None):
    """Create a quotation with one fully priced, submitted revision."""
    from apps.quotations.services import (
        create_draft_revision,
        create_quotation,
        submit_revision,
        update_draft_revision,
    )

    requirement = event.requirements.first()
    quotation = create_quotation(provider_user=provider, event=event)
    revision = create_draft_revision(quotation_id=quotation.id, actor=provider)
    update_draft_revision(
        revision_id=revision.id,
        actor=provider,
        valid_until=timezone.localdate() + timedelta(days=7),
        items=lines
        or [
            {
                "requirement_id": requirement.id,
                "title": "Evening coverage",
                "amount_paise": 1_500_000,
            }
        ],
    )
    submit_revision(revision_id=revision.id, actor=provider)
    quotation.refresh_from_db()
    return quotation


def event_status(event):
    return EventStatus(event.status)
