from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

class BillingInterval(models.TextChoices):
    DAILY = 'DAILY', _('Daily')
    WEEKLY = 'WEEKLY', _('Weekly')
    MONTHLY = 'MONTHLY', _('Monthly')
    YEARLY = 'YEARLY', _('Yearly')

class Plan(models.Model):
    name = models.CharField(_('plan name'), max_length=150, unique=True)
    code = models.SlugField(_('plan code'), max_length=64, unique=True)
    description = models.TextField(_('description'), blank=True)
    price = models.DecimalField(
        _('recurring price'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_("Base charge per billing interval")
    )
    billing_interval = models.CharField(
        _('billing interval'),
        max_length=20,
        choices=BillingInterval.choices,
        default=BillingInterval.MONTHLY
    )
    min_quantity = models.PositiveIntegerField(_('minimum quantity'), default=1)
    
    # Plan availability dates (separate from customer subscription dates)
    availability_start_date = models.DateField(
        _('availability start date'),
        null=True,
        blank=True,
        help_text=_("Date from which this plan can be newly subscribed")
    )
    availability_end_date = models.DateField(
        _('availability end date'),
        null=True,
        blank=True,
        help_text=_("Date after which new subscriptions cannot choose this plan")
    )

    allow_pause = models.BooleanField(_('allow pause'), default=True)
    allow_early_close = models.BooleanField(_('allow early close'), default=True)
    allow_renewal = models.BooleanField(_('allow renewal'), default=True)
    auto_close_on_expiry = models.BooleanField(_('auto-close on expiry'), default=False)
    is_active = models.BooleanField(_('active status'), default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('subscription plan')
        verbose_name_plural = _('subscription plans')
        ordering = ['price']

    def __str__(self):
        return f"{self.name} ({self.get_billing_interval_display()}) - {self.price}"

    def clean(self):
        if self.availability_start_date and self.availability_end_date:
            if self.availability_start_date > self.availability_end_date:
                raise ValidationError({
                    'availability_end_date': _("Availability end date cannot be earlier than start date.")
                })
        if self.price < Decimal('0.00'):
            raise ValidationError({'price': _("Plan price cannot be negative.")})
        if self.min_quantity < 1:
            raise ValidationError({'min_quantity': _("Minimum quantity must be at least 1.")})

