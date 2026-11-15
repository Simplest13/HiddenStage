from django.urls import path

from apps.matching import views

app_name = "matching"

urlpatterns = [
    path("providers/", views.ProviderDiscoveryView.as_view(), name="provider-discovery"),
    path(
        "provider/opportunities/",
        views.ProviderOpportunityListView.as_view(),
        name="provider-opportunities",
    ),
    path("providers/<uuid:pk>/", views.ProviderDetailView.as_view(), name="provider-detail"),
]
