import datetime
from celery import shared_task
from .billing import BillingEngine

@shared_task(name='apps.subscriptions.tasks.run_recurring_billing')
def run_recurring_billing(target_date_str=None):
    """
    Celery task executed on a recurring beat schedule or triggered asynchronously.
    """
    target_date = datetime.date.fromisoformat(target_date_str) if target_date_str else datetime.date.today()
    results = BillingEngine.run_all_due_billing(target_date=target_date)
    return results

