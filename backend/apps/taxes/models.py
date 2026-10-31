from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from apps.products.models import Product

class TaxRule(models.Model):
    name = models.CharField(_('tax name'), max_length=100)
    percentage = models.DecimalField(
        _('tax rate (%)'),
        max_digits=5,
        decimal_places=2,
        help_text=_("Percentage between 0.00 and 100.00 (e.g., 18.00 for 18% GST/VAT)")
    )
    applicable_products = models.ManyToManyField(
        Product,
        blank=True,
        related_name='tax_rules',
        help_text=_("Restrict tax to specific products. Leave empty to apply globally across catalog.")
    )
    effective_from = models.DateField(_('effective from'))
    effective_to = models.DateField(_('effective to'), null=True, blank=True)
    is_active = models.BooleanField(_('active status'), default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('tax rule')
        verbose_name_plural = _('tax rules')
        ordering = ['name']

    def clean(self):
        if self.effective_to and self.effective_from > self.effective_to:
            raise ValidationError({'effective_to': _("Effective end date cannot precede start date.")})
        if self.percentage < Decimal('0.00') or self.percentage > Decimal('100.00'):
            raise ValidationError({'percentage': _("Tax percentage must be between 0 and 100.")})

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
            return product is not None and self.applicable_products.filter(id=product.id).exists()
        return True

    def calculate_tax(self, taxable_amount):
        """
        Rounding policy: Quantize to 2 decimal places using standard ROUND_HALF_UP.
        """
        from decimal import ROUND_HALF_UP
        tax = (taxable_amount * self.percentage) / Decimal('100.00')
        return tax.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
