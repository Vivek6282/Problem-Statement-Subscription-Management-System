import logging
from django.http import HttpResponse
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import CustomerAccessPolicyPermission, IsStaffOrAdmin
from apps.audit.models import AuditEvent
from apps.discounts.models import Discount, DiscountRedemption
from apps.payments.models import Payment
from apps.subscriptions.maintenance import mark_overdue_invoices
from decimal import Decimal, InvalidOperation
from apps.subscriptions.pricing import LineSpec, price_document
from .models import Invoice, InvoiceItem, InvoiceStatus
from .serializers import InvoiceSerializer, InvoiceWriteSerializer
from .pdf import generate_invoice_pdf

logger = logging.getLogger(__name__)


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    Invoice management. Draft -> Confirmed -> Paid (payments move an invoice to Partially Paid / Paid).
    Customers can only read their own non-draft invoices and download the PDF.
    Invoices are never deleted (cancel instead) and their status cannot be edited directly.
    """
    permission_classes = [CustomerAccessPolicyPermission]
    customer_actions = ()
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    filterset_fields = {
        'status': ['exact'], 'customer': ['exact'], 'subscription': ['exact'],
        'issue_date': ['gte', 'lte'], 'due_date': ['gte', 'lte'],
    }
    search_fields = ['invoice_number', 'customer__name', 'customer__company', 'subscription__subscription_number']
    ordering_fields = ['issue_date', 'due_date', 'created_at', 'total_amount', 'balance_due', 'invoice_number', 'status']

    def get_queryset(self):
        user = self.request.user
        qs = Invoice.objects.select_related('customer', 'subscription').prefetch_related('items').order_by('-issue_date', '-created_at')
        if not user.is_authenticated:
            return qs.none()
        if self.action == 'list':
            mark_overdue_invoices()  # keep OVERDUE accurate for the status filter (the scheduler also does this daily)
        if user.is_staff_user:
            return qs
        return qs.filter(customer__user=user).exclude(status=InvoiceStatus.DRAFT)

    def get_serializer_class(self):
        if self.action in ('create', 'partial_update', 'update'):
            return InvoiceWriteSerializer
        return InvoiceSerializer

    def _out(self, invoice):
        return InvoiceSerializer(self.get_queryset().get(pk=invoice.pk), context=self.get_serializer_context()).data

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(self._out(serializer.save()), status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response(self._out(serializer.save()))

    def _bad(self, message, code=status.HTTP_400_BAD_REQUEST):
        return Response({'error': message}, status=code)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        invoice = self.get_object()
        pdf_bytes = generate_invoice_pdf(invoice)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{invoice.invoice_number}.pdf"'
        return response

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        inv = self.get_object()
        events = AuditEvent.objects.filter(entity_type='Invoice', entity_id=inv.invoice_number).order_by('-created_at')[:100]
        payments = Payment.objects.filter(invoice=inv).order_by('-payment_date', '-created_at')
        return Response({
            'events': [{'id': e.id, 'action': e.action, 'description': e.description, 'user': e.user_email,
                        'created_at': e.created_at} for e in events],
            'payments': [{'id': p.id, 'payment_number': p.payment_number, 'amount': p.amount, 'method': p.payment_method,
                          'payment_date': p.payment_date, 'status': p.status} for p in payments],
        })

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin])
    def confirm(self, request, pk=None):
        with transaction.atomic():
            inv = Invoice.objects.select_for_update().get(pk=self.get_object().pk)
            if inv.status != InvoiceStatus.DRAFT:
                return self._bad(f"Only DRAFT invoices can be confirmed. Current status: {inv.status}")

            # Manual invoices consume their discount usage on confirmation (recurring ones already did when generated)
            if inv.applied_discounts and not DiscountRedemption.objects.filter(invoice=inv).exists():
                ids = [d['id'] for d in inv.applied_discounts if d.get('id')]
                locked = {d.id: d for d in Discount.objects.select_for_update().filter(id__in=ids)}
                for entry in inv.applied_discounts:
                    d = locked.get(entry.get('id'))
                    if d and d.usage_limit is not None and d.times_redeemed >= d.usage_limit:
                        return self._bad(f"Discount {d.code} has reached its usage limit; edit the invoice to remove it.")
                for entry in inv.applied_discounts:
                    d = locked.get(entry.get('id'))
                    if d:
                        DiscountRedemption.objects.create(discount=d, customer=inv.customer, subscription=inv.subscription,
                                                          invoice=inv, amount_discounted=entry['amount'])
                        Discount.objects.filter(pk=d.pk).update(times_redeemed=F('times_redeemed') + 1)

            inv.status = InvoiceStatus.PAID if inv.balance_due <= 0 else InvoiceStatus.CONFIRMED
            inv.save(update_fields=['status', 'updated_at'])
            AuditEvent.log_event('INVOICE_CONFIRMED', 'Invoice', inv.invoice_number,
                                 "Invoice moved from DRAFT to CONFIRMED.", user=request.user)
        return Response(self._out(inv))

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin])
    def cancel(self, request, pk=None):
        with transaction.atomic():
            inv = Invoice.objects.select_for_update().get(pk=self.get_object().pk)
            if inv.status == InvoiceStatus.CANCELLED:
                return self._bad("Invoice is already cancelled.")
            if inv.paid_amount > 0 or inv.status in (InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID):
                return self._bad("Cannot cancel an invoice with recorded payments. Reverse the payments first.")

            # Cancelling gives any consumed discount usage back
            for redemption in DiscountRedemption.objects.select_for_update().filter(invoice=inv):
                Discount.objects.filter(pk=redemption.discount_id, times_redeemed__gt=0).update(times_redeemed=F('times_redeemed') - 1)
                redemption.delete()

            inv.status = InvoiceStatus.CANCELLED
            inv.balance_due = 0
            inv.save(update_fields=['status', 'balance_due', 'updated_at'])
            AuditEvent.log_event('INVOICE_CANCELLED', 'Invoice', inv.invoice_number, "Invoice cancelled.", user=request.user)
        return Response(self._out(inv))

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin], url_path='send-email')
    def send_email_notification(self, request, pk=None):
        inv = self.get_object()
        if inv.status in (InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED):
            return self._bad(f"A {inv.get_status_display()} invoice cannot be sent. Confirm it first.")
        customer = inv.customer
        subject = f"Invoice {inv.invoice_number} from Brightloop"
        message = (
            f"Dear {customer.name},\n\n"
            f"Here are the details of your invoice {inv.invoice_number}:\n"
            f"Issue Date: {inv.issue_date}\n"
            f"Due Date: {inv.due_date}\n"
            f"Total Amount: ${inv.total_amount:,.2f}\n"
            f"Balance Due: ${inv.balance_due:,.2f}\n\n"
            f"You can view and download your invoice in the customer portal ({settings.FRONTEND_URL}/portal).\n\n"
            f"Best regards,\nBrightloop Billing Team"
        )
        try:
            send_mail(subject=subject, message=message, from_email=settings.DEFAULT_FROM_EMAIL,
                      recipient_list=[customer.email], fail_silently=False)
        except Exception as exc:
            logger.exception("Invoice %s could not be emailed", inv.invoice_number)
            AuditEvent.log_event('INVOICE_EMAIL_FAILED', 'Invoice', inv.invoice_number,
                                 f"Email to {customer.email} failed: {exc}", user=request.user)
            return self._bad(f"The email could not be delivered: {exc}", code=status.HTTP_502_BAD_GATEWAY)

        inv.sent_at = timezone.now()
        inv.save(update_fields=['sent_at', 'updated_at'])
        AuditEvent.log_event('INVOICE_EMAILED', 'Invoice', inv.invoice_number,
                             f"Invoice emailed to {customer.email}", user=request.user)
        backend = settings.EMAIL_BACKEND.rsplit('.', 2)[-2] if '.' in settings.EMAIL_BACKEND else settings.EMAIL_BACKEND
        note = "" if backend != 'console' else " (console email backend: printed to the server log, not delivered - configure SMTP in .env)"
        return Response({'message': f"Invoice sent to {customer.email}{note}", 'email_backend': backend})

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin], url_path='add-item')
    def add_item(self, request, pk=None):
        """Adds a custom line to an open invoice. Tax comes from the tax rules; a client-supplied tax or discount is ignored."""
        with transaction.atomic():
            inv = Invoice.objects.select_for_update().get(pk=self.get_object().pk)
            if inv.status in (InvoiceStatus.PAID, InvoiceStatus.CANCELLED):
                return self._bad("Cannot add items to paid or cancelled invoices.")
            try:
                quantity = int(request.data.get('quantity', 1))
                unit_price = Decimal(str(request.data.get('unit_price', '500.00')))
            except (ValueError, InvalidOperation):
                return self._bad("Quantity and unit price must be numbers.")
            if quantity < 1 or unit_price < 0:
                return self._bad("Quantity must be at least 1 and the unit price cannot be negative.")
            name = (request.data.get('product_name') or 'Professional Consulting & Support')[:255]
            spec = LineSpec(name=name, sku=request.data.get('product_sku', 'SRV-CUSTOM'), variant_name=request.data.get('variant_name', ''),
                            quantity=quantity, unit_price=unit_price)
            line = price_document([spec], on_date=inv.issue_date).lines[0]
            InvoiceItem.objects.create(
                invoice=inv, product_name=name, product_sku=spec.sku, variant_name=spec.variant_name, quantity=quantity,
                unit_price=unit_price, discount_amount=line.discount_total, tax_amount=line.tax,
                line_total=line.total, tax_breakdown=line.tax_breakdown,
            )
            inv.recalculate_totals()
            inv.refresh_from_db()
            inv.refresh_payment_status()
            inv.save(update_fields=['status', 'updated_at'])
            AuditEvent.log_event('INVOICE_ITEM_ADDED', 'Invoice', inv.invoice_number,
                                 f"Added item '{name}' ({line.total}) to invoice {inv.invoice_number}.", user=request.user)
        return Response(self._out(inv))
