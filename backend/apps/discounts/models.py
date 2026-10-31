from decimal import Decimal, ROUND_HALF_UP
import datetime
from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from apps.products.models import Product
from apps.plans.models import Plan

class DiscountType(models.TextChoices):
    PERCENTAGE = 'PERCENTAGE', _('Percentage (%)')
    FIXED = 'FIXED', _('Fixed Amount')

class Discount(models.Model):
    code = models.CharField(_('coupon / promo code'), max_length=50, unique=True, db_index=True)
    name = models.CharField(_('name'), max_length=150)
    discount_type = models.CharField(
        _('discount type'),
        max_length=20,
        choices=DiscountType.choices,
        default=DiscountType.PERCENTAGE
    )
    value = models.DecimalField(
        _('discount value'),
        max_digits=12,
        decimal_places=2,
        help_text=_("Percentage (e.g. 15.00) or fixed currency amount (e.g. 250.00)")
    )
    min_purchase_amount = models.DecimalField(
        _('minimum purchase amount'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    min_quantity = models.PositiveIntegerField(_('minimum quantity'), default=1)
    usage_limit = models.PositiveIntegerField(
        _('maximum redemptions'),
        null=True,
        blank=True,
        help_text=_("Leave empty for unlimited redemptions")
    )
    times_redeemed = models.PositiveIntegerField(_('times redeemed'), default=0)
    start_date = models.DateField(_('start date'), default=datetime.date.today)
    end_date = models.DateField(_('end date'), null=True, blank=True)
    applicable_products = models.ManyToManyField(Product, blank=True, related_name='discounts')
    applicable_plans = models.ManyToManyField(Plan, blank=True, related_name='discounts')
    is_active = models.BooleanField(_('active status'), default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('discount rule')
        verbose_name_plural = _('discount rules')
        ordering = ['-created_at']

    def __str__(self):
        suffix = f"{self.value}%" if self.discount_type == DiscountType.PERCENTAGE else f"${self.value}"
        return f"{self.name} ({self.code} - {suffix})"

    def clean(self):
        if self.end_date and self.start_date > self.end_date:
            raise ValidationError({'end_date': _("End date must be on or after start date.")})
        if self.discount_type == DiscountType.PERCENTAGE and (self.value <= 0 or self.value > 100):
            raise ValidationError({'value': _("Percentage discount must be between 0.01% and 100%.")})
        if self.discount_type == DiscountType.FIXED and self.value <= 0:
            raise ValidationError({'value': _("Fixed discount value must be greater than 0.")})

    def is_eligible(self, subtotal, quantity=1, product=None, plan=None, on_date=None):
        today = on_date or datetime.date.today()
        if not self.is_active:
            return False, "Discount is inactive."
        if self.start_date and today < self.start_date:
            return False, "Discount period has not started yet."
        if self.end_date and today > self.end_date:
            return False, "Discount has expired."
        if self.usage_limit is not None and self.times_redeemed >= self.usage_limit:
            return False, "Discount redemption limit reached."
        if subtotal < self.min_purchase_amount:
            return False, f"Minimum purchase amount is ${self.min_purchase_amount}."
        if quantity < self.min_quantity:
            return False, f"Minimum quantity is {self.min_quantity}."
        restricted_products = list(self.applicable_products.values_list('id', flat=True))
        if restricted_products and (product is None or product.id not in restricted_products):
            return False, "Discount not applicable for this product."
        restricted_plans = list(self.applicable_plans.values_list('id', flat=True))
        if restricted_plans and (plan is None or plan.id not in restricted_plans):
            return False, "Discount not applicable for this plan."
        return True, ""

    def calculate_discount(self, subtotal):
        if self.discount_type == DiscountType.PERCENTAGE:
            discount = (subtotal * self.value) / Decimal('100.00')
        else:
            discount = min(self.value, subtotal)
        return discount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

class DiscountRedemption(models.Model):
    discount = models.ForeignKey(Discount, on_delete=models.CASCADE, related_name='redemptions')
    customer = models.ForeignKey('customers.Customer', on_delete=models.CASCADE, related_name='discount_redemptions')
    subscription = models.ForeignKey('subscriptions.Subscription', on_delete=models.SET_NULL, null=True, blank=True, related_name='discount_redemptions')
    invoice = models.ForeignKey('invoices.Invoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='discount_redemptions')
    amount_discounted = models.DecimalField(max_digits=12, decimal_places=2)
    redeemed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('discount redemption')
        verbose_name_plural = _('discount redemptions')
        ordering = ['-redeemed_at']

    def __str__(self):
        return f"{self.customer} redeemed {self.discount.code} for ${self.amount_discounted}"

