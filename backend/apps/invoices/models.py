import uuid
import datetime
from decimal import Decimal
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.customers.models import Customer

class InvoiceStatus(models.TextChoices):
    DRAFT = 'DRAFT', _('Draft')
    CONFIRMED = 'CONFIRMED', _('Confirmed / Due')
    PARTIALLY_PAID = 'PARTIALLY_PAID', _('Partially Paid')
    PAID = 'PAID', _('Paid')
    OVERDUE = 'OVERDUE', _('Overdue')
    CANCELLED = 'CANCELLED', _('Cancelled')

class Invoice(models.Model):
    invoice_number = models.CharField(
        _('invoice number'),
        max_length=64,
        unique=True,
        db_index=True,
        blank=True
    )
    subscription = models.ForeignKey(
        'subscriptions.Subscription',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices'
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name='invoices'
    )
    billing_period_start = models.DateField(_('period start date'), null=True, blank=True)
    billing_period_end = models.DateField(_('period end date'), null=True, blank=True)
    issue_date = models.DateField(_('issue date'), default=datetime.date.today)
    due_date = models.DateField(_('due date'))
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=InvoiceStatus.choices,
        default=InvoiceStatus.DRAFT,
        db_index=True
    )
    subtotal = models.DecimalField(_('subtotal'), max_digits=12, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(_('discounts'), max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(_('taxes'), max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(_('total amount'), max_digits=12, decimal_places=2, default=Decimal('0.00'))
    paid_amount = models.DecimalField(_('paid amount'), max_digits=12, decimal_places=2, default=Decimal('0.00'))
    balance_due = models.DecimalField(_('balance due'), max_digits=12, decimal_places=2, default=Decimal('0.00'))
    applied_discounts = models.JSONField(_('applied discounts snapshot'), default=list, blank=True)
    sent_at = models.DateTimeField(_('last sent at'), null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('invoice')
        verbose_name_plural = _('invoices')
        ordering = ['-issue_date', '-created_at']
        constraints = [
            # One invoice per subscription billing period: billing can be retried safely
            models.UniqueConstraint(
                fields=['subscription', 'billing_period_start', 'billing_period_end'],
                condition=models.Q(subscription__isnull=False, billing_period_start__isnull=False, billing_period_end__isnull=False),
                name='uniq_invoice_per_subscription_period',
            ),
        ]
        indexes = [
            models.Index(fields=['status', 'due_date'], name='inv_status_due_idx'),
            models.Index(fields=['customer', 'status'], name='inv_customer_status_idx'),
            models.Index(fields=['issue_date'], name='inv_issue_idx'),
        ]

    def __str__(self):
        return f"{self.invoice_number} - {self.customer.name} (${self.total_amount})"

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            year = datetime.date.today().year
            unique_part = uuid.uuid4().hex[:6].upper()
            self.invoice_number = f"INV-{year}-{unique_part}"
        if not self.due_date and self.issue_date:
            self.due_date = self.issue_date + datetime.timedelta(days=30)
        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        today = datetime.date.today()
        return (
            self.due_date < today and
            self.status in [InvoiceStatus.CONFIRMED, InvoiceStatus.PARTIALLY_PAID] and
            self.balance_due > Decimal('0.00')
        )

    def refresh_payment_status(self, today=None):
        """Derives the status from the money: Paid / Overdue / Partially Paid / Confirmed (never touches Draft / Cancelled)."""
        if self.status in (InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED):
            return self.status
        today = today or datetime.date.today()
        if self.balance_due <= Decimal('0.00'):
            self.status = InvoiceStatus.PAID
        elif self.due_date < today:
            self.status = InvoiceStatus.OVERDUE
        elif self.paid_amount > Decimal('0.00'):
            self.status = InvoiceStatus.PARTIALLY_PAID
        else:
            self.status = InvoiceStatus.CONFIRMED
        return self.status

    def check_and_update_overdue_status(self):
        """Updates status to OVERDUE if overdue criteria met."""
        if self.is_overdue and self.status != InvoiceStatus.OVERDUE:
            self.status = InvoiceStatus.OVERDUE
            self.save(update_fields=['status', 'updated_at'])

class InvoiceItem(models.Model):
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product_name = models.CharField(_('product / item name'), max_length=255)
    product_sku = models.CharField(_('SKU'), max_length=64, blank=True)
    variant_name = models.CharField(_('variant'), max_length=150, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(_('unit price snapshot'), max_digits=12, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    line_total = models.DecimalField(_('line total snapshot'), max_digits=12, decimal_places=2)
    tax_breakdown = models.JSONField(_('tax breakdown snapshot'), default=list, blank=True)

    class Meta:
        verbose_name = _('invoice item')
        verbose_name_plural = _('invoice items')

    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.product_name} x {self.quantity}"

