import os
import uuid
from django.core.cache import cache
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Q
from django.http import FileResponse, Http404, HttpResponseRedirect
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.core.permissions import IsCustomer, IsProvider
from apps.core.validators import validate_portfolio_upload
from apps.profiles.models import (
    CustomerProfile,
    PortfolioItem,
    ProfileTeamMember,
    ProviderCoverage,
    ProviderKind,
    ProviderProfile,
    ProviderService,
    ServiceCategory,
)
from apps.profiles.serializers import (
    CustomerProfileSerializer,
    ManagerSearchSerializer,
    PortfolioItemSerializer,
    ProfileTeamMemberSerializer,
    ProviderCoverageSerializer,
    ProviderProfileSerializer,
    ProviderServiceSerializer,
    ServiceCategorySerializer,
    CustomCategoryCreateSerializer,
)


class ServiceCategoryListView(generics.ListAPIView):
    """Public taxonomy used by event requirements and provider onboarding."""

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = ServiceCategorySerializer
    pagination_class = None
    queryset = ServiceCategory.objects.filter(is_active=True).order_by("sort_order", "name")

    def list(self, request, *args, **kwargs):
        cached = cache.get("categories:all_active")
        if cached is not None:
            res = Response(cached)
            res["Cache-Control"] = "public, max-age=3600, stale-while-revalidate=86400"
            return res
        response = super().list(request, *args, **kwargs)
        cache.set("categories:all_active", response.data, timeout=3600)
        response["Cache-Control"] = "public, max-age=3600, stale-while-revalidate=86400"
        return response


class CustomCategoryCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=CustomCategoryCreateSerializer,
        responses={201: ServiceCategorySerializer, 200: ServiceCategorySerializer},
    )
    def post(self, request):
        serializer = CustomCategoryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        name = serializer.validated_data["name"]
        description = serializer.validated_data.get("description", "")

        from django.utils.text import slugify
        code = slugify(name)[:60]
        if not code:
            raise ValidationError({"name": ["Enter a valid category name."]})

        existing = ServiceCategory.objects.filter(
            Q(code=code) | Q(name__iexact=name)
        ).first()

        if existing:
            if not existing.is_active:
                existing.is_active = True
                existing.save(update_fields=["is_active"])
                cache.delete("categories:all_active")
            return Response(ServiceCategorySerializer(existing).data, status=status.HTTP_200_OK)

        category = ServiceCategory.objects.create(
            code=code,
            name=name,
            description=description,
            sort_order=100,
            is_active=True,
            is_custom=True,
            created_by=request.user,
        )
        cache.delete("categories:all_active")
        return Response(ServiceCategorySerializer(category).data, status=status.HTTP_201_CREATED)


class CustomerProfileView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: CustomerProfileSerializer})
    def get(self, request):
        if not getattr(request.user, "is_customer", False):
            return Response(None)
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
        if not getattr(request.user, "is_customer", False):
            return Response(
                {"detail": "This action is only available to customer accounts."},
                status=status.HTTP_403_FORBIDDEN,
            )
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
        profile_id = request.query_params.get("profile_id")
        if profile_id:
            profile = ProviderProfile.objects.filter(id=profile_id).first()
            if profile is None:
                return Response({"detail": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)
            if profile.user != request.user:
                membership = ProfileTeamMember.objects.filter(
                    owner=profile.user, member=request.user, is_active=True
                ).first()
                if not membership or "MANAGE_BUSINESS_PROFILE" not in (membership.permissions or []):
                    return Response(
                        {"detail": "You do not have permission to edit this profile."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                target_user = profile.user
            else:
                target_user = request.user
        else:
            profile = ProviderProfile.objects.filter(user=request.user).first()
            target_user = request.user

        if profile is None and partial:
            # A patch cannot create a profile: display_name and contact are required.
            partial = False
        serializer = ProviderProfileSerializer(
            instance=profile, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        profile = serializer.save(user=target_user)
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


class ManagerSearchView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={200: ManagerSearchSerializer(many=True)})
    def get(self, request):
        query = (request.query_params.get("q") or "").strip()
        queryset = ProviderProfile.objects.filter(
            kind=ProviderKind.MANAGER,
            user__is_active=True,
            completed_at__isnull=False,
        ).select_related("business", "user")
        if query:
            clean_query = query.lstrip("@")
            filters = (
                Q(display_name__icontains=clean_query)
                | Q(username__iexact=clean_query)
                | Q(username__icontains=clean_query)
                | Q(user__username__iexact=clean_query)
                | Q(user__username__icontains=clean_query)
                | Q(business__name__icontains=clean_query)
            )
            try:
                import uuid
                val_uuid = uuid.UUID(clean_query)
                filters |= Q(id=val_uuid) | Q(user_id=val_uuid)
            except (ValueError, AttributeError):
                pass
            queryset = queryset.filter(filters)
        return Response(ManagerSearchSerializer(queryset[:20], many=True).data)


def _managed_portfolio_owners(user):
    memberships = ProfileTeamMember.objects.filter(member=user, is_active=True).only("owner_id", "permissions")
    return [m.owner_id for m in memberships if "MANAGE_PORTFOLIO" in (m.permissions or [])]


class PortfolioItemListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PortfolioItemSerializer
    pagination_class = None

    def get_queryset(self):
        target_user = self.request.query_params.get("user_id")
        target_username = self.request.query_params.get("username")
        if target_user or target_username:
            q = Q(visibility="PUBLIC")
            if target_user:
                q &= Q(owner_id=target_user)
            if target_username:
                q &= Q(provider__username__iexact=target_username.lstrip("@"))
            return PortfolioItem.objects.filter(q).order_by("position", "-created_at")

        user = self.request.user
        managed_owners = _managed_portfolio_owners(user)
        return PortfolioItem.objects.filter(
            Q(owner=user) | Q(owner_id__in=managed_owners)
        ).order_by("position", "-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        owner = user
        owner_id = self.request.data.get("owner_id")
        if owner_id and str(owner_id) != str(user.id):
            if owner_id not in _managed_portfolio_owners(user) and str(owner_id) not in [str(x) for x in _managed_portfolio_owners(user)]:
                raise PermissionDenied("You do not have permission to manage this portfolio.")
            owner = User.objects.get(id=owner_id)

        provider = getattr(owner, "provider_profile", None)
        position = PortfolioItem.objects.filter(owner=owner).count()
        if position >= 50:
            raise ValidationError({"portfolio": "Maximum limit of 50 portfolio items reached."})

        media_file = self.request.FILES.get("media") or self.request.FILES.get("file")
        if media_file:
            media_kind = validate_portfolio_upload(media_file)
            ext = os.path.splitext(media_file.name)[1].lower()
            safe_name = f"portfolio/{uuid.uuid4().hex}{ext}"
            saved_path = default_storage.save(safe_name, media_file)
            media_url = f"/api/v1/media/portfolio/{os.path.basename(saved_path)}"
            serializer.save(
                owner=owner,
                provider=provider,
                position=position,
                media=media_url,
                media_kind=media_kind,
            )
        else:
            serializer.save(owner=owner, provider=provider, position=position)


class PortfolioItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PortfolioItemSerializer
    lookup_field = "pk"

    def get_queryset(self):
        user = self.request.user
        managed_owners = _managed_portfolio_owners(user)
        return PortfolioItem.objects.filter(
            Q(owner=user) | Q(owner_id__in=managed_owners)
        )

    def perform_update(self, serializer):
        media_file = self.request.FILES.get("media") or self.request.FILES.get("file")
        if media_file:
            media_kind = validate_portfolio_upload(media_file)
            ext = os.path.splitext(media_file.name)[1].lower()
            safe_name = f"portfolio/{uuid.uuid4().hex}{ext}"
            saved_path = default_storage.save(safe_name, media_file)
            media_url = f"/api/v1/media/portfolio/{os.path.basename(saved_path)}"
            serializer.save(media=media_url, media_kind=media_kind)
        else:
            serializer.save()


class PortfolioMediaView(APIView):
    """Serve uploaded portfolio showcase media files publicly."""

    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request, filename):
        safe_name = os.path.basename(filename)
        if not safe_name or ".." in filename:
            raise Http404("Invalid media filename.")

        path = f"portfolio/{safe_name}"
        if not default_storage.exists(path):
            raise Http404("Portfolio media not found.")

        url = default_storage.url(path)
        if url and (url.startswith("http://") or url.startswith("https://")):
            return HttpResponseRedirect(url)

        file_obj = default_storage.open(path)
        content_type = "image/jpeg"
        lower = filename.lower()
        if lower.endswith(".png"):
            content_type = "image/png"
        elif lower.endswith(".webp"):
            content_type = "image/webp"
        elif lower.endswith(".gif"):
            content_type = "image/gif"
        elif lower.endswith(".pdf"):
            content_type = "application/pdf"
        return FileResponse(file_obj, content_type=content_type)


class PortfolioReorderView(APIView):
    permission_classes = [IsProvider]

    def post(self, request):
        order = request.data.get("order", [])
        user = request.user
        managed_owners = _managed_portfolio_owners(user)
        items = {
            str(item.id): item
            for item in PortfolioItem.objects.filter(
                Q(owner=user) | Q(owner_id__in=managed_owners)
            )
        }
        with transaction.atomic():
            for position, item_id in enumerate(order):
                if str(item_id) in items:
                    item = items[str(item_id)]
                    item.position = position
                    item.save(update_fields=["position"])
        ordered = PortfolioItem.objects.filter(
            Q(owner=user) | Q(owner_id__in=managed_owners)
        ).order_by("position", "-created_at")
        return Response(PortfolioItemSerializer(ordered, many=True).data)


class ProfileTeamMemberListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsProvider]
    serializer_class = ProfileTeamMemberSerializer
    pagination_class = None

    def get_queryset(self):
        return ProfileTeamMember.objects.filter(owner=self.request.user).select_related("member")

    def perform_create(self, serializer):
        user = self.request.user
        profile = getattr(user, "provider_profile", None)
        if not profile or profile.kind != ProviderKind.MANAGER:
            raise PermissionDenied("Only Managers can add assistant team members.")
        email = (self.request.data.get("email") or self.request.data.get("invite_email") or "").strip().lower()
        if not email:
            raise ValidationError({"email": "Assistant email is required."})
        target_member = User.objects.filter(email=email, is_active=True).first()
        if not target_member:
            raise ValidationError({"email": f"No active user found with email {email}."})
        if target_member.id == user.id:
            raise ValidationError({"email": "You cannot add yourself as a team member."})
        serializer.save(owner=user, member=target_member)


class ProfileTeamMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsProvider]
    serializer_class = ProfileTeamMemberSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return ProfileTeamMember.objects.filter(owner=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.permissions = []
        instance.save(update_fields=["is_active", "permissions"])

