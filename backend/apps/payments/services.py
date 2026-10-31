from decimal import Decimal
import datetime
from django.db import transaction
from django.core.exceptions import ValidationError
from apps.invoices.models import Invoice, InvoiceStatus
from apps.audit.models import AuditEvent
from .models import Payment

class PaymentService:
    """
    Transaction-safe payment recording and balance allocation engine.
    Ensures strict validation, prevents overpayment, and transitions invoice status.
    Designed to easily plug in online payment gateway webhooks (Stripe / Razorpay).
    """

    @classmethod
    def record_payment(cls, invoice_id, amount, payment_method, transaction_reference='', notes='', payment_date=None, user=None):
        if amount <= Decimal('0.00'):
            raise ValidationError("Payment amount must be greater than zero.")

        pay_date = payment_date or datetime.date.today()

        with transaction.atomic():
            invoice = Invoice.objects.select_for_update().select_related('customer').get(id=invoice_id)

            if invoice.status in [InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED]:
                raise ValidationError(f"Cannot record payment for invoice in status: {invoice.status}.")

            if amount > invoice.balance_due:
                raise ValidationError(
                    f"Payment amount (${amount}) exceeds remaining balance due (${invoice.balance_due}). Overpayment is not permitted."
                )

            payment = Payment.objects.create(
                invoice=invoice,
                customer=invoice.customer,
                amount=amount,
                payment_method=payment_method,
                payment_date=pay_date,
                transaction_reference=transaction_reference,
                notes=notes
            )

            # Update invoice balance
            new_paid_amount = invoice.paid_amount + amount
            new_balance_due = invoice.total_amount - new_paid_amount
            invoice.paid_amount = new_paid_amount
            invoice.balance_due = max(Decimal('0.00'), new_balance_due)

            if invoice.balance_due == Decimal('0.00'):
                invoice.status = InvoiceStatus.PAID
            else:
                invoice.status = InvoiceStatus.PARTIALLY_PAID

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

            return payment

