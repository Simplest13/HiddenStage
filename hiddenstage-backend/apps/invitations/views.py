from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.core.permissions import IsCustomer, IsProvider
from apps.events.services import get_owned_event
from apps.invitations.models import Invitation
from apps.invitations.serializers import (
    InvitationCreateSerializer,
    InvitationSerializer,
    ProviderInvitationSerializer,
)
from apps.invitations.services import (
    create_invitation,
    expire_stale_invitations,
    respond_to_invitation,
    withdraw_invitation,
)


class EventInvitationListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsCustomer]
    serializer_class = InvitationSerializer
    pagination_class = None

    def get_queryset(self):
        expire_stale_invitations(Invitation.objects.filter(event__customer=self.request.user))
        return Invitation.objects.filter(
            event__customer=self.request.user, event_id=self.kwargs["event_pk"]
        ).select_related("event", "requirement", "provider")

    @extend_schema(request=InvitationCreateSerializer, responses={201: InvitationSerializer})
    def post(self, request, event_pk):
        event = get_owned_event(actor=request.user, event_id=event_pk)
        payload = InvitationCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        provider_user = User.objects.filter(id=payload.validated_data["provider_id"]).first()
        if provider_user is None:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"provider_id": "Unknown provider."})
        requirement = None
        requirement_id = payload.validated_data.get("requirement_id")
        if requirement_id:
            requirement = event.requirements.filter(id=requirement_id).first()
            if requirement is None:
                from rest_framework.exceptions import ValidationError

                raise ValidationError({"requirement_id": "Unknown requirement for this event."})
        invitation = create_invitation(
            customer=request.user,
            event=event,
            provider_user=provider_user,
            requirement=requirement,
            message=payload.validated_data.get("message", ""),
        )
        return Response(
            InvitationSerializer(invitation).data, status=status.HTTP_201_CREATED
        )


class EventInvitationWithdrawView(APIView):
    permission_classes = [IsCustomer]

    @extend_schema(request=None, responses={200: InvitationSerializer})
    def post(self, request, event_pk, pk):
        event = get_owned_event(actor=request.user, event_id=event_pk)
        invitation = withdraw_invitation(invitation_id=pk, customer=request.user, event=event)
        return Response(InvitationSerializer(invitation).data)


class ProviderInvitationListView(generics.ListAPIView):
    permission_classes = [IsProvider]
    serializer_class = ProviderInvitationSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = Invitation.objects.filter(provider=self.request.user)
        expire_stale_invitations(queryset)
        queryset = queryset.select_related("event", "requirement", "provider").prefetch_related(
            "event__requirements__category"
        )
        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param.upper())
        return queryset


class ProviderInvitationRespondView(APIView):
    permission_classes = [IsProvider]

    @extend_schema(request=None, responses={200: InvitationSerializer})
    def post(self, request, pk):
        invitation = respond_to_invitation(
            invitation_id=pk, provider_user=request.user, accept=True
        )
        return Response(ProviderInvitationSerializer(invitation).data)


class ProviderInvitationDeclineView(APIView):
    permission_classes = [IsProvider]

    @extend_schema(request=None, responses={200: InvitationSerializer})
    def post(self, request, pk):
        invitation = respond_to_invitation(
            invitation_id=pk, provider_user=request.user, accept=False
        )
        return Response(ProviderInvitationSerializer(invitation).data)
