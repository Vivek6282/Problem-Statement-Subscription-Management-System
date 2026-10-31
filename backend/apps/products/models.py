from decimal import Decimal
from django.db import models
from django.utils.translation import gettext_lazy as _

class ProductType(models.TextChoices):
    SERVICE = 'SERVICE', _('Service')
    SOFTWARE = 'SOFTWARE', _('Software / SaaS')
    HARDWARE = 'HARDWARE', _('Hardware')
    SUBSCRIPTION = 'SUBSCRIPTION', _('Subscription Add-on')

class Product(models.Model):
    sku = models.CharField(_('SKU'), max_length=64, unique=True, db_index=True)
    name = models.CharField(_('product name'), max_length=255)
    product_type = models.CharField(
        _('product type'),
        max_length=30,
        choices=ProductType.choices,
        default=ProductType.SOFTWARE
    )
    sales_price = models.DecimalField(
        _('sales price'),
        max_digits=12,
        decimal_places=2,
        help_text=_("Base selling price before tax and variant adjustments")
    )
    cost_price = models.DecimalField(
        _('cost price'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_("Internal unit cost")
    )
    description = models.TextField(_('description'), blank=True)
    notes = models.TextField(_('internal notes'), blank=True)
    is_active = models.BooleanField(_('active status'), default=True, db_index=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('product')
        verbose_name_plural = _('products')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.sku}) - {self.sales_price}"

class ProductVariant(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='variants'
    )
    name = models.CharField(_('variant name'), max_length=150)
    sku_suffix = models.CharField(_('SKU suffix'), max_length=32, blank=True)
    price_adjustment = models.DecimalField(
        _('price adjustment'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_("Delta added to base product sales price (e.g. +560.00)")
    )
    is_active = models.BooleanField(_('active status'), default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('product variant')
        verbose_name_plural = _('product variants')
        unique_together = ('product', 'name')
        ordering = ['name']

    def __str__(self):
        return f"{self.product.name} - {self.name} (+{self.price_adjustment})"

    @property
    def effective_sku(self):
        if self.sku_suffix:
            return f"{self.product.sku}-{self.sku_suffix.lstrip('-')}"
        return f"{self.product.sku}-{self.id}"

    @property
    def final_unit_price(self):
        return self.product.sales_price + self.price_adjustment

