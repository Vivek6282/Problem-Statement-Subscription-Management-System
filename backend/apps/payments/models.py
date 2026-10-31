import uuid
import datetime
from decimal import Decimal
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.customers.models import Customer
from apps.invoices.models import Invoice

class PaymentMethod(models.TextChoices):
    BANK_TRANSFER = 'BANK_TRANSFER', _('Bank Transfer')
    UPI = 'UPI', _('UPI')
    CASH = 'CASH', _('Cash')
    CARD = 'CARD', _('Card (Manual Entry / Terminal)')
    OTHER = 'OTHER', _('Other')

class PaymentStatus(models.TextChoices):
    COMPLETED = 'COMPLETED', _('Completed')
    REVERSED = 'REVERSED', _('Reversed')

class Payment(models.Model):
    payment_number = models.CharField(
        _('payment reference'),
        max_length=64,
        unique=True,
        db_index=True,
        blank=True
    )
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.PROTECT,
        related_name='payments'
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name='payments'
    )
    amount = models.DecimalField(
        _('payment amount'),
        max_digits=12,
        decimal_places=2
    )
    payment_method = models.CharField(
        _('payment method'),
        max_length=30,
        choices=PaymentMethod.choices,
        default=PaymentMethod.BANK_TRANSFER
    )
    payment_date = models.DateField(_('payment date'), default=datetime.date.today)
    transaction_reference = models.CharField(_('external transaction / UTR reference'), max_length=150, blank=True)
    notes = models.TextField(_('internal notes'), blank=True)
    status = models.CharField(
        _('status'), max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.COMPLETED, db_index=True
    )
    reversed_at = models.DateTimeField(null=True, blank=True)
    reversal_reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('payment')
        verbose_name_plural = _('payments')
        ordering = ['-payment_date', '-created_at']
        constraints = [
            # The same external transaction reference can only be recorded once per invoice
            models.UniqueConstraint(
                fields=['invoice', 'transaction_reference'],
                condition=~models.Q(transaction_reference=''),
                name='uniq_payment_reference_per_invoice',
            ),
        ]
        indexes = [
            models.Index(fields=['payment_date'], name='pay_date_idx'),
            models.Index(fields=['status', 'payment_date'], name='pay_status_date_idx'),
        ]

    def __str__(self):
        return f"{self.payment_number} - ${self.amount} for {self.invoice.invoice_number}"

    def save(self, *args, **kwargs):
        if not self.payment_number:
            year = datetime.date.today().year
            unique_part = uuid.uuid4().hex[:6].upper()
            self.payment_number = f"PAY-{year}-{unique_part}"
        super().save(*args, **kwargs)

