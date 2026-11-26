import json
import queue
from django.core.cache import cache
from django.db.models import BooleanField, Exists, OuterRef, Q, Subquery, Value
from django.http import StreamingHttpResponse
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Notification, User
from apps.core.permissions import IsCustomerOrProvider, IsProvider
from apps.network.events import event_bus
from apps.profiles.models import ProviderCoverage, ProviderProfile, ProviderService
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
    ).prefetch_related(
        "manager__provider_profile__services__category",
        "manager__provider_profile__coverage",
        "worker__provider_profile__services__category",
        "worker__provider_profile__coverage",
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
    permission_classes = [IsCustomerOrProvider]

    @extend_schema(responses={200: NetworkAssociationSerializer(many=True)})
    def get(self, request):
        if not request.user.is_provider:
            return Response([])
        include_history = request.query_params.get("history") in {"1", "true", "yes"}
        items = list_network(actor=request.user, include_history=include_history)
        associations = []
        for item in items:
            assoc = item["association"]
            assoc._cached_counterpart_profile = item.get("profile")
            assoc._active_assignments = item.get("active_assignments", 0)
            assoc._completed_assignments = item.get("completed_assignments", 0)
            associations.append(assoc)
        return Response(
            NetworkAssociationSerializer(
                associations,
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
        connections = list(
            CustomerConnection.objects.filter(
                Q(customer=request.user) | Q(provider=request.user)
            )
            .select_related(
                "customer",
                "customer__customer_profile",
                "provider",
                "provider__provider_profile",
                "provider__customer_profile",
            )
            .prefetch_related(
                "provider__provider_profile__services__category",
                "provider__provider_profile__coverage",
            )
            .order_by("-created_at")
        )

        pairs = [(c.customer_id, c.provider_id) for c in connections]
        active_pairs = set()
        if pairs:
            from apps.commitments.models import Commitment
            c_ids = [p[0] for p in pairs]
            p_ids = [p[1] for p in pairs]
            active_pairs = set(
                Commitment.objects.filter(
                    customer_id__in=c_ids,
                    provider_id__in=p_ids,
                    status="ACTIVE",
                ).values_list("customer_id", "provider_id")
            )

        unread_map = {}
        if pairs:
            convs = Conversation.objects.filter(
                Q(customer=request.user) | Q(provider=request.user)
            ).prefetch_related("messages")
            for conv in convs:
                pair_key = (conv.customer_id, conv.provider_id)
                unread_cnt = sum(
                    1 for m in conv.messages.all()
                    if not m.is_read and m.sender_id != request.user.id
                )
                unread_map[pair_key] = unread_cnt

        serializer = CustomerConnectionSerializer(
            connections,
            many=True,
            context={
                "request": request,
                "active_pairs": active_pairs,
                "unread_map": unread_map,
            },
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
            provider = User.objects.filter(pk=provider_id, is_active=True).first()
            if not provider:
                profile = ProviderProfile.objects.filter(pk=provider_id).select_related("user").first()
                if profile and profile.user and profile.user.is_active:
                    provider = profile.user

        if not provider and username:
            clean_u = username.lstrip("@").strip()
            provider = User.objects.filter(username__iexact=clean_u, is_active=True).first()
            if not provider:
                profile = ProviderProfile.objects.filter(
                    Q(username__iexact=clean_u) | Q(user__username__iexact=clean_u)
                ).select_related("user").first()
                if profile and profile.user and profile.user.is_active:
                    provider = profile.user

        if not provider:
            return Response(
                {"detail": "Event professional or user not found."}, status=status.HTTP_404_NOT_FOUND
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

        # Ensure conversation exists so both sides can immediately message
        Conversation.objects.get_or_create(
            customer=request.user,
            provider=provider,
        )

        dest_url = (
            "/app/provider/customer-network"
            if getattr(provider, "is_provider", False) or getattr(provider, "role", "") == "PROVIDER"
            else "/app/network"
        )
        Notification.objects.create(
            user=provider,
            title="New Customer Connection",
            message=f"{request.user.full_name} added you to their network.",
            notification_type="CONNECTION",
            action_url=dest_url,
        )

        event_bus.publish_to_user(
            str(provider.id),
            "network_update",
            {
                "type": "connected",
                "customer_id": str(request.user.id),
                "customer_name": request.user.full_name,
            },
        )
        event_bus.publish_to_user(
            str(provider.id),
            "notification",
            {
                "title": "New Customer Connection",
                "message": f"{request.user.full_name} added you to their network.",
                "notification_type": "CONNECTION",
            },
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
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        category = request.query_params.get("category", "").strip()
        user_id = str(request.user.id) if request.user.is_authenticated else "anon"
        cache_key = f"search_providers:{user_id}:{query.lower()}:{category.lower()}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        first_city = Subquery(
            ProviderCoverage.objects.filter(provider=OuterRef("provider_profile")).values("city")[:1]
        )
        first_category = Subquery(
            ProviderService.objects.filter(provider=OuterRef("provider_profile"), is_active=True)
            .order_by("category__sort_order")
            .values("category__name")[:1]
        )

        qs = User.objects.filter(is_active=True)
        if request.user.is_authenticated:
            qs = qs.exclude(id=request.user.id)
            conn_subquery = CustomerConnection.objects.filter(
                customer=request.user, provider=OuterRef("pk")
            )
            qs = qs.annotate(is_connected=Exists(conn_subquery))
        else:
            qs = qs.annotate(is_connected=Value(False, output_field=BooleanField()))

        if query:
            clean_q = query.lstrip("@").strip()
            qs = qs.filter(
                Q(username__icontains=clean_q)
                | Q(full_name__icontains=clean_q)
                | Q(provider_profile__display_name__icontains=clean_q)
                | Q(provider_profile__coverage__city__icontains=clean_q)
            )
        if category and category.lower() != "all":
            qs = qs.filter(provider_profile__services__category__code__iexact=category)

        qs = (
            qs.distinct()
            .select_related("provider_profile")
            .annotate(city=first_city, category_name=first_category)
        )

        results = []
        for u in qs[:30]:
            prof = getattr(u, "provider_profile", None)
            cat_label = u.category_name or ("Client" if u.role == "CUSTOMER" else "Specialist")
            results.append(
                {
                    "id": str(u.id),
                    "name": u.full_name,
                    "username": u.username,
                    "avatar": getattr(u, "avatar_url", None),
                    "business_name": prof.display_name
                    if prof and prof.display_name
                    else u.full_name,
                    "category": cat_label,
                    "city": u.city or "India",
                    "is_connected": bool(u.is_connected),
                }
            )
        cache.set(cache_key, results, timeout=60)
        return Response(results)


class ConversationListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(operation_id="network_conversations_list")
    def get(self, request):
        qs = (
            Conversation.objects.filter(
                Q(customer=request.user) | Q(provider=request.user)
            )
            .select_related(
                "customer",
                "customer__provider_profile",
                "provider",
                "provider__provider_profile",
            )
            .prefetch_related("messages")
        )
        serializer = ConversationSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
        target_id = request.data.get("provider_id") or request.data.get("user_id") or request.data.get("username")
        event_id = request.data.get("event_id")
        if not target_id:
            return Response(
                {"detail": "provider_id or user_id required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_user = User.objects.filter(pk=target_id, is_active=True).first()
        if not target_user:
            profile = ProviderProfile.objects.filter(pk=target_id).select_related("user").first()
            if profile and profile.user and profile.user.is_active:
                target_user = profile.user

        if not target_user:
            clean_u = str(target_id).lstrip("@").strip()
            target_user = User.objects.filter(username__iexact=clean_u, is_active=True).first()
            if not target_user:
                profile = ProviderProfile.objects.filter(
                    Q(username__iexact=clean_u) | Q(user__username__iexact=clean_u)
                ).select_related("user").first()
                if profile and profile.user and profile.user.is_active:
                    target_user = profile.user

        if not target_user:
            return Response(
                {"detail": "Target user or provider not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if target_user.id == request.user.id:
            return Response(
                {"detail": "Cannot start conversation with yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user.role == "PROVIDER":
            customer = target_user
            provider = request.user
        else:
            customer = request.user
            provider = target_user

        conv, _ = Conversation.objects.get_or_create(
            customer=customer,
            provider=provider,
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
        recipient_is_provider = (
            getattr(recipient, "is_provider", False) or getattr(recipient, "role", "") == "PROVIDER"
        )
        Notification.objects.create(
            user=recipient,
            title=f"New message from {request.user.full_name}",
            message=content[:100] if content else "Sent an attachment",
            notification_type="MESSAGE",
            action_url="/app/provider/customer-network" if recipient_is_provider else "/app/network",
        )

        msg_data = ChatMessageSerializer(msg, context={"request": request}).data

        event_bus.publish_to_user(
            str(recipient.id),
            "chat_message",
            {
                "conversation_id": str(conv.id),
                "message": msg_data,
            },
        )
        event_bus.publish_to_user(
            str(recipient.id),
            "notification",
            {
                "title": f"New message from {request.user.full_name}",
                "message": content[:100] if content else "Sent an attachment",
                "notification_type": "MESSAGE",
            },
        )

        return Response(
            msg_data,
            status=status.HTTP_201_CREATED,
        )


class RealtimeStreamView(APIView):
    """Server-Sent Events (SSE) endpoint for sub-millisecond push updates.

    Delivers incoming chat messages, status transitions, and notifications
    directly to active browser sessions without polling lag.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = str(request.user.id)
        q = event_bus.subscribe(user_id)

        def event_stream():
            yield f"event: connected\ndata: {json.dumps({'status': 'connected', 'user_id': user_id})}\n\n"
            try:
                while True:
                    try:
                        item = q.get(timeout=15)
                        yield f"event: message\ndata: {json.dumps(item)}\n\n"
                    except queue.Empty:
                        yield ": keepalive\n\n"
            except GeneratorExit:
                event_bus.unsubscribe(q, user_id)
            finally:
                event_bus.unsubscribe(q, user_id)

        response = StreamingHttpResponse(
            event_stream(),
            content_type="text/event-stream",
        )
        response["Cache-Control"] = "no-cache, no-transform"
        response["X-Accel-Buffering"] = "no"
        return response
