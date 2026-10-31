import datetime
import logging
from decimal import Decimal
from dateutil.relativedelta import relativedelta
from django.db import transaction
from django.utils import timezone
from apps.subscriptions.models import Subscription, SubscriptionStatus
from apps.plans.models import BillingInterval
from apps.invoices.models import Invoice, InvoiceItem, InvoiceStatus
from apps.audit.models import AuditEvent

logger = logging.getLogger(__name__)

class BillingEngine:
    """
    Automated Recurring Billing Engine.
    Handles due detection, immutable charge calculation, tax/discount application,
    month-end and leap-year date advancement, and idempotent transaction-safe invoice generation.
    """

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
    def process_subscription_billing(cls, subscription_id, target_date=None):
        """
        Process a single active subscription with database row locking (select_for_update)
        to prevent race conditions and duplicate billing.
        """
        run_date = target_date or datetime.date.today()

        with transaction.atomic():
            # Acquire exclusive row lock
            subscription = Subscription.objects.select_for_update().select_related(
                'customer', 'plan'
            ).prefetch_related('items__product', 'items__variant', 'items__tax_rule', 'items__discount').get(id=subscription_id)

            # Verification 1: Is subscription active?
            if subscription.status != SubscriptionStatus.ACTIVE:
                return False, f"Subscription {subscription.subscription_number} is not in ACTIVE status ({subscription.status})."

            # Verification 2: Is it due?
            if subscription.next_billing_date > run_date:
                return False, f"Subscription {subscription.subscription_number} next billing is {subscription.next_billing_date}, not due yet."

            # Verification 3: Check expiry date
            if subscription.expiry_date and run_date > subscription.expiry_date:
                if subscription.plan.auto_close_on_expiry:
                    subscription.status = SubscriptionStatus.CLOSED
                    subscription.save(update_fields=['status', 'updated_at'])
                    AuditEvent.log_event(
                        action='AUTO_CLOSED_ON_EXPIRY',
                        entity_type='Subscription',
                        entity_id=subscription.subscription_number,
                        description="Subscription auto-closed after reaching expiry date."
                    )
                    return False, f"Subscription {subscription.subscription_number} has expired and was auto-closed."

            period_start = subscription.next_billing_date
            period_end, next_billing = cls.calculate_next_period_dates(period_start, subscription.plan.billing_interval)

            # Idempotency constraint check: Ensure an invoice does not already exist for this subscription and period
            existing_invoice = Invoice.objects.filter(
                subscription=subscription,
                billing_period_start=period_start,
                billing_period_end=period_end
            ).first()

            if existing_invoice:
                # Advance billing date to prevent stuck loops if previously generated
                subscription.last_billing_date = period_start
                subscription.next_billing_date = next_billing
                subscription.save(update_fields=['last_billing_date', 'next_billing_date', 'updated_at'])
                return False, f"Invoice {existing_invoice.invoice_number} already exists for period {period_start} to {period_end}. Advanced date."

            # Calculate line items & charges
            subtotal = Decimal('0.00')
            discount_total = Decimal('0.00')
            tax_total = Decimal('0.00')

            # Create confirmed invoice container
            due_days = 30
            if subscription.payment_terms == 'IMMEDIATE':
                due_days = 0
            elif subscription.payment_terms == 'NET_15':
                due_days = 15
            elif subscription.payment_terms == 'NET_60':
                due_days = 60

            invoice = Invoice.objects.create(
                subscription=subscription,
                customer=subscription.customer,
                billing_period_start=period_start,
                billing_period_end=period_end,
                issue_date=run_date,
                due_date=run_date + datetime.timedelta(days=due_days),
                status=InvoiceStatus.CONFIRMED,
                subtotal=Decimal('0.00'),
                discount_amount=Decimal('0.00'),
                tax_amount=Decimal('0.00'),
                total_amount=Decimal('0.00'),
                balance_due=Decimal('0.00'),
                notes=f"Recurring billing invoice for {subscription.plan.name} ({period_start} to {period_end})"
            )

            # 1. Base Plan item
            if subscription.plan.price > Decimal('0.00'):
                plan_price = subscription.plan.price
                subtotal += plan_price
                InvoiceItem.objects.create(
                    invoice=invoice,
                    product_name=f"Plan: {subscription.plan.name}",
                    product_sku=subscription.plan.code,
                    variant_name="",
                    quantity=1,
                    unit_price=plan_price,
                    discount_amount=Decimal('0.00'),
                    tax_amount=Decimal('0.00'),
                    line_total=plan_price
                )

            # 2. Subscription line items
            for item in subscription.items.all():
                qty = item.quantity
                base_price = item.unit_price
                item_subtotal = base_price * qty
                subtotal += item_subtotal

                item_discount = Decimal('0.00')
                if item.discount:
                    is_eligible, _ = item.discount.is_eligible(
                        subtotal=item_subtotal,
                        quantity=qty,
                        product=item.product
                    )
                    if is_eligible:
                        item_discount = item.discount.calculate_discount(item_subtotal)
                        discount_total += item_discount

                taxable_amount = max(Decimal('0.00'), item_subtotal - item_discount)
                item_tax = Decimal('0.00')
                if item.tax_rule:
                    item_tax = item.tax_rule.calculate_tax(taxable_amount)
                    tax_total += item_tax

                line_total = taxable_amount + item_tax

                variant_name = item.variant.name if item.variant else ""
                InvoiceItem.objects.create(
                    invoice=invoice,
                    product_name=item.product.name,
                    product_sku=item.variant.effective_sku if item.variant else item.product.sku,
                    variant_name=variant_name,
                    quantity=qty,
                    unit_price=base_price,
                    discount_amount=item_discount,
                    tax_amount=item_tax,
                    line_total=line_total
                )

            # Finalize invoice totals
            final_total = max(Decimal('0.00'), subtotal - discount_total + tax_total)
            invoice.subtotal = subtotal
            invoice.discount_amount = discount_total
            invoice.tax_amount = tax_total
            invoice.total_amount = final_total
            invoice.balance_due = final_total
            invoice.save()

            # Advance subscription billing dates
            subscription.last_billing_date = period_start
            subscription.next_billing_date = next_billing
            subscription.save(update_fields=['last_billing_date', 'next_billing_date', 'updated_at'])

            AuditEvent.log_event(
                action='RECURRING_INVOICE_GENERATED',
                entity_type='Invoice',
                entity_id=invoice.invoice_number,
                description=f"Generated recurring invoice {invoice.invoice_number} for {subscription.subscription_number} (${final_total})",
                metadata={
                    'subscription_number': subscription.subscription_number,
                    'customer_id': subscription.customer.id,
                    'amount': str(final_total),
                    'period_start': str(period_start),
                    'period_end': str(period_end)
                }
            )

            return True, invoice

    @classmethod
    def run_all_due_billing(cls, target_date=None):
        """
        Identifies all due active subscriptions and runs billing sequentially with isolation.
        """
        today = target_date or datetime.date.today()
        due_subscriptions = Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            next_billing_date__lte=today
        ).values_list('id', flat=True)

        results = {
            'target_date': str(today),
            'found_due': len(due_subscriptions),
            'invoices_created': 0,
            'skipped_or_failed': 0,
            'details': []
        }

        for sub_id in due_subscriptions:
            try:
                success, msg_or_inv = cls.process_subscription_billing(sub_id, target_date=today)
                if success:
                    results['invoices_created'] += 1
                    results['details'].append({
                        'subscription_id': sub_id,
                        'status': 'SUCCESS',
                        'invoice_number': msg_or_inv.invoice_number,
                        'total': str(msg_or_inv.total_amount)
                    })
                else:
                    results['skipped_or_failed'] += 1
                    results['details'].append({
                        'subscription_id': sub_id,
                        'status': 'SKIPPED',
                        'reason': str(msg_or_inv)
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

