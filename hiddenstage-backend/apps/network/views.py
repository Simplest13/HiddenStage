from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Notification, User
from apps.core.permissions import IsProvider
from apps.network.models import (
    AssociationStatus,
    ChatMessage,
    Conversation,
    CustomerConnection,
    NetworkAssociation,
    NetworkInvitation,
    NetworkInvitationStatus,
)
from apps.network.serializers import (
    AssignmentActionSerializer,
    AssignmentCreateSerializer,
    AvailabilityQuerySerializer,
    AvailabilityResponseSerializer,
    ChatMessageSerializer,
    ConversationSerializer,
    CustomerConnectionSerializer,
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


class CustomerNetworkListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        connections = (
            CustomerConnection.objects.filter(customer=request.user)
            .select_related("provider", "provider__provider_profile")
            .order_by("-created_at")
        )
        serializer = CustomerConnectionSerializer(
            connections, many=True, context={"request": request}
        )
        return Response(serializer.data)


class CustomerNetworkConnectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        provider_id = request.data.get("provider_id")
        username = request.data.get("username", "").strip().lstrip("@")
        notes = request.data.get("notes", "")

        provider = None
        if provider_id:
            provider = User.objects.filter(pk=provider_id, role="PROVIDER").first()
        elif username:
            provider = User.objects.filter(username__iexact=username, role="PROVIDER").first()

        if not provider:
            return Response(
                {"detail": "Event professional not found."}, status=status.HTTP_404_NOT_FOUND
            )

        if provider.id == request.user.id:
            return Response(
                {"detail": "Cannot connect to yourself."}, status=status.HTTP_400_BAD_REQUEST
            )

        conn, created = CustomerConnection.objects.get_or_create(
            customer=request.user,
            provider=provider,
            defaults={"notes": notes},
        )
        if not created and notes:
            conn.notes = notes
            conn.save(update_fields=["notes"])

        Notification.objects.create(
            user=provider,
            title="New Customer Connection",
            message=f"{request.user.full_name} added you to their network.",
            notification_type="CONNECTION",
            action_url="/app/network",
        )

        serializer = CustomerConnectionSerializer(conn, context={"request": request})
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CustomerNetworkDisconnectView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, provider_id):
        conn = CustomerConnection.objects.filter(
            customer=request.user, provider_id=provider_id
        ).first()
        if not conn:
            return Response(
                {"detail": "Connection not found."}, status=status.HTTP_404_NOT_FOUND
            )
        conn.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CustomerNetworkSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        category = request.query_params.get("category", "").strip()
        qs = (
            User.objects.filter(role="PROVIDER", is_active=True)
            .select_related("provider_profile")
            .prefetch_related(
                "provider_profile__coverage",
                "provider_profile__services__category",
            )
        )
        if query:
            clean_q = query.lstrip("@")
            qs = qs.filter(
                Q(username__icontains=clean_q)
                | Q(full_name__icontains=query)
                | Q(provider_profile__display_name__icontains=query)
                | Q(provider_profile__coverage__city__icontains=query)
            ).distinct()
        if category and category.lower() != "all":
            qs = qs.filter(provider_profile__services__category__code__iexact=category).distinct()

        results = []
        user_conns = set()
        if request.user.is_authenticated:
            user_conns = set(
                CustomerConnection.objects.filter(customer=request.user).values_list(
                    "provider_id", flat=True
                )
            )
        for u in qs[:25]:
            prof = getattr(u, "provider_profile", None)
            cats = (
                prof.declared_categories()
                if prof and hasattr(prof, "declared_categories")
                else []
            )
            cov = prof.coverage.first() if prof and hasattr(prof, "coverage") else None
            results.append(
                {
                    "id": str(u.id),
                    "name": u.full_name,
                    "username": u.username,
                    "avatar": getattr(u, "avatar_url", None),
                    "business_name": prof.display_name
                    if prof and prof.display_name
                    else u.full_name,
                    "category": cats[0] if cats else "Specialist",
                    "city": cov.city if cov else "India",
                    "is_connected": u.id in user_conns,
                }
            )
        return Response(results)


class ConversationListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(operation_id="network_conversations_list")
    def get(self, request):
        qs = (
            Conversation.objects.filter(
                Q(customer=request.user) | Q(provider=request.user)
            )
            .select_related("customer", "provider", "provider__provider_profile")
            .prefetch_related("messages")
        )
        serializer = ConversationSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
        target_id = request.data.get("provider_id") or request.data.get("user_id")
        event_id = request.data.get("event_id")
        if not target_id:
            return Response(
                {"detail": "provider_id or user_id required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user.role == "PROVIDER":
            customer_id = target_id
            provider_id = request.user.id
        else:
            customer_id = request.user.id
            provider_id = target_id

        conv, _ = Conversation.objects.get_or_create(
            customer_id=customer_id,
            provider_id=provider_id,
            defaults={"event_id": event_id if event_id else None},
        )
        serializer = ConversationSerializer(conv, context={"request": request})
        return Response(serializer.data)


class ConversationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(operation_id="network_conversations_detail")
    def get(self, request, pk):
        conv = Conversation.objects.filter(
            Q(customer=request.user) | Q(provider=request.user),
            pk=pk,
        ).first()
        if not conv:
            return Response(
                {"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND
            )

        conv.messages.filter(is_read=False).exclude(sender=request.user).update(
            is_read=True, read_at=timezone.now()
        )

        messages = conv.messages.all().select_related("sender")
        msg_serializer = ChatMessageSerializer(
            messages, many=True, context={"request": request}
        )
        conv_serializer = ConversationSerializer(conv, context={"request": request})
        return Response(
            {
                "conversation": conv_serializer.data,
                "messages": msg_serializer.data,
            }
        )


class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        conv = Conversation.objects.filter(
            Q(customer=request.user) | Q(provider=request.user),
            pk=pk,
        ).first()
        if not conv:
            return Response(
                {"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND
            )

        content = request.data.get("content", "").strip()
        attachment = request.FILES.get("attachment")
        if not content and not attachment:
            return Response(
                {"detail": "Message content or attachment required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        msg = ChatMessage.objects.create(
            conversation=conv,
            sender=request.user,
            content=content,
            attachment=attachment,
        )
        conv.save(update_fields=["updated_at"])

        recipient = conv.provider if request.user == conv.customer else conv.customer
        Notification.objects.create(
            user=recipient,
            title=f"New message from {request.user.full_name}",
            message=content[:100] if content else "Sent an attachment",
            notification_type="MESSAGE",
            action_url="/app/network",
        )

        return Response(
            ChatMessageSerializer(msg, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
