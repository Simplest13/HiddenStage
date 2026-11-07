from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.commitments.models import Commitment
from apps.commitments.serializers import (
    AcceptanceRequestSerializer,
    CommitmentDetailSerializer,
    CommitmentSerializer,
    ReleaseRequestSerializer,
)
from apps.commitments.services import accept_quotation, release_commitment
from apps.core.permissions import IsCustomer, IsCustomerOrProvider

COMMITMENT_QUERYSET = Commitment.objects.select_related(
    "event", "provider", "customer", "revision"
).prefetch_related("lines__requirement")


def _commitment_detail(pk):
    return Commitment.objects.select_related(
        "event", "provider", "customer", "revision"
    ).prefetch_related("lines__requirement", "audit_entries__actor").get(pk=pk)


class QuotationAcceptanceView(APIView):
    """Customer accepts a submitted revision, in whole packages or single lines."""

    permission_classes = [IsCustomer]

    @extend_schema(request=AcceptanceRequestSerializer, responses={201: CommitmentSerializer})
    def post(self, request, pk):
        payload = AcceptanceRequestSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        commitment = accept_quotation(
            actor=request.user,
            quotation_id=pk,
            revision_id=payload.validated_data["revision_id"],
            package_keys=payload.validated_data["package_keys"],
            requirement_ids=payload.validated_data["requirement_ids"],
        )
        return Response(
            CommitmentDetailSerializer(_commitment_detail(commitment.pk)).data,
            status=status.HTTP_201_CREATED,
        )


class CustomerCommitmentListView(generics.ListAPIView):
    permission_classes = [IsCustomer]
    serializer_class = CommitmentSerializer

    def get_queryset(self):
        return COMMITMENT_QUERYSET.filter(customer=self.request.user)


class ProviderCommitmentListView(generics.ListAPIView):
    permission_classes = [IsCustomerOrProvider]
    serializer_class = CommitmentSerializer

    def get_queryset(self):
        return COMMITMENT_QUERYSET.filter(provider=self.request.user)


class CommitmentDetailView(APIView):
    permission_classes = [IsCustomerOrProvider]

    def get_commitment(self, request, pk):
        commitment = _commitment_detail(pk)
        user = request.user
        if (
            commitment.customer_id != user.id
            and commitment.provider_id != user.id
            and not user.is_staff
        ):
            raise PermissionDenied("This commitment is not available to your account.")
        return commitment

    @extend_schema(responses={200: CommitmentDetailSerializer})
    def get(self, request, pk):
        return Response(CommitmentDetailSerializer(self.get_commitment(request, pk)).data)


class CommitmentReleaseView(APIView):
    permission_classes = [IsCustomerOrProvider]

    @extend_schema(request=ReleaseRequestSerializer, responses={200: CommitmentDetailSerializer})
    def post(self, request, pk):
        payload = ReleaseRequestSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        commitment = release_commitment(
            actor=request.user, commitment_id=pk, reason=payload.validated_data.get("reason", "")
        )
        return Response(
            CommitmentDetailSerializer(_commitment_detail(commitment.pk)).data
        )
