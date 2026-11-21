from django.urls import path

from apps.matching import views

app_name = "matching"

urlpatterns = [
    path("directory/providers/", views.PublicDirectoryView.as_view(), name="public-directory"),
    path("providers/", views.ProviderDiscoveryView.as_view(), name="provider-discovery"),
    path(
        "provider/opportunities/",
        views.ProviderOpportunityListView.as_view(),
        name="provider-opportunities",
    ),
    path("providers/<str:pk>/", views.ProviderDetailView.as_view(), name="provider-detail"),
]
