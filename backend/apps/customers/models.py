import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class CustomerStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', _('Active')
    ARCHIVED = 'ARCHIVED', _('Archived')

class Customer(models.Model):
    reference = models.CharField(
        _('customer reference'),
        max_length=64,
        unique=True,
        db_index=True,
        blank=True
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='customer_profile'
    )
    name = models.CharField(_('contact name'), max_length=255)
    company = models.CharField(_('company name'), max_length=255, blank=True)
    email = models.EmailField(_('email address'), db_index=True)
    phone = models.CharField(_('phone number'), max_length=50, blank=True)
    address_line1 = models.CharField(_('address line 1'), max_length=255, blank=True)
    address_line2 = models.CharField(_('address line 2'), max_length=255, blank=True)
    city = models.CharField(_('city'), max_length=100, blank=True)
    state = models.CharField(_('state / province'), max_length=100, blank=True)
    postal_code = models.CharField(_('postal / zip code'), max_length=30, blank=True)
    country = models.CharField(_('country'), max_length=100, default='United States')
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=CustomerStatus.choices,
        default=CustomerStatus.ACTIVE,
        db_index=True
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('customer')
        verbose_name_plural = _('customers')
        ordering = ['-created_at']

    def __str__(self):
        if self.company:
            return f"{self.company} ({self.name}) - {self.reference}"
        return f"{self.name} - {self.reference}"

    def save(self, *args, **kwargs):
        if not self.reference:
            # Auto-generate reference code e.g. CUST-A1B2C3
            unique_part = uuid.uuid4().hex[:6].upper()
            self.reference = f"CUST-{unique_part}"
        super().save(*args, **kwargs)

