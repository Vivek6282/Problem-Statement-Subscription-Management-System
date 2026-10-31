import datetime
import logging
from decimal import Decimal
from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.db import transaction
from django.db.models import F
from apps.subscriptions.models import Subscription, SubscriptionStatus
from apps.subscriptions.pricing import price_document, subscription_specs, TaxResolver
from apps.plans.models import BillingInterval
from apps.invoices.models import Invoice, InvoiceItem, InvoiceStatus
from apps.discounts.models import Discount, DiscountRedemption
from apps.audit.models import AuditEvent

logger = logging.getLogger(__name__)

PAYMENT_TERM_DAYS = {'IMMEDIATE': 0, 'NET_15': 15, 'NET_30': 30, 'NET_60': 60}

CREATED, ADVANCED, SKIPPED = 'created', 'advanced', 'skipped'


class BillingEngine:
    """
    Automated Recurring Billing Engine.

    Guarantees
    - Idempotent: one invoice per (subscription, billing period). Enforced by a database unique
      constraint as well as an existence check, so retries and concurrent runs cannot double-bill.
    - Nothing is skipped: a run bills *every* period that is due up to the target date (catch-up),
      each as its own invoice, instead of silently jumping over missed cycles.
    - Discounts attached to the subscription / lines are applied automatically while valid, and each
      application consumes one redemption (usage limits are enforced under a row lock).
    - Taxes come from the admin-managed tax rules; the per-line breakdown is stored on the invoice.
    """

    MAX_PERIODS_PER_RUN = 500  # safety valve against runaway loops

    @classmethod
    def calculate_next_period_dates(cls, start_date, interval):
        """
        Calculates the period end date and subsequent next billing date based on the plan interval.
        Uses relativedelta to reliably navigate 28/29/30/31-day month boundaries and leap years.
        """
        if interval == BillingInterval.DAILY:
            end_date = start_date
            next_date = start_date + datetime.timedelta(days=1)
        elif interval == BillingInterval.WEEKLY:
            end_date = start_date + datetime.timedelta(days=6)
            next_date = start_date + datetime.timedelta(days=7)
        elif interval == BillingInterval.MONTHLY:
            next_date = start_date + relativedelta(months=1)
            end_date = next_date - datetime.timedelta(days=1)
        elif interval == BillingInterval.YEARLY:
            next_date = start_date + relativedelta(years=1)
            end_date = next_date - datetime.timedelta(days=1)
        else:
            next_date = start_date + relativedelta(months=1)
            end_date = next_date - datetime.timedelta(days=1)

        return end_date, next_date

    @classmethod
    def _extended_expiry(cls, subscription):
        """New expiry for an auto-renewed term: same length as the term that just ended."""
        if subscription.start_date and subscription.expiry_date and subscription.expiry_date > subscription.start_date:
            return subscription.expiry_date + (subscription.expiry_date - subscription.start_date)
        end, _ = cls.calculate_next_period_dates(subscription.next_billing_date, subscription.plan.billing_interval)
        return end

    @classmethod
    def _bill_one_period(cls, subscription_id, run_date):
        """Bills exactly one due period. Returns (outcome, payload)."""
        with transaction.atomic():
            subscription = (
                Subscription.objects.select_for_update(of=('self',))
                .select_related('customer', 'plan', 'discount')
                .prefetch_related('items__product', 'items__variant', 'items__tax_rule', 'items__discount')
                .get(id=subscription_id)
            )

            if subscription.status != SubscriptionStatus.ACTIVE:
                return SKIPPED, f"Subscription {subscription.subscription_number} is not in ACTIVE status ({subscription.status})."

            if subscription.next_billing_date > run_date:
                return SKIPPED, f"Subscription {subscription.subscription_number} next billing is {subscription.next_billing_date}, not due yet."

            period_start = subscription.next_billing_date
            plan = subscription.plan

            # Expiry handling follows the plan's own configuration (never a blanket rule)
            if subscription.expiry_date and period_start > subscription.expiry_date:
                if plan.auto_close_on_expiry:
                    subscription.status = SubscriptionStatus.CLOSED
                    subscription.save(update_fields=['status', 'updated_at'])
                    AuditEvent.log_event(
                        action='AUTO_CLOSED_ON_EXPIRY',
                        entity_type='Subscription',
                        entity_id=subscription.subscription_number,
                        description="Subscription auto-closed after reaching expiry date (plan setting).",
                    )
                    return SKIPPED, f"Subscription {subscription.subscription_number} has expired and was auto-closed."
                if subscription.auto_renew and plan.allow_renewal:
                    old_expiry = subscription.expiry_date
                    subscription.expiry_date = cls._extended_expiry(subscription)
                    subscription.save(update_fields=['expiry_date', 'updated_at'])
                    AuditEvent.log_event(
                        action='SUBSCRIPTION_AUTO_RENEWED',
                        entity_type='Subscription',
                        entity_id=subscription.subscription_number,
                        description=f"Term auto-renewed: expiry moved from {old_expiry} to {subscription.expiry_date}.",
                    )
                else:
                    return SKIPPED, (
                        f"Subscription {subscription.subscription_number} expired on {subscription.expiry_date}: "
                        "not billed (plan does not auto-close, subscription is not set to auto-renew). Renew or close it."
                    )

            period_end, next_billing = cls.calculate_next_period_dates(period_start, plan.billing_interval)

            existing_invoice = Invoice.objects.filter(
                subscription=subscription,
                billing_period_start=period_start,
                billing_period_end=period_end
            ).first()
            if existing_invoice:
                subscription.last_billing_date = period_start
                subscription.next_billing_date = next_billing
                subscription.save(update_fields=['last_billing_date', 'next_billing_date', 'updated_at'])
                return ADVANCED, f"Invoice {existing_invoice.invoice_number} already exists for period {period_start} to {period_end}. Advanced date."

            # Lock the discounts involved so usage limits cannot be exceeded by concurrent runs
            specs = subscription_specs(subscription)
            discount_ids = {s.discount.id for s in specs if s.discount is not None}
            if subscription.discount_id:
                discount_ids.add(subscription.discount_id)
            locked = {d.id: d for d in Discount.objects.select_for_update().filter(id__in=discount_ids)} if discount_ids else {}
            for spec in specs:
                if spec.discount is not None:
                    spec.discount = locked.get(spec.discount.id)
            document_discount = locked.get(subscription.discount_id)

            priced = price_document(
                specs, on_date=period_start, plan=plan, document_discount=document_discount,
                resolver=TaxResolver(period_start),
            )

            due_days = PAYMENT_TERM_DAYS.get(subscription.payment_terms, 30)
            fully_discounted = priced.total <= Decimal('0.00')
            if fully_discounted:
                status = InvoiceStatus.PAID
            elif getattr(settings, 'AUTO_CONFIRM_INVOICES', True):
                status = InvoiceStatus.CONFIRMED
            else:
                status = InvoiceStatus.DRAFT

            invoice = Invoice.objects.create(
                subscription=subscription,
                customer=subscription.customer,
                billing_period_start=period_start,
                billing_period_end=period_end,
                issue_date=period_start,
                due_date=period_start + datetime.timedelta(days=due_days),
                status=status,
                subtotal=priced.subtotal,
                discount_amount=priced.discount_total,
                tax_amount=priced.tax_total,
                total_amount=priced.total,
                paid_amount=Decimal('0.00'),
                balance_due=priced.total,
                applied_discounts=priced.applied_discounts_summary(),
                notes=f"Recurring billing invoice for {plan.name} ({period_start} to {period_end})"
            )

            for line in priced.lines:
                InvoiceItem.objects.create(
                    invoice=invoice,
                    product_name=line.spec.name,
                    product_sku=line.spec.sku,
                    variant_name=line.spec.variant_name,
                    quantity=line.spec.quantity,
                    unit_price=line.spec.unit_price,
                    discount_amount=line.discount_total,
                    tax_amount=line.tax,
                    line_total=line.total,
                    tax_breakdown=line.tax_breakdown,
                )

            for applied in priced.applied_discounts:
                discount = applied['discount']
                DiscountRedemption.objects.create(
                    discount=discount,
                    customer=subscription.customer,
                    subscription=subscription,
                    invoice=invoice,
                    amount_discounted=applied['amount'],
                )
                Discount.objects.filter(pk=discount.pk).update(times_redeemed=F('times_redeemed') + 1)

            subscription.last_billing_date = period_start
            subscription.next_billing_date = next_billing
            subscription.save(update_fields=['last_billing_date', 'next_billing_date', 'updated_at'])

            AuditEvent.log_event(
                action='RECURRING_INVOICE_GENERATED',
                entity_type='Invoice',
                entity_id=invoice.invoice_number,
                description=f"Generated recurring invoice {invoice.invoice_number} for {subscription.subscription_number} ({priced.total})",
                metadata={
                    'subscription_number': subscription.subscription_number,
                    'customer_id': subscription.customer.id,
                    'amount': str(priced.total),
                    'period_start': str(period_start),
                    'period_end': str(period_end),
                    'discounts': priced.applied_discounts_summary(),
                }
            )
            return CREATED, invoice

    @classmethod
    def process_subscription_billing(cls, subscription_id, target_date=None):
        """Bill ONE due period of a subscription. Returns (True, invoice) or (False, reason)."""
        outcome, payload = cls._bill_one_period(subscription_id, target_date or datetime.date.today())
        return outcome == CREATED, payload

    @classmethod
    def bill_subscription(cls, subscription_id, target_date=None):
        """
        Bill every period that is due up to `target_date` (catch-up), one invoice per period.
        Returns (invoices, messages).
        """
        run_date = target_date or datetime.date.today()
        invoices, messages = [], []
        for _ in range(cls.MAX_PERIODS_PER_RUN):
            outcome, payload = cls._bill_one_period(subscription_id, run_date)
            if outcome == CREATED:
                invoices.append(payload)
            elif outcome == ADVANCED:
                messages.append(payload)
            else:
                messages.append(payload)
                break
        else:
            logger.warning("Billing for subscription %s stopped after %s periods; it will continue on the next run.",
                           subscription_id, cls.MAX_PERIODS_PER_RUN)
        return invoices, messages

    @classmethod
    def run_all_due_billing(cls, target_date=None):
        """
        Identifies all due active subscriptions and bills them with per-subscription isolation:
        a failure on one subscription never blocks the others, and is reported (never hidden).
        """
        today = target_date or datetime.date.today()
        due_subscriptions = list(Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            next_billing_date__lte=today
        ).values_list('id', flat=True))

        results = {
            'target_date': str(today),
            'found_due': len(due_subscriptions),
            'invoices_created': 0,
            'skipped_or_failed': 0,
            'details': []
        }

        for sub_id in due_subscriptions:
            try:
                invoices, messages = cls.bill_subscription(sub_id, today)
                if invoices:
                    results['invoices_created'] += len(invoices)
                    results['details'].append({
                        'subscription_id': sub_id,
                        'status': 'SUCCESS',
                        'invoices_created': len(invoices),
                        'invoice_number': invoices[-1].invoice_number,
                        'total': str(invoices[-1].total_amount),
                    })
                else:
                    results['skipped_or_failed'] += 1
                    results['details'].append({
                        'subscription_id': sub_id,
                        'status': 'SKIPPED',
                        'reason': '; '.join(messages),
                    })
            except Exception as e:
                logger.exception(f"Error processing subscription {sub_id}: {e}")
                results['skipped_or_failed'] += 1
                results['details'].append({
                    'subscription_id': sub_id,
                    'status': 'ERROR',
                    'error': str(e)
                })

        return results
