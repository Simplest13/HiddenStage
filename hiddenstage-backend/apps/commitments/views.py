from uuid import uuid4
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Notification
from apps.commitments.models import Commitment, Invoice, PaymentTransaction
from apps.commitments.serializers import (
    AcceptanceRequestSerializer,
    CommitmentDetailSerializer,
    CommitmentSerializer,
    InvoiceSerializer,
    PaymentTransactionSerializer,
    ReleaseRequestSerializer,
)
from apps.commitments.services import accept_quotation, release_commitment
from apps.core.permissions import IsCustomer, IsCustomerOrProvider

COMMITMENT_QUERYSET = Commitment.objects.select_related(
    "event", "provider", "provider__provider_profile", "customer", "revision"
).prefetch_related("lines__requirement")


def _commitment_detail(pk):
    return Commitment.objects.select_related(
        "event", "provider", "customer", "revision"
    ).prefetch_related("lines__requirement", "audit_entries__actor").get(pk=pk)


class QuotationAcceptanceView(APIView):
    """Customer accepts a submitted revision, in whole packages or single lines."""

    permission_classes = [IsCustomer]

    @extend_schema(request=AcceptanceRequestSerializer, responses={201: CommitmentSerializer})
    def post(self, request, pk):
        payload = AcceptanceRequestSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        commitment = accept_quotation(
            actor=request.user,
            quotation_id=pk,
            revision_id=payload.validated_data["revision_id"],
            package_keys=payload.validated_data["package_keys"],
            requirement_ids=payload.validated_data["requirement_ids"],
        )
        return Response(
            CommitmentDetailSerializer(_commitment_detail(commitment.pk)).data,
            status=status.HTTP_201_CREATED,
        )


class CustomerCommitmentListView(generics.ListAPIView):
    permission_classes = [IsCustomerOrProvider]
    serializer_class = CommitmentSerializer

    def get_queryset(self):
        if self.request.user.is_provider:
            return COMMITMENT_QUERYSET.filter(provider=self.request.user)
        return COMMITMENT_QUERYSET.filter(customer=self.request.user)


class ProviderCommitmentListView(generics.ListAPIView):
    permission_classes = [IsCustomerOrProvider]
    serializer_class = CommitmentSerializer

    def get_queryset(self):
        return COMMITMENT_QUERYSET.filter(provider=self.request.user)


class CommitmentDetailView(APIView):
    permission_classes = [IsCustomerOrProvider]

    def get_commitment(self, request, pk):
        commitment = _commitment_detail(pk)
        user = request.user
        if (
            commitment.customer_id != user.id
            and commitment.provider_id != user.id
            and not user.is_staff
        ):
            raise PermissionDenied("This commitment is not available to your account.")
        return commitment

    @extend_schema(responses={200: CommitmentDetailSerializer})
    def get(self, request, pk):
        return Response(CommitmentDetailSerializer(self.get_commitment(request, pk)).data)


class CommitmentReleaseView(APIView):
    permission_classes = [IsCustomerOrProvider]

    @extend_schema(request=ReleaseRequestSerializer, responses={200: CommitmentDetailSerializer})
    def post(self, request, pk):
        payload = ReleaseRequestSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        commitment = release_commitment(
            actor=request.user, commitment_id=pk, reason=payload.validated_data.get("reason", "")
        )
        return Response(
            CommitmentDetailSerializer(_commitment_detail(commitment.pk)).data
        )


class CustomerPaymentsSummaryView(APIView):
    permission_classes = [IsCustomer]

    def get(self, request):
        user = request.user
        commits = Commitment.objects.filter(customer=user, status="ACTIVE").select_related("event")
        invoices = Invoice.objects.filter(customer=user).select_related("event", "provider")

        total_booked = sum(c.total_paise for c in commits)
        paid_invoices = invoices.filter(status="PAID")
        total_paid = sum(i.amount_paise for i in paid_invoices)

        advance_pending = sum(
            i.amount_paise
            for i in invoices.filter(status__in=["PAYMENT_PENDING", "ADVANCE_PENDING"])
        )
        final_pending = max(0, total_booked - total_paid - advance_pending)

        events_map = {}
        for c in commits:
            ev = c.event
            if ev.id not in events_map:
                events_map[ev.id] = {
                    "event_id": str(ev.id),
                    "event_name": ev.name,
                    "event_date": ev.event_date,
                    "total_booked_paise": 0,
                    "total_paid_paise": 0,
                    "invoices_count": 0,
                    "status": ev.status,
                }
            events_map[ev.id]["total_booked_paise"] += c.total_paise

        for inv in invoices:
            ev_id = inv.event_id
            if ev_id in events_map:
                events_map[ev_id]["invoices_count"] += 1
                if inv.status == "PAID":
                    events_map[ev_id]["total_paid_paise"] += inv.amount_paise

        return Response(
            {
                "total_booked_paise": total_booked,
                "total_paid_paise": total_paid,
                "advance_pending_paise": advance_pending,
                "final_pending_paise": final_pending,
                "event_breakdown": list(events_map.values()),
            }
        )


class CustomerInvoicesListView(APIView):
    permission_classes = [IsCustomer]

    @extend_schema(operation_id="payments_invoices_list")
    def get(self, request):
        status_param = request.query_params.get("status")
        event_id = request.query_params.get("event_id")
        qs = Invoice.objects.filter(customer=request.user).select_related(
            "event", "provider", "provider__provider_profile"
        )
        if status_param and status_param != "ALL":
            qs = qs.filter(status=status_param.upper())
        if event_id:
            qs = qs.filter(event_id=event_id)
        serializer = InvoiceSerializer(qs, many=True)
        return Response(serializer.data)


class CustomerInvoiceDetailView(APIView):
    permission_classes = [IsCustomer]

    @extend_schema(operation_id="payments_invoices_detail")
    def get(self, request, pk):
        invoice = (
            Invoice.objects.filter(customer=request.user, pk=pk)
            .select_related("event", "provider", "provider__provider_profile")
            .first()
        )
        if not invoice:
            return Response(
                {"detail": "Invoice not found."}, status=status.HTTP_404_NOT_FOUND
            )
        serializer = InvoiceSerializer(invoice)
        return Response(serializer.data)


class CustomerPaymentTransactionsListView(APIView):
    permission_classes = [IsCustomer]

    def get(self, request):
        qs = PaymentTransaction.objects.filter(customer=request.user).select_related(
            "invoice"
        )
        serializer = PaymentTransactionSerializer(qs, many=True)
        return Response(serializer.data)


class SimulatePaymentView(APIView):
    permission_classes = [IsCustomer]

    def post(self, request):
        invoice_id = request.data.get("invoice_id")
        with transaction.atomic():
            invoice = (
                Invoice.objects.select_for_update()
                .filter(customer=request.user, pk=invoice_id)
                .select_related("event", "provider")
                .first()
            )
            if not invoice:
                return Response(
                    {"detail": "Invoice not found."}, status=status.HTTP_404_NOT_FOUND
                )

            if invoice.status == "PAID":
                return Response(
                    {"detail": "This invoice is already paid."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            ref = f"PAY-{uuid4().hex[:10].upper()}"
            tx = PaymentTransaction.objects.create(
                invoice=invoice,
                customer=request.user,
                amount_paise=invoice.amount_paise,
                method="SIMULATED_ESCROW",
                reference=ref,
                status="COMPLETED",
                paid_at=timezone.now(),
            )
            invoice.status = "PAID"
            invoice.save(update_fields=["status"])

        amount_inr = invoice.amount_paise // 100
        Notification.objects.create(
            user=request.user,
            event=invoice.event,
            title="Payment Successful (Escrow)",
            message=f"₹{amount_inr:,} paid securely for {invoice.event.name}. Funds are held safely in escrow.",
            notification_type="PAYMENT",
            action_url="/app/payments",
        )
        Notification.objects.create(
            user=invoice.provider,
            event=invoice.event,
            title="Payment Received in Escrow",
            message=f"₹{amount_inr:,} received for {invoice.event.name} from {request.user.full_name}. Funds held in escrow.",
            notification_type="PAYMENT",
            action_url="/app/provider/commitments",
        )

        return Response(
            {
                "detail": "Payment completed successfully.",
                "transaction": PaymentTransactionSerializer(tx).data,
                "invoice": InvoiceSerializer(invoice).data,
            }
        )
