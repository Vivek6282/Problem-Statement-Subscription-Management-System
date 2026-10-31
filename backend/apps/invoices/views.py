from django.http import HttpResponse
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
import datetime

from apps.accounts.permissions import CustomerAccessPolicyPermission, IsStaffOrAdmin
from apps.audit.models import AuditEvent
from .models import Invoice, InvoiceItem, InvoiceStatus
from .serializers import InvoiceSerializer, InvoiceCreateSerializer
from .pdf import generate_invoice_pdf
from decimal import Decimal

class InvoiceViewSet(viewsets.ModelViewSet):
    """
    Invoice management and financial operations.
    """
    queryset = Invoice.objects.all().select_related('customer', 'subscription').prefetch_related('items').order_by('-issue_date', '-created_at')
    permission_classes = [CustomerAccessPolicyPermission]
    filterset_fields = ['status', 'customer', 'subscription']
    search_fields = ['invoice_number', 'customer__name', 'customer__company']

    def get_serializer_class(self):
        if self.action in ['create']:
            return InvoiceCreateSerializer
        return InvoiceSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(InvoiceSerializer(instance).data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Invoice.objects.none()

        # Update overdue records if due date has passed
        today = datetime.date.today()
        Invoice.objects.filter(
            due_date__lt=today,
            status__in=[InvoiceStatus.CONFIRMED, InvoiceStatus.PARTIALLY_PAID],
            balance_due__gt=0
        ).update(status=InvoiceStatus.OVERDUE)

        if user.is_staff_user:
            return self.queryset
        return self.queryset.filter(customer__user=user)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        invoice = self.get_object()
        pdf_bytes = generate_invoice_pdf(invoice)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{invoice.invoice_number}.pdf"'
        return response

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin])
    def confirm(self, request, pk=None):
        inv = self.get_object()
        if inv.status != InvoiceStatus.DRAFT:
            return Response({'error': f"Only DRAFT invoices can be confirmed. Current status: {inv.status}"}, status=status.HTTP_400_BAD_REQUEST)

        inv.status = InvoiceStatus.CONFIRMED
        inv.save(update_fields=['status', 'updated_at'])

        AuditEvent.log_event(
            action='INVOICE_CONFIRMED',
            entity_type='Invoice',
            entity_id=inv.invoice_number,
            description="Invoice moved from DRAFT to CONFIRMED.",
            user=request.user
        )
        return Response(InvoiceSerializer(inv).data)

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin])
    def cancel(self, request, pk=None):
        inv = self.get_object()
        if inv.paid_amount > 0:
            return Response({'error': "Cannot cancel an invoice with recorded payments."}, status=status.HTTP_400_BAD_REQUEST)

        inv.status = InvoiceStatus.CANCELLED
        inv.balance_due = 0
        inv.save(update_fields=['status', 'balance_due', 'updated_at'])

        AuditEvent.log_event(
            action='INVOICE_CANCELLED',
            entity_type='Invoice',
            entity_id=inv.invoice_number,
            description="Invoice cancelled.",
            user=request.user
        )
        return Response(InvoiceSerializer(inv).data)

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin], url_path='send-email')
    def send_email_notification(self, request, pk=None):
        inv = self.get_object()
        customer = inv.customer
        subject = f"Invoice {inv.invoice_number} from Brightloop"
        message = (
            f"Dear {customer.name},\n\n"
            f"Here are the details of your invoice {inv.invoice_number}:\n"
            f"Issue Date: {inv.issue_date}\n"
            f"Due Date: {inv.due_date}\n"
            f"Total Amount: ${inv.total_amount:,.2f}\n"
            f"Balance Due: ${inv.balance_due:,.2f}\n\n"
            f"You can view and settle your invoice in the customer portal.\n\n"
            f"Best regards,\nBrightloop Billing Team"
        )
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[customer.email],
            fail_silently=True
        )

        AuditEvent.log_event(
            action='INVOICE_EMAILED',
            entity_type='Invoice',
            entity_id=inv.invoice_number,
            description=f"Invoice emailed to {customer.email}",
            user=request.user
        )

        return Response({'message': f"Invoice sent to {customer.email}"})

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin], url_path='add-item')
    def add_item(self, request, pk=None):
        inv = self.get_object()
        if inv.status in [InvoiceStatus.PAID, InvoiceStatus.CANCELLED]:
            return Response({'error': "Cannot add items to paid or cancelled invoices."}, status=status.HTTP_400_BAD_REQUEST)

        product_name = request.data.get('product_name', 'Professional Consulting & Support')
        quantity = int(request.data.get('quantity', 1))
        unit_price = Decimal(str(request.data.get('unit_price', '500.00')))
        discount_amount = Decimal(str(request.data.get('discount_amount', '0.00')))
        tax_amount = Decimal(str(request.data.get('tax_amount', '0.00')))
        line_total = (Decimal(quantity) * unit_price) - discount_amount + tax_amount

        InvoiceItem.objects.create(
            invoice=inv,
            product_name=product_name,
            product_sku=request.data.get('product_sku', 'SRV-CUSTOM'),
            variant_name=request.data.get('variant_name', ''),
            quantity=quantity,
            unit_price=unit_price,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            line_total=line_total
        )
        inv.recalculate_totals()

        AuditEvent.log_event(
            action='INVOICE_ITEM_ADDED',
            entity_type='Invoice',
            entity_id=inv.invoice_number,
            description=f"Added item '{product_name}' (${line_total:,.2f}) to invoice {inv.invoice_number}.",
            user=request.user
        )
        return Response(InvoiceSerializer(inv).data)
