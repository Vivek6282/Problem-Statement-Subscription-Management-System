import datetime
from apps.audit.models import AuditEvent
from apps.subscriptions.models import Subscription, SubscriptionItem, SubscriptionStatus


def sync_subscription(quotation, status, user=None):
    """
    Creates the subscription behind a quotation, or updates the one already linked to it, so a quotation
    never produces more than one subscription however many times it is sent / confirmed.
    The caller holds a row lock on the quotation.
    """
    sub = quotation.converted_subscription
    created = sub is None
    if created:
        sub = Subscription(
            customer=quotation.customer, plan=quotation.plan, status=status,
            start_date=datetime.date.today(), next_billing_date=datetime.date.today(),
            payment_terms=quotation.payment_terms, discount=quotation.discount,
            notes=f"From quotation {quotation.quotation_number}.",
        )
        sub.save()
    else:
        sub.plan = quotation.plan
        sub.payment_terms = quotation.payment_terms
        sub.discount = quotation.discount
        sub.status = status
        sub.save()
        sub.items.all().delete()

    for item in quotation.items.all():
        SubscriptionItem.objects.create(
            subscription=sub, product=item.product, variant=item.variant,
            quantity=item.quantity, unit_price=item.unit_price,
            discount=item.discount,
        )
    quotation.converted_subscription = sub
    quotation.save(update_fields=['converted_subscription', 'updated_at'])
    AuditEvent.log_event(
        'SUBSCRIPTION_CREATED' if created else 'SUBSCRIPTION_UPDATED', 'Subscription', sub.subscription_number,
        f"{'Created' if created else 'Updated'} from quotation {quotation.quotation_number} as {status}.", user=user,
    )
    return sub, created
