"""Protected administrative API endpoints under /api/v1/admin/."""

from django.core.cache import cache
from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.administration.serializers import (
    AdminBusinessSerializer,
    AdminBusinessUpdateSerializer,
    AdminCategorySerializer,
    AdminCategoryUpdateSerializer,
    AdminCommitmentSerializer,
    AdminEventSerializer,
    AdminProviderSerializer,
    AdminReasonSerializer,
    AdminUserSerializer,
    AdminUserUpdateSerializer,
    ProviderVerificationActionSerializer,
    UnifiedAuditEntrySerializer,
)
from apps.administration.services import (
    create_category_as_admin,
    get_overview_metrics,
    list_unified_audit_entries,
    release_commitment_as_admin,
    set_provider_verification,
    update_business_admin,
    update_category_as_admin,
    update_user_admin,
    withdraw_event_as_admin,
)
from apps.commitments.models import Commitment
from apps.core.permissions import IsStaffUser
from apps.events.models import Event
from apps.profiles.models import Business, ProviderProfile, ServiceCategory


class AdminOverviewView(APIView):
    permission_classes = [IsStaffUser]

    @extend_schema(responses={200: None}, operation_id="admin_overview")
    def get(self, request):
        cached = cache.get("admin:overview_data")
        if cached is not None:
            return Response(cached)
        metrics = get_overview_metrics()
        recent_audit = UnifiedAuditEntrySerializer(
            list_unified_audit_entries(source="all", limit=10), many=True
        ).data
        payload = {"metrics": metrics, "recent_audit": recent_audit}
        cache.set("admin:overview_data", payload, timeout=30)
        return Response(payload)


class AdminUserListView(APIView):
    permission_classes = [IsStaffUser]

    @extend_schema(responses={200: AdminUserSerializer(many=True)}, operation_id="admin_users_list")
    def get(self, request):
        qs = User.objects.select_related("customer_profile", "provider_profile").order_by(
            "-date_joined"
        )
        role = (request.query_params.get("role") or "").strip().upper()
        if role:
            qs = qs.filter(role=role)
        is_active = (request.query_params.get("is_active") or "").strip().lower()
        if is_active in {"1", "true"}:
            qs = qs.filter(is_active=True)
        elif is_active in {"0", "false"}:
            qs = qs.filter(is_active=False)
        is_staff = (request.query_params.get("is_staff") or "").strip().lower()
        if is_staff in {"1", "true"}:
            qs = qs.filter(is_staff=True)
        elif is_staff in {"0", "false"}:
            qs = qs.filter(is_staff=False)
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(email__icontains=q) | Q(full_name__icontains=q) | Q(phone__icontains=q)
            )
        return Response(AdminUserSerializer(qs[:200], many=True).data)


class AdminUserDetailView(APIView):
    permission_classes = [IsStaffUser]

    @extend_schema(
        request=AdminUserUpdateSerializer,
        responses={200: AdminUserSerializer},
        operation_id="admin_user_update",
    )
    def patch(self, request, pk):
        payload = AdminUserUpdateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        user = update_user_admin(
            actor=request.user,
            user_id=pk,
            is_active=data.get("is_active"),
            is_staff=data.get("is_staff"),
            mark_email_verified=data.get("mark_email_verified", False),
            note=data.get("note", ""),
        )
        user = User.objects.select_related("customer_profile", "provider_profile").get(pk=user.pk)
        return Response(AdminUserSerializer(user).data)


class AdminProviderListView(APIView):
    permission_classes = [IsStaffUser]

    @extend_schema(
        responses={200: AdminProviderSerializer(many=True)},
        operation_id="admin_providers_list",
    )
    def get(self, request):
        qs = (
            ProviderProfile.objects.select_related("user", "business")
            .prefetch_related("services__category", "coverage")
            .order_by("-created_at")
        )
        ver = (request.query_params.get("verification_status") or "").strip().upper()
        if ver:
            qs = qs.filter(verification_status=ver)
        kind = (request.query_params.get("kind") or "").strip().upper()
        if kind:
            qs = qs.filter(kind=kind)
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(display_name__icontains=q)
                | Q(user__email__icontains=q)
                | Q(user__full_name__icontains=q)
                | Q(business__name__icontains=q)
            )
        return Response(AdminProviderSerializer(qs[:200], many=True).data)


class AdminProviderVerificationView(APIView):
    permission_classes = [IsStaffUser]

    @extend_schema(
        request=ProviderVerificationActionSerializer,
        responses={200: AdminProviderSerializer},
        operation_id="admin_provider_verify",
    )
    def post(self, request, pk):
        payload = ProviderVerificationActionSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        profile = set_provider_verification(
            actor=request.user,
            provider_id=pk,
            verification_status=payload.validated_data["verification_status"],
            note=payload.validated_data.get("note", ""),
        )
        profile = (
            ProviderProfile.objects.select_related("user", "business")
            .prefetch_related("services__category", "coverage")
            .get(pk=profile.pk)
        )
        return Response(AdminProviderSerializer(profile).data)


class AdminBusinessListView(APIView):
    permission_classes = [IsStaffUser]

    @extend_schema(
        responses={200: AdminBusinessSerializer(many=True)},
        operation_id="admin_businesses_list",
    )
    def get(self, request):
        qs = Business.objects.prefetch_related("representatives__user").order_by("name")
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(city__icontains=q) | Q(state__icontains=q))
        return Response(AdminBusinessSerializer(qs[:200], many=True).data)


class AdminBusinessDetailView(APIView):
    permission_classes = [IsStaffUser]

    @extend_schema(
        request=AdminBusinessUpdateSerializer,
        responses={200: AdminBusinessSerializer},
        operation_id="admin_business_update",
    )
    def patch(self, request, pk):
        payload = AdminBusinessUpdateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        business = update_business_admin(
            actor=request.user,
            business_id=pk,
            is_active=data.get("is_active"),
            name=data.get("name"),
            city=data.get("city"),
            state=data.get("state"),
            note=data.get("note", ""),
        )
        business = Business.objects.prefetch_related("representatives__user").get(pk=business.pk)
        return Response(AdminBusinessSerializer(business).data)


class AdminEventListView(APIView):
    permission_classes = [IsStaffUser]

    @extend_schema(responses={200: AdminEventSerializer(many=True)}, operation_id="admin_events_list")
    def get(self, request):
        qs = (
            Event.objects.select_related("customer")
            .annotate(requirement_count=Count("requirements"))
            .order_by("-created_at")
        )
        status_filter = (request.query_params.get("status") or "").strip().upper()
        if status_filter:
            qs = qs.filter(status=status_filter)
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(city__icontains=q)
                | Q(customer__email__icontains=q)
                | Q(customer__full_name__icontains=q)
            )
        return Response(AdminEventSerializer(qs[:200], many=True).data)


class AdminEventWithdrawView(APIView):
    permission_classes = [IsStaffUser]

    @extend_schema(
        request=AdminReasonSerializer,
        responses={200: AdminEventSerializer},
        operation_id="admin_event_withdraw",
    )
    def post(self, request, pk):
        payload = AdminReasonSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        event = withdraw_event_as_admin(
            actor=request.user,
            event_id=pk,
            reason=payload.validated_data.get("reason", ""),
        )
        event = (
            Event.objects.select_related("customer")
            .annotate(requirement_count=Count("requirements"))
            .get(pk=event.pk)
        )
        return Response(AdminEventSerializer(event).data)


class AdminCommitmentListView(APIView):
    permission_classes = [IsStaffUser]

    @extend_schema(
        responses={200: AdminCommitmentSerializer(many=True)},
        operation_id="admin_commitments_list",
    )
    def get(self, request):
        qs = (
            Commitment.objects.select_related("event", "customer", "provider")
            .prefetch_related("lines")
            .order_by("-accepted_at")
        )
        status_filter = (request.query_params.get("status") or "").strip().upper()
        if status_filter:
            qs = qs.filter(status=status_filter)
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(event__name__icontains=q)
                | Q(customer__email__icontains=q)
                | Q(provider__email__icontains=q)
            )
        return Response(AdminCommitmentSerializer(qs[:200], many=True).data)


class AdminCommitmentReleaseView(APIView):
    permission_classes = [IsStaffUser]

    @extend_schema(
        request=AdminReasonSerializer,
        responses={200: AdminCommitmentSerializer},
        operation_id="admin_commitment_release",
    )
    def post(self, request, pk):
        payload = AdminReasonSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        commitment = release_commitment_as_admin(
            actor=request.user,
            commitment_id=pk,
            reason=payload.validated_data.get("reason", ""),
        )
        commitment = (
            Commitment.objects.select_related("event", "customer", "provider")
            .prefetch_related("lines")
            .get(pk=commitment.pk)
        )
        return Response(AdminCommitmentSerializer(commitment).data)


class AdminCategoryListCreateView(APIView):
    permission_classes = [IsStaffUser]

    @extend_schema(
        responses={200: AdminCategorySerializer(many=True)},
        operation_id="admin_categories_list",
    )
    def get(self, request):
        qs = ServiceCategory.objects.all().order_by("sort_order", "name")
        return Response(AdminCategorySerializer(qs, many=True).data)

    @extend_schema(
        request=AdminCategorySerializer,
        responses={201: AdminCategorySerializer},
        operation_id="admin_category_create",
    )
    def post(self, request):
        serializer = AdminCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = create_category_as_admin(
            actor=request.user, data=serializer.validated_data
        )
        return Response(AdminCategorySerializer(category).data, status=status.HTTP_201_CREATED)


class AdminCategoryDetailView(APIView):
    permission_classes = [IsStaffUser]

    @extend_schema(
        request=AdminCategoryUpdateSerializer,
        responses={200: AdminCategorySerializer},
        operation_id="admin_category_update",
    )
    def patch(self, request, pk):
        serializer = AdminCategoryUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = update_category_as_admin(
            actor=request.user, category_id=pk, data=serializer.validated_data
        )
        return Response(AdminCategorySerializer(category).data)


class AdminAuditListView(APIView):
    permission_classes = [IsStaffUser]

    @extend_schema(
        responses={200: UnifiedAuditEntrySerializer(many=True)},
        operation_id="admin_audit_list",
    )
    def get(self, request):
        source = (request.query_params.get("source") or "all").strip().lower()
        if source not in {"all", "admin", "commitments"}:
            source = "all"
        q = (request.query_params.get("q") or "").strip()
        try:
            limit = min(max(int(request.query_params.get("limit", 100)), 1), 250)
        except (TypeError, ValueError):
            limit = 100
        entries = list_unified_audit_entries(source=source, query=q, limit=limit)
        return Response(UnifiedAuditEntrySerializer(entries, many=True).data)

