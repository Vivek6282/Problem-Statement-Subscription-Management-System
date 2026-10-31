from decimal import Decimal, ROUND_HALF_UP
import datetime
from django.db import transaction, IntegrityError
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.invoices.models import Invoice, InvoiceStatus
from apps.audit.models import AuditEvent
from .models import Payment, PaymentStatus


class PaymentService:
    """
    Transaction-safe payment recording, allocation and reversal.
    Ensures strict validation, prevents overpayment and duplicates, and keeps the invoice status
    (Paid / Partially Paid / Overdue / Confirmed) derived from the actual money received.
    Designed to easily plug in online payment gateway webhooks (Stripe / Razorpay).
    """

    DUPLICATE_WINDOW_SECONDS = 15

    @classmethod
    def record_payment(cls, invoice_id, amount, payment_method, transaction_reference='', notes='', payment_date=None, user=None):
        amount = Decimal(amount).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        if amount <= Decimal('0.00'):
            raise ValidationError("Payment amount must be greater than zero.")

        pay_date = payment_date or datetime.date.today()
        if pay_date > datetime.date.today():
            raise ValidationError("Payment date cannot be in the future.")
        transaction_reference = (transaction_reference or '').strip()

        with transaction.atomic():
            invoice = Invoice.objects.select_for_update().select_related('customer').get(id=invoice_id)

            if invoice.status in [InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED]:
                raise ValidationError(f"Cannot record payment for invoice in status: {invoice.status}.")
            if invoice.balance_due <= Decimal('0.00'):
                raise ValidationError("This invoice has no outstanding balance.")

            if amount > invoice.balance_due:
                raise ValidationError(
                    f"Payment amount (${amount}) exceeds remaining balance due (${invoice.balance_due}). Overpayment is not permitted."
                )

            # Duplicate protection: same external reference, or an identical payment submitted moments ago (double click / retry)
            if transaction_reference and Payment.objects.filter(
                invoice=invoice, transaction_reference=transaction_reference
            ).exists():
                raise ValidationError(f"A payment with reference '{transaction_reference}' is already recorded for this invoice.")
            recent = timezone.now() - datetime.timedelta(seconds=cls.DUPLICATE_WINDOW_SECONDS)
            if Payment.objects.filter(
                invoice=invoice, amount=amount, payment_method=payment_method, payment_date=pay_date,
                status=PaymentStatus.COMPLETED, created_at__gte=recent,
            ).exists():
                raise ValidationError("An identical payment was just recorded for this invoice. Duplicate payment prevented.")

            try:
                with transaction.atomic():
                    payment = Payment.objects.create(
                        invoice=invoice,
                        customer=invoice.customer,
                        amount=amount,
                        payment_method=payment_method,
                        payment_date=pay_date,
                        transaction_reference=transaction_reference,
                        notes=notes
                    )
            except IntegrityError:
                raise ValidationError("This payment reference has already been recorded.")

            invoice.paid_amount = invoice.paid_amount + amount
            invoice.balance_due = max(Decimal('0.00'), invoice.total_amount - invoice.paid_amount)
            invoice.refresh_payment_status()
            invoice.save(update_fields=['paid_amount', 'balance_due', 'status', 'updated_at'])

            AuditEvent.log_event(
                action='PAYMENT_RECORDED',
                entity_type='Payment',
                entity_id=payment.payment_number,
                description=f"Recorded {payment_method} payment of ${amount} for invoice {invoice.invoice_number}. New balance: ${invoice.balance_due}.",
                user=user,
                metadata={
                    'invoice_number': invoice.invoice_number,
                    'customer_id': invoice.customer.id,
                    'amount': str(amount),
                    'payment_method': payment_method,
                    'reference': transaction_reference
                }
            )
            # Also visible on the invoice's own history
            AuditEvent.log_event(
                action='INVOICE_PAYMENT_RECEIVED', entity_type='Invoice', entity_id=invoice.invoice_number,
                description=f"Payment {payment.payment_number} of ${amount} received. Status: {invoice.status}.", user=user,
            )
            return payment

    @classmethod
    def reverse_payment(cls, payment_id, reason='', user=None):
        """Marks a payment as reversed (kept for the record) and restores the invoice balance."""
        with transaction.atomic():
            payment = Payment.objects.select_for_update().get(id=payment_id)
            invoice = Invoice.objects.select_for_update().get(id=payment.invoice_id)
            if payment.status == PaymentStatus.REVERSED:
                raise ValidationError("This payment has already been reversed.")

            payment.status = PaymentStatus.REVERSED
            payment.reversed_at = timezone.now()
            payment.reversal_reason = (reason or '')[:255]
            payment.save(update_fields=['status', 'reversed_at', 'reversal_reason'])

            invoice.paid_amount = max(Decimal('0.00'), invoice.paid_amount - payment.amount)
            invoice.balance_due = invoice.total_amount - invoice.paid_amount
            invoice.refresh_payment_status()
            invoice.save(update_fields=['paid_amount', 'balance_due', 'status', 'updated_at'])

            AuditEvent.log_event(
                action='PAYMENT_REVERSED', entity_type='Payment', entity_id=payment.payment_number,
                description=f"Payment of ${payment.amount} on {invoice.invoice_number} reversed. Reason: {reason or 'n/a'}.",
                user=user, metadata={'invoice_number': invoice.invoice_number, 'amount': str(payment.amount)},
            )
            AuditEvent.log_event(
                action='INVOICE_PAYMENT_REVERSED', entity_type='Invoice', entity_id=invoice.invoice_number,
                description=f"Payment {payment.payment_number} reversed. Status: {invoice.status}.", user=user,
            )
            return payment
