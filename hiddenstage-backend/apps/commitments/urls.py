from django.urls import path

from apps.commitments import views

app_name = "commitments"

urlpatterns = [
    path(
        "payments/summary/",
        views.CustomerPaymentsSummaryView.as_view(),
        name="customer-payments-summary",
    ),
    path(
        "payments/invoices/",
        views.CustomerInvoicesListView.as_view(),
        name="customer-invoices",
    ),
    path(
        "payments/invoices/<uuid:pk>/",
        views.CustomerInvoiceDetailView.as_view(),
        name="customer-invoice-detail",
    ),
    path(
        "payments/transactions/",
        views.CustomerPaymentTransactionsListView.as_view(),
        name="customer-payment-transactions",
    ),
    path(
        "payments/pay/",
        views.SimulatePaymentView.as_view(),
        name="customer-simulate-payment",
    ),
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
