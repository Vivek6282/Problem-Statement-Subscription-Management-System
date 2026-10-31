import uuid
import datetime
from decimal import Decimal, ROUND_HALF_UP
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.customers.models import Customer
from apps.plans.models import Plan
from apps.products.models import Product, ProductVariant
from apps.taxes.models import TaxRule
from apps.discounts.models import Discount

class QuotationStatus(models.TextChoices):
    DRAFT = 'DRAFT', _('Draft')
    SENT = 'SENT', _('Sent to Customer')
    ACCEPTED = 'ACCEPTED', _('Accepted')
    REJECTED = 'REJECTED', _('Rejected')
    EXPIRED = 'EXPIRED', _('Expired')
    CONVERTED = 'CONVERTED', _('Converted to Subscription')

class Quotation(models.Model):
    quotation_number = models.CharField(
        _('quotation reference'),
        max_length=64,
        unique=True,
        db_index=True,
        blank=True
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='quotations'
    )
    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        related_name='quotations',
        null=True,
        blank=True
    )
    validity_days = models.PositiveIntegerField(_('validity (days)'), default=30)
    issue_date = models.DateField(_('issue date'), default=datetime.date.today)
    expiry_date = models.DateField(_('expiry date'), null=True, blank=True)
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=QuotationStatus.choices,
        default=QuotationStatus.DRAFT,
        db_index=True
    )
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    converted_subscription = models.ForeignKey(
        'subscriptions.Subscription',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='originating_quotation'
    )
    notes = models.TextField(blank=True)
    terms_and_conditions = models.TextField(
        default="1. Quotation is valid for the specified period.\n2. Payment terms as agreed upon activation.\n3. Applicable taxes applied as per current jurisdiction."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('quotation')
        verbose_name_plural = _('quotations')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.quotation_number} - {self.customer.name} (${self.total_amount})"

    def save(self, *args, **kwargs):
        if not self.quotation_number:
            year = datetime.date.today().year
            unique_part = uuid.uuid4().hex[:6].upper()
            self.quotation_number = f"QT-{year}-{unique_part}"
        if not self.expiry_date and self.issue_date:
            self.expiry_date = self.issue_date + datetime.timedelta(days=self.validity_days)
        super().save(*args, **kwargs)

    def recalculate_totals(self):
        subtotal = Decimal('0.00')
        discount_total = Decimal('0.00')
        tax_total = Decimal('0.00')

        if self.plan and self.plan.price:
            subtotal += self.plan.price

        for item in self.items.all():
            item_subtotal = item.unit_price * item.quantity
            subtotal += item_subtotal
            item_discount = item.discount_amount or Decimal('0.00')
            discount_total += item_discount
            taxable = max(Decimal('0.00'), item_subtotal - item_discount)
            item_tax = (taxable * (item.tax_percentage / Decimal('100.00'))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            tax_total += item_tax

        self.subtotal = subtotal
        self.discount_amount = discount_total
        self.tax_amount = tax_total
        self.total_amount = max(Decimal('0.00'), subtotal - discount_total + tax_total)
        self.save(update_fields=['subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'updated_at'])

class QuotationItem(models.Model):
    quotation = models.ForeignKey(
        Quotation,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    description = models.CharField(max_length=255, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    class Meta:
        verbose_name = _('quotation item')
        verbose_name_plural = _('quotation items')

    def save(self, *args, **kwargs):
        item_sub = self.unit_price * self.quantity
        taxable = max(Decimal('0.00'), item_sub - self.discount_amount)
        tax = (taxable * (self.tax_percentage / Decimal('100.00'))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        self.line_total = taxable + tax
        super().save(*args, **kwargs)

