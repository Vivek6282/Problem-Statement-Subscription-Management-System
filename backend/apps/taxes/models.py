from decimal import Decimal
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.products.models import Product

class TaxRule(models.Model):
    name = models.CharField(_('tax name'), max_length=100)
    percentage = models.DecimalField(
        _('tax rate percentage'),
        max_digits=5,
        decimal_places=2,
        help_text=_("Tax rate (e.g. 18.00 for 18% GST)")
    )
    applicable_products = models.ManyToManyField(
        Product,
        blank=True,
        related_name='tax_rules',
        help_text=_("Products eligible for this tax rule. Leave blank to apply across all products.")
    )
    effective_from = models.DateField(_('effective from date'))
    effective_to = models.DateField(_('effective to date'), null=True, blank=True)
    is_active = models.BooleanField(_('active status'), default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('tax rule')
        verbose_name_plural = _('tax rules')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.percentage}%)"

    def is_applicable_for_product(self, product, date_point=None):
        import datetime
        check_date = date_point or datetime.date.today()
        if not self.is_active:
            return False
        if self.effective_from and check_date < self.effective_from:
            return False
        if self.effective_to and check_date > self.effective_to:
            return False
        if self.applicable_products.exists():
            return self.applicable_products.filter(id=product.id).exists()
        return True

    def calculate_tax(self, taxable_amount):
        """
        Rounding policy: Quantize to 2 decimal places using standard ROUND_HALF_UP.
        """
        from decimal import ROUND_HALF_UP
        tax = (taxable_amount * self.percentage) / Decimal('100.00')
        return tax.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

