"""Provider discovery and eligibility.

D-012: match normalized PIN codes and localities with city/state context. A PIN
code prefix is never treated as evidence of wider coverage, so an exact PIN match
or an explicit city+state coverage row is required. Ranking is deterministic and
has no paid or inferred boost.
"""

from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.core.validators import normalize_pin_code, normalize_text
from apps.events.models import Event, EventStatus, RequirementStatus
from apps.invitations.models import Invitation, InvitationStatus
from apps.profiles.models import ProviderCoverage, ProviderProfile


def matching_coverage_q(*, pin_code: str = "", city: str = "", state: str = "", prefix: str = ""):
    """Exact PIN match, or the same city and state when both are supplied.

    ``prefix`` lets the same rules run against the ``ProviderCoverage`` table
    directly (no prefix) or through ``ProviderProfile.coverage`` (``coverage__``).
    """
    pin_code = normalize_pin_code(pin_code)
    city = normalize_text(city)
    state = normalize_text(state)
    if not any([pin_code, city]):
        raise ValidationError(
            {"location": "Provide a PIN code or a city to search for providers."}
        )
    query = Q(**{f"{prefix}pin_code": pin_code}) if pin_code else Q(pk__in=[])
    if city and state:
        query |= Q(**{f"{prefix}city__iexact": city, f"{prefix}state__iexact": state})
    elif city:
        # Without a state, a city name alone is ambiguous; require the state.
        raise ValidationError(
            {"state": "Provide the state along with the city so coverage is unambiguous."}
        )
    return query


def discover_providers(
    *,
    category: str = "",
    pin_code: str = "",
    city: str = "",
    state: str = "",
    locality: str = "",
    requester=None,
    event=None,
):
    """Return candidate providers with their matching coverage rows.

    A provider is eligible when they have an active service in the requested
    category, a completed profile, and explicit coverage covering the location.
    """
    if not category and event is not None:
        categories = list(
            event.requirements.filter(status="OPEN")
            .exclude(category__code="other")
            .values_list("category__code", flat=True)
        )
        if not categories:
            return []
        category_list = categories
    else:
        category_list = [normalize_text(category).lower()] if category else []

    if event is not None:
        pin_code = pin_code or event.pin_code
        city = city or event.city
        state = state or event.state

    coverage_query = matching_coverage_q(pin_code=pin_code, city=city, state=state, prefix="coverage__")

    providers = (
        ProviderProfile.objects.filter(
            user__is_active=True,
            completed_at__isnull=False,
            services__is_active=True,
            services__category__is_active=True,
            coverage__isnull=False,
        )
        .filter(coverage_query)
        .distinct()
    )
    if category_list:
        providers = providers.filter(services__category__code__in=category_list).distinct()
    if requester is not None:
        providers = providers.exclude(user=requester)

    providers = providers.select_related("user").prefetch_related("services__category", "coverage")
    providers = providers.order_by("display_name")

    results = []
    for provider in providers:
        locations = [
            coverage
            for coverage in provider.coverage.all()
            if _coverage_matches(coverage, pin_code=pin_code, city=city, state=state)
        ]
        exact_pin = any(
            normalize_pin_code(location.pin_code) == normalize_pin_code(pin_code)
            for location in locations
        ) if pin_code else False
        results.append({"provider": provider, "locations": locations, "exact_pin": exact_pin})

    if event is not None:
        invited_ids = set(
            Invitation.objects.filter(
                event=event,
                status__in=[InvitationStatus.PENDING, InvitationStatus.ACCEPTED],
            ).values_list("provider_id", flat=True)
        )
        for item in results:
            item["already_invited"] = item["provider"].user_id in invited_ids
    else:
        for item in results:
            item["already_invited"] = False

    # Exact PIN coverage outranks a city-level match; ties break on display name.
    results.sort(key=lambda item: (not item["exact_pin"], item["provider"].display_name.lower()))
    return results


def _coverage_matches(coverage: ProviderCoverage, *, pin_code: str, city: str, state: str) -> bool:
    pin = normalize_pin_code(pin_code)
    if pin and normalize_pin_code(coverage.pin_code) == pin:
        return True
    return bool(
        city
        and coverage.city.lower() == normalize_text(city).lower()
        and (not state or coverage.state.lower() == normalize_text(state).lower())
    )


def provider_covers_location(provider: ProviderProfile, *, pin_code: str, city: str, state: str) -> bool:
    """Eligibility gate reused when an invitation is created."""
    if hasattr(provider, "_prefetched_objects_cache") and "coverage" in provider._prefetched_objects_cache:
        return any(
            _coverage_matches(c, pin_code=pin_code, city=city, state=state)
            for c in provider.coverage.all()
        )
    pin = normalize_pin_code(pin_code)
    return provider.coverage.filter(matching_coverage_q(pin_code=pin, city=city, state=state)).exists()


def get_completed_provider(user) -> ProviderProfile | None:
    """The profile a provider account acts through, once onboarding is complete."""
    return (
        ProviderProfile.objects.filter(user=user, completed_at__isnull=False)
        .prefetch_related("services__category", "coverage")
        .first()
    )


def provider_is_eligible_for_event(user, event) -> bool:
    """Can this provider independently quote this public request?

    Eligibility is category plus explicit location coverage. It is deliberately
    independent of an invitation so a worker can quote a matched public request;
    accepting an invitation is not a prerequisite for marketplace participation.
    """
    if event.status != EventStatus.SUBMITTED:
        return False
    provider = get_completed_provider(user)
    if provider is None:
        return False
    categories = set(provider.declared_categories()) - {"other"}
    if not categories:
        return False
    if not event.requirements.filter(
        status=RequirementStatus.OPEN, category__code__in=categories
    ).exclude(category__code="other").exists():
        return False
    return provider_covers_location(
        provider, pin_code=event.pin_code, city=event.city, state=event.state
    )


def provider_opportunities(user) -> list[dict]:
    """Open public requests matched to a provider's services and coverage.

    The payload intentionally omits the customer's identity, phone, venue name,
    venue address and PIN code. Those are disclosed only through the existing
    invitation/commitment flow.
    """
    provider = get_completed_provider(user)
    if provider is None:
        return []
    categories = set(provider.declared_categories()) - {"other"}
    if not categories:
        return []

    events = list(
        Event.objects.filter(
            status=EventStatus.SUBMITTED,
            event_date__gte=timezone.localdate(),
            requirements__status=RequirementStatus.OPEN,
            requirements__category__code__in=categories,
        )
        .prefetch_related("requirements__category")
        .distinct()
        .order_by("event_date", "created_at")
    )
    events = [
        event
        for event in events
        if provider_covers_location(
            provider, pin_code=event.pin_code, city=event.city, state=event.state
        )
    ]
    if not events:
        return []

    from apps.quotations.models import Quotation

    invitations = {}
    for invitation in Invitation.objects.filter(
        provider=user, event__in=events
    ).order_by("created_at"):
        current = invitations.get(invitation.event_id)
        if current is None or invitation.status == InvitationStatus.ACCEPTED:
            invitations[invitation.event_id] = invitation
    quotations = {
        quotation.event_id: quotation
        for quotation in Quotation.objects.filter(provider=user, event__in=events).select_related(
            "current_revision"
        )
    }

    opportunities = []
    for event in events:
        invitation = invitations.get(event.id)
        quotation = quotations.get(event.id)
        requirements = [
            requirement
            for requirement in event.requirements.all()
            if requirement.status == RequirementStatus.OPEN
            and requirement.category.code in categories
        ]
        opportunities.append(
            {
                "id": event.id,
                "name": event.name,
                "event_type": event.event_type,
                "description": event.description or "",
                "event_date": event.event_date,
                "end_date": event.end_date,
                "start_time": event.start_time,
                "end_time": event.end_time,
                "guest_count": event.guest_count,
                "locality": event.locality,
                "city": event.city,
                "state": event.state,
                "pin_code": event.pin_code or "",
                "requirements": [
                    {
                        "id": requirement.id,
                        "title": requirement.title,
                        "category": requirement.category.code,
                        "category_name": requirement.category.name,
                        "custom_service_name": getattr(requirement, "custom_service_name", "") or "",
                        "description": requirement.description,
                        "instructions": requirement.instructions,
                        "budget_paise": requirement.budget_paise,
                        "status": requirement.status,
                    }
                    for requirement in requirements
                ],
                "invitation_status": invitation.status if invitation else None,
                "already_quoted": quotation is not None,
                "quotation_status": quotation.status if quotation else None,
                "latest_revision_status": (
                    quotation.current_revision.status
                    if quotation and quotation.current_revision
                    else None
                ),
            }
        )
    return opportunities
