from django.urls import path

from apps.commitments import views

app_name = "commitments"

urlpatterns = [
    path(
        "quotations/<uuid:pk>/acceptance/",
        views.QuotationAcceptanceView.as_view(),
        name="quotation-acceptance",
    ),
    path(
        "commitments/",
        views.CustomerCommitmentListView.as_view(),
        name="customer-commitments",
    ),
    path(
        "provider/commitments/",
        views.ProviderCommitmentListView.as_view(),
        name="provider-commitments",
    ),
    path(
        "commitments/<uuid:pk>/",
        views.CommitmentDetailView.as_view(),
        name="commitment-detail",
    ),
    path(
        "commitments/<uuid:pk>/release/",
        views.CommitmentReleaseView.as_view(),
        name="commitment-release",
    ),
]
