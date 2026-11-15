from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsProvider
from apps.network.models import (
    AssociationStatus,
    NetworkAssociation,
    NetworkInvitation,
    NetworkInvitationStatus,
)
from apps.network.serializers import (
    AssignmentActionSerializer,
    AssignmentCreateSerializer,
    AvailabilityQuerySerializer,
    AvailabilityResponseSerializer,
    NetworkAssociationEndSerializer,
    NetworkAssociationSerializer,
    NetworkInvitationCreateSerializer,
    NetworkInvitationSerializer,
    WorkerAssignmentSerializer,
    WorkerDiscoverySerializer,
)
from apps.network.services import (
    cancel_assignment,
    cancel_network_invitation,
    check_availability,
    complete_assignment,
    create_assignment,
    discover_workers,
    end_network_association,
    expire_stale_network_invitations,
    get_assignment,
    list_assignments,
    list_network,
    require_manager,
    respond_to_assignment,
    respond_to_network_invitation,
    send_network_invitation,
    start_assignment,
)
from apps.profiles.models import ProviderKind, ProviderProfile


def _invitation_queryset():
    return NetworkInvitation.objects.select_related(
        "manager__provider_profile", "worker__provider_profile"
    )


def _worker_payload(item) -> dict:
    provider = item["provider"]
    association = item["association"]
    invitation = item["invitation"]
    return {
        "id": provider.id,
        "user_id": provider.user_id,
        "display_name": provider.display_name,
        "description": provider.description,
        "verification_status": provider.verification_status,
        "categories": provider.declared_categories(),
        "coverage": provider.coverage.all(),
        "relationship": item["relationship"],
        "association_id": association.id if association else None,
        "invitation_id": invitation.id if invitation else None,
    }


class WorkerDiscoveryView(APIView):
    permission_classes = [IsProvider]

    @extend_schema(responses={200: WorkerDiscoverySerializer(many=True)})
    def get(self, request):
        require_manager(request.user)
        items = discover_workers(
            manager=request.user,
            category=request.query_params.get("category", ""),
            city=request.query_params.get("city", ""),
            pin_code=request.query_params.get("pin_code", ""),
            locality=request.query_params.get("locality", ""),
        )
        return Response(WorkerDiscoverySerializer([_worker_payload(i) for i in items], many=True).data)


class WorkerDetailView(APIView):
    permission_classes = [IsProvider]

    @extend_schema(
        responses={200: WorkerDiscoverySerializer},
        operation_id="network_worker_retrieve"
    )
    def get(self, request, user_id):
        require_manager(request.user)
        provider = (
            ProviderProfile.objects.filter(
                user_id=user_id,
                kind=ProviderKind.WORKER,
                completed_at__isnull=False,
                user__is_active=True,
            )
            .select_related("user")
            .prefetch_related("services__category", "coverage")
            .first()
        )
        if provider is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        association = NetworkAssociation.objects.filter(
            manager=request.user, worker_id=user_id, status=AssociationStatus.ACTIVE
        ).first()
        invitation = NetworkInvitation.objects.filter(
            manager=request.user,
            worker_id=user_id,
            status=NetworkInvitationStatus.PENDING,
        ).first()
        item = {
            "provider": provider,
            "association": association,
            "invitation": invitation,
            "relationship": "ASSOCIATED" if association else "INVITED" if invitation else "NONE",
        }
        return Response(WorkerDiscoverySerializer(_worker_payload(item)).data)


class NetworkInvitationListCreateView(APIView):
    permission_classes = [IsProvider]

    @extend_schema(responses={200: NetworkInvitationSerializer(many=True)})
    def get(self, request):
        profile = ProviderProfile.objects.filter(user=request.user).first()
        if profile is None:
            raise PermissionDenied("This account does not have a provider profile.")
        expire_stale_network_invitations()
        queryset = _invitation_queryset()
        if profile.kind == ProviderKind.MANAGER:
            queryset = queryset.filter(manager=request.user)
        else:
            queryset = queryset.filter(worker=request.user)
        status_filter = request.query_params.get("status")
        if status_filter:
            if status_filter not in NetworkInvitationStatus.values:
                raise ValidationError({"status": "Unknown invitation status."})
            queryset = queryset.filter(status=status_filter)
        return Response(
            NetworkInvitationSerializer(queryset, many=True, context={"request": request}).data
        )

    @extend_schema(
        request=NetworkInvitationCreateSerializer,
        responses={201: NetworkInvitationSerializer},
        operation_id="network_invitation_create",
    )
    def post(self, request):
        payload = NetworkInvitationCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        invitation = send_network_invitation(
            manager=request.user,
            worker_id=payload.validated_data["worker_id"],
            message=payload.validated_data.get("message", ""),
        )
        invitation = _invitation_queryset().get(pk=invitation.pk)
        return Response(
            NetworkInvitationSerializer(invitation, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class NetworkInvitationActionView(APIView):
    permission_classes = [IsProvider]

    @extend_schema(
        request=None,
        responses={200: NetworkInvitationSerializer},
        operation_id="network_invitation_action"
    )
    def post(self, request, pk, action):
        if action in {"accept", "decline"}:
            invitation, _ = respond_to_network_invitation(
                invitation_id=pk, worker=request.user, accept=action == "accept"
            )
        elif action == "cancel":
            invitation = cancel_network_invitation(invitation_id=pk, manager=request.user)
        else:
            raise ValidationError({"action": "Unknown invitation action."})
        invitation = _invitation_queryset().get(pk=invitation.pk)
        return Response(
            NetworkInvitationSerializer(invitation, context={"request": request}).data
        )


class NetworkAssociationListView(APIView):
    permission_classes = [IsProvider]

    @extend_schema(responses={200: NetworkAssociationSerializer(many=True)})
    def get(self, request):
        include_history = request.query_params.get("history") in {"1", "true", "yes"}
        items = list_network(actor=request.user, include_history=include_history)
        return Response(
            NetworkAssociationSerializer(
                [item["association"] for item in items],
                many=True,
                context={"request": request},
            ).data
        )


class NetworkAssociationEndView(APIView):
    permission_classes = [IsProvider]

    @extend_schema(
        request=NetworkAssociationEndSerializer,
        responses={200: NetworkAssociationSerializer},
        operation_id="network_association_end"
    )
    def post(self, request, pk):
        reason = request.data.get("reason", "")
        association = end_network_association(
            association_id=pk, actor=request.user, reason=reason
        )
        return Response(
            NetworkAssociationSerializer(association, context={"request": request}).data
        )


class AssignmentListCreateView(APIView):
    permission_classes = [IsProvider]

    @extend_schema(responses={200: WorkerAssignmentSerializer(many=True)})
    def get(self, request):
        assignments = list_assignments(
            actor=request.user,
            commitment_id=request.query_params.get("commitment"),
            status=request.query_params.get("status"),
        )
        return Response(
            WorkerAssignmentSerializer(
                assignments, many=True, context={"request": request}
            ).data
        )

    @extend_schema(
        request=AssignmentCreateSerializer,
        responses={201: WorkerAssignmentSerializer},
        operation_id="assignment_create",
    )
    def post(self, request):
        payload = AssignmentCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        assignment = create_assignment(manager=request.user, **payload.validated_data)
        assignment = get_assignment(actor=request.user, assignment_id=assignment.pk)
        return Response(
            WorkerAssignmentSerializer(assignment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AssignmentDetailView(APIView):
    permission_classes = [IsProvider]

    @extend_schema(
        responses={200: WorkerAssignmentSerializer},
        operation_id="assignment_retrieve"
    )
    def get(self, request, pk):
        assignment = get_assignment(actor=request.user, assignment_id=pk)
        return Response(
            WorkerAssignmentSerializer(assignment, context={"request": request}).data
        )


class AssignmentActionView(APIView):
    permission_classes = [IsProvider]

    @extend_schema(
        request=AssignmentActionSerializer,
        responses={200: WorkerAssignmentSerializer},
        operation_id="assignment_action"
    )
    def post(self, request, pk, action):
        payload = AssignmentActionSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        if action == "accept":
            assignment = respond_to_assignment(
                worker=request.user, assignment_id=pk, accept=True
            )
        elif action == "decline":
            assignment = respond_to_assignment(
                worker=request.user,
                assignment_id=pk,
                accept=False,
                reason=data.get("reason", ""),
            )
        elif action == "start":
            assignment = start_assignment(worker=request.user, assignment_id=pk)
        elif action == "complete":
            assignment = complete_assignment(
                worker=request.user,
                assignment_id=pk,
                completion_notes=data.get("completion_notes", ""),
            )
        elif action == "cancel":
            assignment = cancel_assignment(
                manager=request.user, assignment_id=pk, reason=data.get("reason", "")
            )
        else:
            raise ValidationError({"action": "Unknown assignment action."})
        assignment = get_assignment(actor=request.user, assignment_id=assignment.pk)
        return Response(
            WorkerAssignmentSerializer(assignment, context={"request": request}).data
        )


class AvailabilityView(APIView):
    permission_classes = [IsProvider]

    @extend_schema(
        parameters=[AvailabilityQuerySerializer],
        responses={200: AvailabilityResponseSerializer},
        operation_id="network_availability"
    )
    def get(self, request):
        payload = AvailabilityQuerySerializer(data=request.query_params)
        payload.is_valid(raise_exception=True)
        result = check_availability(manager=request.user, **payload.validated_data)
        return Response(result)
