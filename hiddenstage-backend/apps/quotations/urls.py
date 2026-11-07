from django.urls import path

from apps.quotations import views

app_name = "quotations"

urlpatterns = [
    path(
        "provider/quotations/",
        views.ProviderQuotationListCreateView.as_view(),
        name="provider-quotations",
    ),
    path(
        "provider/quotations/<uuid:pk>/",
        views.ProviderQuotationDetailView.as_view(),
        name="provider-quotation-detail",
    ),
    path(
        "provider/quotations/<uuid:pk>/revisions/",
        views.ProviderRevisionCreateView.as_view(),
        name="provider-revision-create",
    ),
    path(
        "provider/quotations/<uuid:pk>/revisions/<uuid:revision_pk>/",
        views.ProviderRevisionDetailView.as_view(),
        name="provider-revision-detail",
    ),
    path(
        "provider/quotations/<uuid:pk>/revisions/<uuid:revision_pk>/submit/",
        views.ProviderRevisionSubmitView.as_view(),
        name="provider-revision-submit",
    ),
    path(
        "provider/quotations/<uuid:pk>/withdraw/",
        views.ProviderQuotationWithdrawView.as_view(),
        name="provider-quotation-withdraw",
    ),
    path(
        "events/<uuid:event_pk>/quotations/",
        views.EventQuotationListView.as_view(),
        name="event-quotations",
    ),
]
