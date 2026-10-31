"""
Scheduled housekeeping. Every function is idempotent, so the scheduler (or an operator) can run
them as often as needed without side effects.
"""
import datetime
import logging
from decimal import Decimal
from django.db import transaction
from django.db.models import F

from apps.audit.models import AuditEvent
from apps.invoices.models import Invoice, InvoiceStatus
from apps.quotations.models import Quotation, QuotationStatus
from .models import Subscription, SubscriptionStatus

logger = logging.getLogger(__name__)


def mark_overdue_invoices(today=None):
    """Moves unpaid / partly paid invoices past their due date to OVERDUE."""
    today = today or datetime.date.today()
    return Invoice.objects.filter(
        due_date__lt=today,
        status__in=[InvoiceStatus.CONFIRMED, InvoiceStatus.PARTIALLY_PAID],
        balance_due__gt=Decimal('0.00'),
    ).update(status=InvoiceStatus.OVERDUE)


def expire_quotations(today=None):
    """Quotations past their validity date expire; a subscription still waiting on them is closed."""
    today = today or datetime.date.today()
    expired = 0
    open_states = [QuotationStatus.DRAFT, QuotationStatus.SENT, QuotationStatus.ACCEPTED]
    for quote in Quotation.objects.filter(status__in=open_states, expiry_date__lt=today).select_related('converted_subscription'):
        with transaction.atomic():
            quote.status = QuotationStatus.EXPIRED
            quote.save(update_fields=['status', 'updated_at'])
            sub = quote.converted_subscription
            if sub and sub.status in (SubscriptionStatus.DRAFT, SubscriptionStatus.QUOTATION):
                sub.status = SubscriptionStatus.CLOSED
                sub.save(update_fields=['status', 'updated_at'])
            AuditEvent.log_event(
                action='QUOTATION_EXPIRED', entity_type='Quotation', entity_id=quote.quotation_number,
                description=f"Quotation expired on {quote.expiry_date}.",
            )
            expired += 1
    return expired


def auto_close_expired_subscriptions(today=None):
    """
    Closes subscriptions whose plan is configured to close on its own once the expiry date has passed.
    Subscriptions that still have an unbilled period inside their term are left for the billing run.
    """
    today = today or datetime.date.today()
    closed = 0
    candidates = Subscription.objects.filter(
        status__in=[SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED],
        plan__auto_close_on_expiry=True,
        expiry_date__lt=today,
    ).filter(next_billing_date__gt=F('expiry_date'))
    for sub in candidates:
        sub.status = SubscriptionStatus.CLOSED
        sub.save(update_fields=['status', 'updated_at'])
        AuditEvent.log_event(
            action='AUTO_CLOSED_ON_EXPIRY', entity_type='Subscription', entity_id=sub.subscription_number,
            description=f"Subscription auto-closed: expiry date {sub.expiry_date} passed (plan setting).",
        )
        closed += 1
    return closed


def run_housekeeping(today=None):
    today = today or datetime.date.today()
    return {
        'date': str(today),
        'invoices_marked_overdue': mark_overdue_invoices(today),
        'quotations_expired': expire_quotations(today),
        'subscriptions_auto_closed': auto_close_expired_subscriptions(today),
    }
