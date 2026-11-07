from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsCustomer, IsProvider
from apps.events.models import Event
from apps.events.services import get_owned_event
from apps.quotations.models import Quotation, QuotationRevision
from apps.quotations.serializers import (
    QuotationCreateSerializer,
    QuotationRevisionSerializer,
    QuotationSerializer,
    RevisionWriteSerializer,
)
from apps.quotations.services import (
    UNSET,
    create_draft_revision,
    create_quotation,
    mark_expired_revisions,
    submit_revision,
    update_draft_revision,
    withdraw_quotation,
)


def _quotation_with_revisions(pk):
    return Quotation.objects.prefetch_related("revisions__items__requirement").get(pk=pk)


def _revision_with_items(pk):
    return QuotationRevision.objects.prefetch_related("items__requirement").get(pk=pk)


class ProviderQuotationListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsProvider]
    serializer_class = QuotationSerializer
    pagination_class = None

    def get_queryset(self):
        mark_expired_revisions(QuotationRevision.objects.filter(provider=self.request.user))
        return (
            Quotation.objects.filter(provider=self.request.user)
            .select_related("event", "provider")
            .prefetch_related("revisions__items__requirement")
            .order_by("-updated_at")
        )

    @extend_schema(request=QuotationCreateSerializer, responses={201: QuotationSerializer})
    def post(self, request):
        payload = QuotationCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        event = Event.objects.filter(id=payload.validated_data["event"]).first()
        if event is None:
            raise ValidationError({"event": "Unknown event."})
        quotation = create_quotation(provider_user=request.user, event=event)
        return Response(
            QuotationSerializer(_quotation_with_revisions(quotation.pk)).data,
            status=status.HTTP_201_CREATED,
        )


class ProviderQuotationDetailView(APIView):
    permission_classes = [IsProvider]

    def get_quotation(self, request, pk):
        quotation = (
            Quotation.objects.filter(id=pk, provider=request.user)
            .prefetch_related("revisions__items__requirement")
            .first()
        )
        if quotation is None:
            raise PermissionDenied("This quotation is not available to your account.")
        return quotation

    @extend_schema(responses={200: QuotationSerializer})
    def get(self, request, pk):
        return Response(QuotationSerializer(self.get_quotation(request, pk)).data)


class ProviderRevisionCreateView(APIView):
    permission_classes = [IsProvider]

    @extend_schema(request=None, responses={201: QuotationRevisionSerializer})
    def post(self, request, pk):
        revision = create_draft_revision(quotation_id=pk, actor=request.user)
        return Response(
            QuotationRevisionSerializer(_revision_with_items(revision.pk)).data,
            status=status.HTTP_201_CREATED,
        )


class ProviderRevisionDetailView(APIView):
    permission_classes = [IsProvider]

    def get_revision(self, request, pk, revision_pk):
        revision = (
            QuotationRevision.objects.filter(id=revision_pk, quotation_id=pk)
            .select_related("quotation")
            .prefetch_related("items__requirement")
            .first()
        )
        if revision is None or revision.quotation.provider_id != request.user.id:
            raise PermissionDenied(
                "This quotation revision is not available to your account."
            )
        return revision

    @extend_schema(responses={200: QuotationRevisionSerializer})
    def get(self, request, pk, revision_pk):
        return Response(
            QuotationRevisionSerializer(self.get_revision(request, pk, revision_pk)).data
        )

    @extend_schema(request=RevisionWriteSerializer, responses={200: QuotationRevisionSerializer})
    def patch(self, request, pk, revision_pk):
        revision = self.get_revision(request, pk, revision_pk)
        payload = RevisionWriteSerializer(data=request.data, partial=True)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        revision = update_draft_revision(
            revision_id=revision.pk,
            actor=request.user,
            notes=data.get("notes"),
            valid_until=data["valid_until"] if "valid_until" in data else UNSET,
            items=data.get("items"),
        )
        return Response(
            QuotationRevisionSerializer(_revision_with_items(revision.pk)).data
        )


class ProviderRevisionSubmitView(APIView):
    permission_classes = [IsProvider]

    @extend_schema(request=None, responses={200: QuotationRevisionSerializer})
    def post(self, request, pk, revision_pk):
        revision = submit_revision(revision_id=revision_pk, actor=request.user)
        return Response(
            QuotationRevisionSerializer(_revision_with_items(revision.pk)).data
        )


class ProviderQuotationWithdrawView(APIView):
    permission_classes = [IsProvider]

    @extend_schema(request=None, responses={200: QuotationSerializer})
    def post(self, request, pk):
        quotation = withdraw_quotation(quotation_id=pk, actor=request.user)
        return Response(
            QuotationSerializer(_quotation_with_revisions(quotation.pk)).data
        )


class EventQuotationListView(generics.ListAPIView):
    """Customer comparison view: every quotation received for one owned event."""

    permission_classes = [IsCustomer]
    serializer_class = QuotationSerializer
    pagination_class = None

    def get_queryset(self):
        event = get_owned_event(actor=self.request.user, event_id=self.kwargs["event_pk"])
        mark_expired_revisions(QuotationRevision.objects.filter(quotation__event=event))
        return (
            Quotation.objects.filter(event=event)
            .select_related("event", "provider")
            .prefetch_related("revisions__items__requirement")
            .order_by("created_at")
        )
