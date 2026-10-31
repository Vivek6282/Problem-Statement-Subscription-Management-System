import uuid
import datetime
from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from apps.customers.models import Customer
from apps.plans.models import Plan, BillingInterval
from apps.products.models import Product, ProductVariant
from apps.taxes.models import TaxRule
from apps.discounts.models import Discount

class SubscriptionStatus(models.TextChoices):
    DRAFT = 'DRAFT', _('Draft')
    QUOTATION = 'QUOTATION', _('Quotation')
    CONFIRMED = 'CONFIRMED', _('Confirmed')
    ACTIVE = 'ACTIVE', _('Active')
    PAUSED = 'PAUSED', _('Paused')
    CLOSED = 'CLOSED', _('Closed')

class PaymentTerms(models.TextChoices):
    IMMEDIATE = 'IMMEDIATE', _('Due Immediately')
    NET_15 = 'NET_15', _('Net 15 Days')
    NET_30 = 'NET_30', _('Net 30 Days')
    NET_60 = 'NET_60', _('Net 60 Days')

class Subscription(models.Model):
    subscription_number = models.CharField(
        _('subscription number'),
        max_length=64,
        unique=True,
        db_index=True,
        blank=True
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name='subscriptions'
    )
    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        related_name='subscriptions'
    )
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.DRAFT,
        db_index=True
    )
    start_date = models.DateField(_('start date'), default=datetime.date.today)
    expiry_date = models.DateField(_('expiry date'), null=True, blank=True)
    next_billing_date = models.DateField(_('next billing date'), db_index=True)
    last_billing_date = models.DateField(_('last billing date'), null=True, blank=True)
    payment_terms = models.CharField(
        _('payment terms'),
        max_length=20,
        choices=PaymentTerms.choices,
        default=PaymentTerms.NET_30
    )
    auto_renew = models.BooleanField(_('auto renew'), default=True)
    notes = models.TextField(_('internal notes'), blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('subscription')
        verbose_name_plural = _('subscriptions')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.subscription_number} - {self.customer.name} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.subscription_number:
            year = datetime.date.today().year
            unique_part = uuid.uuid4().hex[:6].upper()
            self.subscription_number = f"SUB-{year}-{unique_part}"
        if not self.next_billing_date and self.start_date:
            self.next_billing_date = self.start_date
        super().save(*args, **kwargs)

    @property
    def recurring_subtotal(self):
        """Sum of plan price and active line items."""
        items_total = sum(item.line_subtotal for item in self.items.all())
        return self.plan.price + items_total

    @property
    def normalized_mrr(self):
        """
        Calculates normalized Monthly Recurring Revenue for this subscription:
        DAILY: recurring_total * 30
        WEEKLY: recurring_total * 4.33
        MONTHLY: recurring_total * 1
        YEARLY: recurring_total / 12
        """
        if self.status != SubscriptionStatus.ACTIVE:
            return Decimal('0.00')
        base = self.recurring_subtotal
        interval = self.plan.billing_interval
        if interval == BillingInterval.DAILY:
            return (base * Decimal('30')).quantize(Decimal('0.01'))
        elif interval == BillingInterval.WEEKLY:
            return (base * Decimal('4.33')).quantize(Decimal('0.01'))
        elif interval == BillingInterval.MONTHLY:
            return (base * Decimal('1.00')).quantize(Decimal('0.01'))
        elif interval == BillingInterval.YEARLY:
            return (base / Decimal('12')).quantize(Decimal('0.01'))
        return base.quantize(Decimal('0.01'))

    def can_transition_to(self, target_status):
        """
        Server-side state machine validation:
        Draft -> Quotation -> Confirmed -> Active -> Closed
        Active <-> Paused
        Any non-closed -> Closed
        Closed -> Active (Renew if allowed)
        """
        allowed = {
            SubscriptionStatus.DRAFT: [SubscriptionStatus.QUOTATION, SubscriptionStatus.CONFIRMED, SubscriptionStatus.CLOSED],
            SubscriptionStatus.QUOTATION: [SubscriptionStatus.CONFIRMED, SubscriptionStatus.CLOSED],
            SubscriptionStatus.CONFIRMED: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CLOSED],
            SubscriptionStatus.ACTIVE: [SubscriptionStatus.PAUSED, SubscriptionStatus.CLOSED],
            SubscriptionStatus.PAUSED: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CLOSED],
            SubscriptionStatus.CLOSED: [SubscriptionStatus.ACTIVE] if self.plan.allow_renewal else [],
        }
        return target_status in allowed.get(self.status, [])

class SubscriptionItem(models.Model):
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='subscription_items'
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    tax_rule = models.ForeignKey(
        TaxRule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    discount = models.ForeignKey(
        Discount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = _('subscription line item')
        verbose_name_plural = _('subscription line items')

    def __str__(self):
        return f"{self.subscription.subscription_number} - {self.product.name} x {self.quantity}"

    @property
    def line_subtotal(self):
        return self.unit_price * self.quantity
