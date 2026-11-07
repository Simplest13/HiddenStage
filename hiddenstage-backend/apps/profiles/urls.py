from django.urls import path

from apps.profiles import views

app_name = "profiles"

urlpatterns = [
    path("catalog/categories/", views.ServiceCategoryListView.as_view(), name="categories"),
    path(
        "me/customer-profile/",
        views.CustomerProfileView.as_view(),
        name="customer-profile",
    ),
    path(
        "me/provider-profile/",
        views.ProviderProfileView.as_view(),
        name="provider-profile",
    ),
    path(
        "me/provider-services/",
        views.ProviderServiceListCreateView.as_view(),
        name="provider-services",
    ),
    path(
        "me/provider-services/<uuid:pk>/",
        views.ProviderServiceDetailView.as_view(),
        name="provider-service-detail",
    ),
    path(
        "me/provider-coverage/",
        views.ProviderCoverageListCreateView.as_view(),
        name="provider-coverage",
    ),
    path(
        "me/provider-coverage/<uuid:pk>/",
        views.ProviderCoverageDetailView.as_view(),
        name="provider-coverage-detail",
    ),
]
