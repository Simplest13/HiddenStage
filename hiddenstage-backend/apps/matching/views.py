import uuid

from django.db.models import Min, Q
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import UserRole
from apps.commitments.models import Commitment
from apps.core.permissions import IsCustomer, IsProvider
from apps.events.services import get_owned_event
from apps.matching.serializers import (
    DiscoveryQuerySerializer,
    OpportunityRequirementSerializer,
    ProviderDetailSerializer,
    ProviderMatchSerializer,
    ProviderOpportunitySerializer,
    PublicDirectoryProviderSerializer,
)
from apps.matching.services import discover_providers, provider_opportunities
from apps.profiles.models import PortfolioItem, ProfileTeamMember, ProviderProfile


class PublicDirectoryView(APIView):
    """Public exploration of verified, published event professionals."""

    permission_classes = [AllowAny]

    @extend_schema(responses={200: PublicDirectoryProviderSerializer(many=True)})
    def get(self, request):
        queryset = (
            ProviderProfile.objects.filter(
                user__is_active=True,
                completed_at__isnull=False,
            )
            .filter(Q(is_public=True) | Q(is_public__isnull=True))
            .select_related("primary_category", "business")
            .prefetch_related("services__category", "coverage")
            .distinct()
        )

        q = request.query_params.get("q", "").strip()
        if q:
            queryset = queryset.filter(
                Q(display_name__icontains=q)
                | Q(headline__icontains=q)
                | Q(description__icontains=q)
                | Q(specializations__icontains=q)
                | Q(talent_category__icontains=q)
            )

        category = request.query_params.get("category", "").strip().lower()
        if category:
            queryset = queryset.filter(
                services__is_active=True,
                services__category__code=category,
            )

        kind = request.query_params.get("kind", "").strip().upper()
        if kind:
            queryset = queryset.filter(kind=kind)

        location = request.query_params.get("location", "").strip().lower()
        if location:
            queryset = queryset.filter(
                Q(coverage__city__icontains=location)
                | Q(coverage__locality__icontains=location)
                | Q(coverage__pin_code__startswith=location)
            )

        queryset = queryset.order_by("display_name")

        results = []
        for p in queryset:
            coverages = list(p.coverage.all())
            first_coverage = coverages[0] if coverages else None
            services = list(p.services.all())
            active_prices = [
                s.base_price_paise
                for s in services
                if s.is_active and s.base_price_paise is not None
            ]
            min_price = min(active_prices) if active_prices else None
            declared_cats = p.declared_categories()
            results.append({
                "id": p.id,
                "display_name": p.display_name,
                "username": p.username,
                "headline": p.headline or "",
                "kind": p.kind,
                "description": p.description,
                "verification_status": p.verification_status,
                "categories": declared_cats,
                "primary_category": p.primary_category.code if p.primary_category else (declared_cats[0] if declared_cats else None),
                "logo": p.logo,
                "cover_image": p.cover_image,
                "city": first_coverage.city if first_coverage else "",
                "state": first_coverage.state if first_coverage else "",
                "locality": first_coverage.locality if first_coverage else "",
                "pin_code": first_coverage.pin_code if first_coverage else "",
                "starting_price_paise": min_price,
                "coverage_count": len(coverages),
                "rating": None,
                "review_count": 0,
            })
        return Response(PublicDirectoryProviderSerializer(results, many=True).data)


class ProviderDiscoveryView(APIView):
    """Customer-only discovery of eligible providers. No ranking is inferred."""

    permission_classes = [IsCustomer]

    @extend_schema(
        parameters=[DiscoveryQuerySerializer],
        responses={200: ProviderMatchSerializer(many=True)},
    )
    def get(self, request):
        params = DiscoveryQuerySerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        event = None
        event_id = request.query_params.get("event")
        if event_id:
            event = get_owned_event(actor=request.user, event_id=event_id)

        matches = discover_providers(
            category=params.validated_data.get("category", ""),
            pin_code=params.validated_data.get("pin_code", ""),
            city=params.validated_data.get("city", ""),
            state=params.validated_data.get("state", ""),
            requester=request.user,
            event=event,
        )
        payload = [
            {
                "id": item["provider"].id,
                "user_id": item["provider"].user_id,
                "display_name": item["provider"].display_name,
                "kind": item["provider"].kind,
                "description": item["provider"].description,
                "verification_status": item["provider"].verification_status,
                "categories": item["provider"].declared_categories(),
                "matching_coverage": item["locations"],
                "exact_pin_match": item["exact_pin"],
                "already_invited": item["already_invited"],
            }
            for item in matches
        ]
        return Response(ProviderMatchSerializer(payload, many=True).data)


class ProviderOpportunityListView(APIView):
    """Matched public requests a provider can quote without an invitation."""

    permission_classes = [IsProvider]

    @extend_schema(responses={200: ProviderOpportunitySerializer(many=True)})
    def get(self, request):
        payload = provider_opportunities(request.user)
        return Response(ProviderOpportunitySerializer(payload, many=True).data)


class ProviderDetailView(APIView):
    """Full public or preview provider profile for customers and visitors."""

    permission_classes = [AllowAny]

    @extend_schema(responses={200: ProviderDetailSerializer})
    def get(self, request, pk):
        is_uuid = False
        try:
            uuid.UUID(str(pk))
            is_uuid = True
        except ValueError:
            pass

        lookup = Q(id=pk) if is_uuid else Q(username__iexact=str(pk).lstrip("@"))
        provider = (
            ProviderProfile.objects.filter(lookup, user__is_active=True)
            .select_related("user", "primary_category", "business")
            .prefetch_related(
                "services__category",
                "coverage",
                "portfolio_items",
            )
            .first()
        )
        if provider is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        is_owner = (
            request.user.is_authenticated
            and (request.user == provider.user or request.user.is_staff)
        )
        if not is_owner:
            if provider.completed_at is None:
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
            if provider.is_public is False:
                return Response({"detail": "This profile is not currently public."}, status=status.HTTP_404_NOT_FOUND)

        portfolio_qs = provider.portfolio_items.all()
        if not is_owner:
            portfolio_qs = portfolio_qs.filter(visibility="PUBLIC")

        team_members_data = []
        if provider.kind == "MANAGER":
            team_members_data = [
                tm.member.full_name or "Team Member"
                for tm in ProfileTeamMember.objects.filter(owner=provider.user, is_active=True).select_related("member")
            ]

        has_matching_commitment = (
            request.user.is_authenticated
            and request.user.role == UserRole.CUSTOMER
            and Commitment.objects.filter(
                provider=provider.user,
                customer=request.user,
            ).exists()
        )

        payload = {
            "id": provider.id,
            "display_name": provider.display_name,
            "username": provider.username,
            "headline": provider.headline,
            "kind": provider.kind,
            "description": provider.description,
            "contact": provider.contact if is_owner or has_matching_commitment else "",
            "verification_status": provider.verification_status,
            "categories": provider.declared_categories(),
            "coverage": provider.coverage.all(),
            "primary_category": provider.primary_category.code if provider.primary_category else (provider.declared_categories()[0] if provider.declared_categories() else None),
            "primary_category_name": provider.primary_category.name if provider.primary_category else None,
            "talent_category": provider.talent_category,
            "specializations": [s.strip() for s in (provider.specializations or "").split(",") if s.strip()] if provider.specializations else [],
            "performance_styles": [s.strip() for s in (provider.performance_styles or "").split(",") if s.strip()] if provider.performance_styles else [],
            "experience_summary": provider.experience_summary,
            "languages": [s.strip() for s in (provider.languages or "").split(",") if s.strip()] if provider.languages else [],
            "website": provider.website,
            "instagram": provider.instagram,
            "youtube": provider.youtube,
            "availability_note": provider.availability_note,
            "logo": provider.logo,
            "cover_image": provider.cover_image,
            "is_public": provider.is_public if provider.is_public is not None else True,
            "completed_at": provider.completed_at,
            "services": [s for s in provider.services.all() if s.is_active],
            "portfolio_items": list(portfolio_qs),
            "team_members": team_members_data,
            "rating": None,
            "review_count": 0,
        }
        return Response(ProviderDetailSerializer(payload).data)
