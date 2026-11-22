"""Customer event, requirement and attachment endpoints."""

import mimetypes

from django.db import transaction
from django.db.models import Count
from django.http import FileResponse
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import Conflict
from apps.core.permissions import IsCustomer
from apps.events.attachments import scan_attachment, validate_attachment_upload
from apps.events.models import Event, EventAttachment, EventStatus, ServiceRequirement
from apps.events.serializers import (
    CustomerBookingSerializer,
    EventAttachmentSerializer,
    EventListSerializer,
    EventSerializer,
    EventWriteSerializer,
    PublicEventFeedSerializer,
    ServiceRequirementSerializer,
)
from apps.events.services import (
    create_event_with_requirements,
    ensure_event_editable,
    get_owned_event,
    submit_event,
    withdraw_event,
)
from apps.profiles.models import ServiceCategory


class EventListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsCustomer]
    pagination_class = None

    def get_queryset(self):
        queryset = (
            Event.objects.filter(customer=self.request.user)
            .annotate(requirement_count=Count("requirements"))
            .order_by("-event_date", "-created_at")
        )
        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param.upper())
        return queryset

    def get_serializer_class(self):
        return EventListSerializer if self.request.method == "GET" else EventWriteSerializer

    @extend_schema(request=EventWriteSerializer, responses={201: EventSerializer})
    def post(self, request):
        serializer = EventWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        requirements = data.pop("requirements", [])
        submit = data.pop("status", EventStatus.DRAFT) == EventStatus.SUBMITTED
        event = create_event_with_requirements(
            customer=request.user, payload={**data, "submit": submit}, requirements=requirements
        )
        return Response(
            EventSerializer(Event.objects.get(pk=event.pk)).data,
            status=status.HTTP_201_CREATED,
        )


class EventDetailView(APIView):
    permission_classes = [IsCustomer]

    def get_event(self, request, pk) -> Event:
        return get_owned_event(actor=request.user, event_id=pk)

    @extend_schema(responses={200: EventSerializer})
    def get(self, request, pk):
        event = self.get_event(request, pk)
        return Response(EventSerializer(event).data)

    @extend_schema(request=EventWriteSerializer, responses={200: EventSerializer})
    def patch(self, request, pk):
        return self._update(request, pk)

    def _update(self, request, pk):
        event = self.get_event(request, pk)
        ensure_event_editable(event)
        serializer = EventWriteSerializer(instance=event, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        requirements = data.pop("requirements", None)
        wants_submit = data.pop("status", None) == EventStatus.SUBMITTED
        with transaction.atomic():
            for field, value in data.items():
                setattr(event, field, value)
            event.save()
            if requirements is not None:
                codes = [requirement["category"] for requirement in requirements]
                categories = {
                    category.code: category
                    for category in ServiceCategory.objects.filter(
                        code__in=codes, is_active=True
                    )
                }
                unknown = sorted(set(codes) - set(categories))
                if unknown:
                    raise ValidationError(
                        {"requirements": f"Unknown service categories: {', '.join(unknown)}."}
                    )
                event.requirements.all().delete()
                for position, requirement in enumerate(requirements):
                    line = dict(requirement)
                    category = categories[line.pop("category")]
                    custom_name = line.get("custom_service_name") or ""
                    custom_desc = line.get("custom_service_description") or ""
                    if category.code == "other" or custom_name:
                        line.setdefault("custom_review_status", "PENDING")
                        line["custom_service_name"] = custom_name
                        line["custom_service_description"] = custom_desc
                    else:
                        line.setdefault("custom_review_status", "NOT_REQUIRED")
                    ServiceRequirement.objects.create(
                        event=event, position=position, category=category, **line
                    )
            if wants_submit:
                event = submit_event(event)
        event.refresh_from_db()
        return Response(EventSerializer(event).data)

    @extend_schema(responses={204: OpenApiResponse(description="Draft deleted.")})
    def delete(self, request, pk):
        event = self.get_event(request, pk)
        if event.status != EventStatus.DRAFT:
            raise Conflict(
                "Only draft events can be deleted. Withdraw a submitted event instead."
            )
        event.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EventSubmitView(APIView):
    permission_classes = [IsCustomer]

    @extend_schema(request=None, responses={200: EventSerializer})
    def post(self, request, pk):
        event = get_owned_event(actor=request.user, event_id=pk)
        event = submit_event(event)
        return Response(EventSerializer(event).data)


class EventWithdrawView(APIView):
    permission_classes = [IsCustomer]

    @extend_schema(request=None, responses={200: EventSerializer})
    def post(self, request, pk):
        event = get_owned_event(actor=request.user, event_id=pk)
        event = withdraw_event(event)
        return Response(EventSerializer(event).data)


class RequirementListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsCustomer]
    serializer_class = ServiceRequirementSerializer
    pagination_class = None

    def get_owned_event(self):
        return get_owned_event(
            actor=self.request.user, event_id=self.kwargs["event_pk"]
        )

    def get_queryset(self):
        return ServiceRequirement.objects.filter(
            event__customer=self.request.user, event_id=self.kwargs["event_pk"]
        ).select_related("category")

    def perform_create(self, serializer):
        event = self.get_owned_event()
        ensure_event_editable(event)
        position = event.requirements.count()
        serializer.save(event=event, position=position)


class RequirementDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsCustomer]
    serializer_class = ServiceRequirementSerializer

    def get_queryset(self):
        return ServiceRequirement.objects.filter(
            event__customer=self.request.user, event_id=self.kwargs["event_pk"]
        ).select_related("category")

    def perform_update(self, serializer):
        self._ensure_editable()
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_editable()
        instance.delete()

    def _ensure_editable(self):
        event = get_owned_event(
            actor=self.request.user, event_id=self.kwargs["event_pk"]
        )
        ensure_event_editable(event)


class EventAttachmentListCreateView(generics.ListCreateAPIView):
    """Private upload. Widget stores files under MEDIA_ROOT, never a public path."""

    permission_classes = [IsAuthenticated]
    serializer_class = EventAttachmentSerializer
    pagination_class = None
    parser_classes = [MultiPartParser, FormParser]

    def get_event(self):
        return get_owned_event(actor=self.request.user, event_id=self.kwargs["event_pk"])

    def get_queryset(self):
        return EventAttachment.objects.filter(
            event__customer=self.request.user, event_id=self.kwargs["event_pk"]
        )

    def perform_create(self, serializer):
        event = self.get_event()
        ensure_event_editable(event)
        upload = self.request.FILES.get("file")
        if upload is None:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"file": "Select a file to upload."})
        content_type = validate_attachment_upload(
            upload=upload,
            declared_type=upload.content_type,
            existing_count=event.attachments.count(),
        )
        attachment = serializer.save(
            event=event,
            uploaded_by=self.request.user,
            original_name=upload.name[:255],
            content_type=content_type,
            size_bytes=upload.size,
        )
        attachment.scan_status = scan_attachment(attachment)
        attachment.save(update_fields=["scan_status"])
        return attachment


class EventAttachmentDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: OpenApiResponse(description="File stream.")})
    def get(self, request, event_pk, pk):
        try:
            event = Event.objects.get(pk=event_pk)
        except Event.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        from apps.events.services import can_access_event_attachments

        if not can_access_event_attachments(actor=request.user, event=event):
            return Response(
                {"detail": "You do not have permission to access attachments for this event."},
                status=status.HTTP_403_FORBIDDEN,
            )

        attachment = EventAttachment.objects.filter(id=pk, event=event).first()
        if attachment is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if not attachment.file:
            return Response({"detail": "File not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            file_handle = attachment.file.open("rb")
        except (FileNotFoundError, OSError, ValueError):
            return Response(
                {"detail": "Attachment file was not found on storage."},
                status=status.HTTP_404_NOT_FOUND,
            )
        response = FileResponse(
            file_handle,
            as_attachment=True,
            filename=attachment.original_name,
            content_type=attachment.content_type
            or mimetypes.guess_type(attachment.original_name)[0]
            or "application/octet-stream",
        )
        response["Cache-Control"] = "private, no-store"
        return response


class EventAttachmentDeleteView(APIView):
    permission_classes = [IsCustomer]

    @extend_schema(request=None, responses={204: OpenApiResponse(description="Deleted.")})
    def delete(self, request, event_pk, pk):
        event = get_owned_event(actor=request.user, event_id=event_pk)
        ensure_event_editable(event)
        attachment = EventAttachment.objects.filter(id=pk, event=event).first()
        if attachment is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        attachment.file.delete(save=False)
        attachment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CustomerBookingsListView(APIView):
    permission_classes = [IsCustomer]

    @extend_schema(operation_id="events_bookings_list")
    def get(self, request):
        status_param = request.query_params.get("status")
        queryset = (
            Event.objects.filter(customer=request.user)
            .prefetch_related(
                "requirements",
                "requirements__category",
                "commitments",
                "commitments__provider__provider_profile",
                "commitments__quotation",
                "invoices",
            )
            .order_by("-event_date", "-created_at")
        )
        if status_param and status_param != "ALL":
            queryset = queryset.filter(status=status_param.upper())
        serializer = CustomerBookingSerializer(queryset, many=True)
        return Response(serializer.data)


class CustomerBookingDetailView(APIView):
    permission_classes = [IsCustomer]

    @extend_schema(operation_id="events_bookings_detail")
    def get(self, request, pk):
        event = (
            Event.objects.filter(customer=request.user, pk=pk)
            .prefetch_related(
                "requirements",
                "requirements__category",
                "commitments",
                "commitments__provider__provider_profile",
                "commitments__quotation",
                "invoices",
            )
            .first()
        )
        if not event:
            return Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = CustomerBookingSerializer(event)
        return Response(serializer.data)


class PublicEventFeedView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        queryset = (
            Event.objects.filter(status=EventStatus.SUBMITTED)
            .prefetch_related("requirements", "requirements__category")
            .order_by("-created_at")[:30]
        )
        serializer = PublicEventFeedSerializer(queryset, many=True)
        return Response(serializer.data)


class EventCompleteView(APIView):
    """Customer confirms event delivery completion and optionally leaves feedback."""

    permission_classes = [IsCustomer]

    @extend_schema(request=None, responses={200: CustomerBookingSerializer})
    def post(self, request, pk):
        from django.utils import timezone
        from apps.accounts.models import Notification
        from apps.commitments.models import CommitmentStatus
        from apps.network.models import ChatMessage, Conversation

        event = get_owned_event(actor=request.user, event_id=pk)
        commits = event.commitments.filter(status=CommitmentStatus.ACTIVE).select_related("provider")
        if not commits.exists():
            return Response(
                {"detail": "Cannot mark an event as complete without active specialist commitments."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event.status = EventStatus.CLOSED
        event.closed_at = timezone.now()
        event.save(update_fields=["status", "closed_at", "updated_at"])

        feedback = (request.data.get("feedback") or "").strip()

        for c in commits:
            try:
                Notification.objects.create(
                    user=c.provider,
                    event=event,
                    title="Event Completed",
                    message=f"{request.user.full_name} confirmed completion of {event.name}. Congratulations!",
                    notification_type="BOOKING",
                    action_url=f"/provider/commitments/{c.pk}",
                )
            except Exception:
                pass

            if feedback:
                try:
                    conv, _ = Conversation.objects.get_or_create(
                        customer=request.user,
                        provider=c.provider,
                        defaults={"event": event},
                    )
                    ChatMessage.objects.create(
                        conversation=conv,
                        sender=request.user,
                        content=f"Event Completion Feedback for {event.name}:\n⭐ {feedback}",
                    )
                except Exception:
                    pass

        try:
            Notification.objects.create(
                user=request.user,
                event=event,
                title="Event Completed",
                message=f"You marked {event.name} as successfully completed. Invoices and records are finalized.",
                notification_type="BOOKING",
                action_url="/app/bookings",
            )
        except Exception:
            pass

        return Response(CustomerBookingSerializer(event).data)
