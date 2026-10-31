import datetime
from celery import shared_task
from .billing import BillingEngine
from .maintenance import run_housekeeping


@shared_task(name='apps.subscriptions.tasks.run_recurring_billing')
def run_recurring_billing(target_date_str=None):
    """
    Celery task executed on the beat schedule (see CELERY_BEAT_SCHEDULE) or triggered asynchronously.
    Safe to retry: billing is idempotent per subscription period.
    """
    target_date = datetime.date.fromisoformat(target_date_str) if target_date_str else datetime.date.today()
    return BillingEngine.run_all_due_billing(target_date=target_date)


@shared_task(name='apps.subscriptions.tasks.run_daily_housekeeping')
def run_daily_housekeeping(target_date_str=None):
    """Marks overdue invoices, expires quotations and auto-closes expired subscriptions (plan setting)."""
    target_date = datetime.date.fromisoformat(target_date_str) if target_date_str else datetime.date.today()
    return run_housekeeping(target_date)
