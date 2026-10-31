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
from apps.subscriptions.models import PaymentTerms

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
    template = models.ForeignKey(
        'QuotationTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quotations'
    )
    payment_terms = models.CharField(
        _('payment terms'),
        max_length=20,
        choices=PaymentTerms.choices,
        default=PaymentTerms.NET_30
    )
    discount = models.ForeignKey(
        Discount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quotations',
        help_text=_("Quotation-level discount; carried onto the subscription when confirmed")
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
        indexes = [
            models.Index(fields=['status', 'expiry_date'], name='quote_status_expiry_idx'),
            models.Index(fields=['customer', 'status'], name='quote_customer_status_idx'),
        ]

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

    def is_expired(self, today=None):
        today = today or datetime.date.today()
        return bool(self.expiry_date and today > self.expiry_date)

    def recalculate_totals(self):
        """Prices every line through the shared pricing service so quote == subscription == invoice."""
        from apps.subscriptions.pricing import price_document, quotation_specs

        priced = price_document(
            quotation_specs(self),
            on_date=self.issue_date,
            plan=self.plan,
            document_discount=self.discount,
        )
        by_item = {id(line.spec.source): line for line in priced.lines if line.spec.source is not None}
        for item in self.items.all():
            line = by_item.get(id(item))
            if line is None:
                continue
            item.discount_amount = line.discount_total
            item.tax_percentage = line.tax_percentage
            item.tax_amount = line.tax
            item.line_total = line.total
            QuotationItem.objects.filter(pk=item.pk).update(
                discount_amount=item.discount_amount, tax_percentage=item.tax_percentage,
                tax_amount=item.tax_amount, line_total=item.line_total,
            )

        self.subtotal = priced.subtotal
        self.discount_amount = priced.discount_total
        self.tax_amount = priced.tax_total
        self.total_amount = priced.total
        self.save(update_fields=['subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'updated_at'])
        return priced

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
    discount = models.ForeignKey(
        Discount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quotation_items'
    )
    # The amounts below are always computed on the server by Quotation.recalculate_totals()
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    class Meta:
        verbose_name = _('quotation item')
        verbose_name_plural = _('quotation items')


class QuotationTemplate(models.Model):
    """Reusable offer: plan + product lines + validity + payment terms."""
    name = models.CharField(_('template name'), max_length=150, unique=True)
    description = models.TextField(blank=True)
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name='quotation_templates', null=True, blank=True)
    validity_days = models.PositiveIntegerField(_('validity (days)'), default=30)
    payment_terms = models.CharField(max_length=20, choices=PaymentTerms.choices, default=PaymentTerms.NET_30)
    discount = models.ForeignKey(Discount, on_delete=models.SET_NULL, null=True, blank=True, related_name='quotation_templates')
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('quotation template')
        verbose_name_plural = _('quotation templates')
        ordering = ['name']

    def __str__(self):
        return self.name


class QuotationTemplateItem(models.Model):
    template = models.ForeignKey(QuotationTemplate, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='quotation_template_items')
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = _('quotation template line')
        verbose_name_plural = _('quotation template lines')
