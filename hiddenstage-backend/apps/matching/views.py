from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsCustomer, IsProvider
from apps.events.services import get_owned_event
from apps.matching.serializers import (
    DiscoveryQuerySerializer,
    ProviderDetailSerializer,
    ProviderMatchSerializer,
    ProviderOpportunitySerializer,
)
from apps.matching.services import discover_providers, provider_opportunities
from apps.profiles.models import ProviderProfile


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
    """Provider card for a signed-in customer. Contact detail is limited."""

    permission_classes = [IsCustomer]

    @extend_schema(responses={200: ProviderDetailSerializer})
    def get(self, request, pk):
        provider = (
            ProviderProfile.objects.filter(id=pk, user__is_active=True)
            .prefetch_related("services__category", "coverage")
            .first()
        )
        if provider is None or provider.completed_at is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        payload = {
            "id": provider.id,
            "display_name": provider.display_name,
            "kind": provider.kind,
            "description": provider.description,
            "contact": provider.contact,
            "verification_status": provider.verification_status,
            "categories": provider.declared_categories(),
            "coverage": provider.coverage.all(),
        }
        return Response(ProviderDetailSerializer(payload).data)
