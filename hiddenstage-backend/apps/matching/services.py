"""Provider discovery and eligibility.

D-012: match normalized PIN codes and localities with city/state context. A PIN
code prefix is never treated as evidence of wider coverage, so an exact PIN match
or an explicit city+state coverage row is required. Ranking is deterministic and
has no paid or inferred boost.
"""

from django.db.models import Q
from rest_framework.exceptions import ValidationError

from apps.core.validators import normalize_pin_code, normalize_text
from apps.invitations.models import Invitation, InvitationStatus
from apps.profiles.models import ProviderCoverage, ProviderProfile


def matching_coverage_q(*, pin_code: str = "", city: str = "", state: str = ""):
    """Exact PIN match, or the same city and state when both are supplied."""
    pin_code = normalize_pin_code(pin_code)
    city = normalize_text(city)
    state = normalize_text(state)
    if not any([pin_code, city]):
        raise ValidationError(
            {"location": "Provide a PIN code or a city to search for providers."}
        )
    query = Q(pin_code=pin_code) if pin_code else Q(pk__in=[])
    if city and state:
        query |= Q(city__iexact=city, state__iexact=state)
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
            event.requirements.filter(status="OPEN").values_list("category__code", flat=True)
        )
        if not categories:
            raise ValidationError({"category": "This event has no open requirements."})
        category_list = categories
    else:
        category_list = [normalize_text(category).lower()] if category else []

    if event is not None:
        pin_code = pin_code or event.pin_code
        city = city or event.city
        state = state or event.state

    coverage_query = matching_coverage_q(pin_code=pin_code, city=city, state=state)

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
    pin = normalize_pin_code(pin_code)
    return provider.coverage.filter(matching_coverage_q(pin_code=pin, city=city, state=state)).exists()
