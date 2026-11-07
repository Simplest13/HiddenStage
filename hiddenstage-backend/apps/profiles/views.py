from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsCustomer, IsProvider
from apps.profiles.models import CustomerProfile, ProviderCoverage, ProviderProfile, ProviderService, ServiceCategory
from apps.profiles.serializers import (
    CustomerProfileSerializer,
    ProviderCoverageSerializer,
    ProviderProfileSerializer,
    ProviderServiceSerializer,
    ServiceCategorySerializer,
)


class ServiceCategoryListView(generics.ListAPIView):
    """Public taxonomy used by event requirements and provider onboarding."""

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = ServiceCategorySerializer
    pagination_class = None
    queryset = ServiceCategory.objects.filter(is_active=True)


class CustomerProfileView(APIView):
    permission_classes = [IsCustomer]

    @extend_schema(responses={200: CustomerProfileSerializer})
    def get(self, request):
        profile = CustomerProfile.objects.filter(user=request.user).first()
        if profile is None:
            return Response(None)
        return Response(CustomerProfileSerializer(profile).data)

    @extend_schema(request=CustomerProfileSerializer, responses={200: CustomerProfileSerializer})
    def put(self, request):
        return self._upsert(request, partial=False)

    @extend_schema(request=CustomerProfileSerializer, responses={200: CustomerProfileSerializer})
    def patch(self, request):
        return self._upsert(request, partial=True)

    def _upsert(self, request, partial: bool):
        profile = CustomerProfile.objects.filter(user=request.user).first()
        serializer = CustomerProfileSerializer(
            instance=profile, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProviderProfileView(APIView):
    permission_classes = [IsProvider]

    @extend_schema(responses={200: ProviderProfileSerializer})
    def get(self, request):
        profile = (
            ProviderProfile.objects.filter(user=request.user)
            .prefetch_related("services__category", "coverage")
            .first()
        )
        if profile is None:
            return Response(None)
        return Response(ProviderProfileSerializer(profile).data)

    @extend_schema(request=ProviderProfileSerializer, responses={200: ProviderProfileSerializer})
    def put(self, request):
        return self._upsert(request, partial=False)

    @extend_schema(request=ProviderProfileSerializer, responses={200: ProviderProfileSerializer})
    def patch(self, request):
        return self._upsert(request, partial=True)

    def _upsert(self, request, partial: bool):
        profile = ProviderProfile.objects.filter(user=request.user).first()
        if profile is None and partial:
            # A patch cannot create a profile: display_name and contact are required.
            partial = False
        serializer = ProviderProfileSerializer(
            instance=profile, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        profile = serializer.save(user=request.user)
        profile = (
            ProviderProfile.objects.prefetch_related("services__category", "coverage").get(
                pk=profile.pk
            )
        )
        return Response(ProviderProfileSerializer(profile).data)


class ProviderServiceListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsProvider]
    serializer_class = ProviderServiceSerializer
    pagination_class = None

    def get_queryset(self):
        return (
            ProviderService.objects.filter(provider__user=self.request.user)
            .select_related("category")
            .order_by("category__sort_order")
        )

    def perform_create(self, serializer):
        profile, _ = ProviderProfile.objects.get_or_create(
            user=self.request.user,
            defaults={
                "display_name": self.request.user.full_name,
                "contact": self.request.user.phone or self.request.user.email,
            },
        )
        service = serializer.save(provider=profile)
        profile.refresh_completion()
        return service


class ProviderServiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsProvider]
    serializer_class = ProviderServiceSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return ProviderService.objects.filter(
            provider__user=self.request.user
        ).select_related("category")

    def perform_destroy(self, instance):
        profile = instance.provider
        instance.delete()
        profile.refresh_completion()


class ProviderCoverageListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsProvider]
    serializer_class = ProviderCoverageSerializer
    pagination_class = None

    def get_queryset(self):
        return ProviderCoverage.objects.filter(provider__user=self.request.user).order_by(
            "city", "locality", "pin_code"
        )

    def perform_create(self, serializer):
        profile, _ = ProviderProfile.objects.get_or_create(
            user=self.request.user,
            defaults={
                "display_name": self.request.user.full_name,
                "contact": self.request.user.phone or self.request.user.email,
            },
        )
        return serializer.save(provider=profile)


class ProviderCoverageDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsProvider]
    serializer_class = ProviderCoverageSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return ProviderCoverage.objects.filter(provider__user=self.request.user)
