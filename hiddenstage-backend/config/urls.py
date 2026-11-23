"""Root URL configuration. The versioned API lives entirely under /api/v1/."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from apps.accounts.views import AvatarMediaView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", include("apps.core.urls")),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.profiles.urls")),
    path("api/v1/", include("apps.events.urls")),
    path("api/v1/", include("apps.matching.urls")),
    path("api/v1/", include("apps.invitations.urls")),
    path("api/v1/", include("apps.quotations.urls")),
    path("api/v1/", include("apps.commitments.urls")),
    path("api/v1/", include("apps.network.urls")),
    path("api/v1/admin/", include("apps.administration.urls")),
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/v1/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/v1/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
    path(
        "private-media/avatars/<str:filename>",
        AvatarMediaView.as_view(),
        name="private-media-avatar",
    ),
]

if settings.DEBUG:
    # Development convenience only. Attachments are still authorized by views;
    # this route is never enabled with DEBUG off.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
