import csv
import datetime
from decimal import Decimal
from dateutil.relativedelta import relativedelta
from django.http import HttpResponse
from django.db.models import (
    Sum,
    Count,
    Q,
    F,
    Value,
    Case,
    When,
    ExpressionWrapper,
    DecimalField,
)
from rest_framework import views, permissions, status
from rest_framework.response import Response

from apps.accounts.permissions import IsStaffOrAdmin
from apps.customers.models import Customer, CustomerStatus
from apps.subscriptions.models import Subscription, SubscriptionStatus, SubscriptionItem
from apps.invoices.models import Invoice, InvoiceStatus, InvoiceItem
from apps.payments.models import Payment, PaymentMethod
from apps.plans.models import Plan, BillingInterval
from apps.products.models import Product


def sanitize_csv_cell(val):
    """
    Sanitize CSV field to prevent formula injection attacks (=, +, -, @).
    """
    if val is None:
        return ''
    s = str(val)
    if s and s[0] in ['=', '+', '-', '@']:
        return "'" + s
    return s


def calculate_mrr_sql(qs=None):
    """
    Computes exact database-aggregated MRR in SQL using CASE expressions.
    Multipliers:
      DAILY: amount * 30.00
      WEEKLY: amount * 4.33
      MONTHLY: amount * 1.00
      YEARLY: amount / 12.00
    """
    if qs is None:
        active_subs = Subscription.objects.filter(status=SubscriptionStatus.ACTIVE)
    else:
        active_subs = qs.filter(status=SubscriptionStatus.ACTIVE)

    mrr_plan_case = Case(
        When(
            plan__billing_interval=BillingInterval.DAILY,
            then=ExpressionWrapper(F('plan__price') * Value(Decimal('30.00')), output_field=DecimalField(max_digits=14, decimal_places=2))
        ),
        When(
            plan__billing_interval=BillingInterval.WEEKLY,
            then=ExpressionWrapper(F('plan__price') * Value(Decimal('4.33')), output_field=DecimalField(max_digits=14, decimal_places=2))
        ),
        When(
            plan__billing_interval=BillingInterval.MONTHLY,
            then=ExpressionWrapper(F('plan__price') * Value(Decimal('1.00')), output_field=DecimalField(max_digits=14, decimal_places=2))
        ),
        When(
            plan__billing_interval=BillingInterval.YEARLY,
            then=ExpressionWrapper(F('plan__price') / Value(Decimal('12.00')), output_field=DecimalField(max_digits=14, decimal_places=2))
        ),
        default=Value(Decimal('0.00')),
        output_field=DecimalField(max_digits=14, decimal_places=2)
    )

    plan_total = active_subs.aggregate(total=Sum(mrr_plan_case))['total'] or Decimal('0.00')

    item_mrr_case = Case(
        When(
            subscription__plan__billing_interval=BillingInterval.DAILY,
            then=ExpressionWrapper(F('unit_price') * F('quantity') * Value(Decimal('30.00')), output_field=DecimalField(max_digits=14, decimal_places=2))
        ),
        When(
            subscription__plan__billing_interval=BillingInterval.WEEKLY,
            then=ExpressionWrapper(F('unit_price') * F('quantity') * Value(Decimal('4.33')), output_field=DecimalField(max_digits=14, decimal_places=2))
        ),
        When(
            subscription__plan__billing_interval=BillingInterval.MONTHLY,
            then=ExpressionWrapper(F('unit_price') * F('quantity') * Value(Decimal('1.00')), output_field=DecimalField(max_digits=14, decimal_places=2))
        ),
        When(
            subscription__plan__billing_interval=BillingInterval.YEARLY,
            then=ExpressionWrapper(F('unit_price') * F('quantity') / Value(Decimal('12.00')), output_field=DecimalField(max_digits=14, decimal_places=2))
        ),
        default=Value(Decimal('0.00')),
        output_field=DecimalField(max_digits=14, decimal_places=2)
    )

    items_total = SubscriptionItem.objects.filter(subscription__in=active_subs).aggregate(total=Sum(item_mrr_case))['total'] or Decimal('0.00')

    return (plan_total + items_total).quantize(Decimal('0.01'))


def get_overdue_invoices_queryset():
    today = datetime.date.today()
    return Invoice.objects.filter(
        Q(status=InvoiceStatus.OVERDUE) |
        (Q(due_date__lt=today) & Q(balance_due__gt=0) & ~Q(status__in=[InvoiceStatus.PAID, InvoiceStatus.CANCELLED, 'VOID']))
    )


class DashboardMetricsView(views.APIView):
    """
    Computes real-time, database-driven financial and operational metrics.
    MRR is calculated directly via SQL aggregation without per-row Python loops.
    Monetary values are returned as Decimal strings (wire format).
    """
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        today = datetime.date.today()
        first_of_month = today.replace(day=1)
        next_week = today + datetime.timedelta(days=7)

        # 1. Total Customers
        total_customers = Customer.objects.filter(status=CustomerStatus.ACTIVE).count()

        # 2. Active Subscriptions & MRR / ARR via SQL aggregation
        active_subs = Subscription.objects.filter(status=SubscriptionStatus.ACTIVE)
        active_subscriptions_count = active_subs.count()

        total_mrr = calculate_mrr_sql(active_subs)
        total_arr = (total_mrr * Decimal('12.00')).quantize(Decimal('0.01'))

        # 3. Revenue
        revenue_collected_all_time = Payment.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        month_payments = Payment.objects.filter(payment_date__gte=first_of_month, payment_date__lte=today)
        revenue_this_month = month_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # 4. Invoices & Balances
        open_invoices = Invoice.objects.filter(status__in=[InvoiceStatus.CONFIRMED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE])
        outstanding_balance = open_invoices.aggregate(total=Sum('balance_due'))['total'] or Decimal('0.00')

        overdue_invoices_qs = get_overdue_invoices_queryset()
        overdue_count = overdue_invoices_qs.count()
        overdue_amount = overdue_invoices_qs.aggregate(total=Sum('balance_due'))['total'] or Decimal('0.00')

        due_next_month = open_invoices.filter(
            due_date__gte=today,
            due_date__lte=today + datetime.timedelta(days=30)
        ).aggregate(total=Sum('balance_due'))['total'] or Decimal('0.00')

        total_paid_invoices = Invoice.objects.filter(status=InvoiceStatus.PAID).aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        instant_payout_available = revenue_this_month + total_paid_invoices

        # Average turnaround days to get paid
        paid_invoices_with_duration = Invoice.objects.filter(status=InvoiceStatus.PAID, paid_amount__gt=0)
        avg_days_to_pay = 16
        if paid_invoices_with_duration.exists():
            days_list = [
                (inv.updated_at.date() - inv.issue_date).days
                for inv in paid_invoices_with_duration[:20]
                if (inv.updated_at.date() - inv.issue_date).days >= 0
            ]
            if days_list:
                avg_days_to_pay = max(3, round(sum(days_list) / len(days_list)))

        # 5. Upcoming renewals (next 7 days)
        upcoming_renewals_count = Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            next_billing_date__gte=today,
            next_billing_date__lte=next_week
        ).count()

        # 6. Churn rate (closed this month / (active at start of month + new this month))
        closed_this_month = Subscription.objects.filter(
            status=SubscriptionStatus.CLOSED,
            updated_at__date__gte=first_of_month
        ).count()
        new_this_month = Subscription.objects.filter(start_date__gte=first_of_month).count()
        active_at_start = Subscription.objects.filter(
            start_date__lt=first_of_month
        ).exclude(status__in=[SubscriptionStatus.DRAFT, SubscriptionStatus.QUOTATION]).count()
        denom = active_at_start + new_this_month
        churn_rate = f"{(Decimal(closed_this_month) / Decimal(denom) * Decimal('100.0')):.1f}%" if denom > 0 else "0.0%"

        # 7. Monthly trend (past 6 months)
        revenue_trend = []
        for i in range(5, -1, -1):
            m_start = (today.replace(day=1) - relativedelta(months=i))
            m_end = (m_start + relativedelta(months=1)) - datetime.timedelta(days=1)
            month_label = m_start.strftime("%b %Y")

            billed = Invoice.objects.filter(
                issue_date__gte=m_start,
                issue_date__lte=m_end,
                status__in=[InvoiceStatus.CONFIRMED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID, InvoiceStatus.OVERDUE]
            ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')

            collected = Payment.objects.filter(
                payment_date__gte=m_start,
                payment_date__lte=m_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

            revenue_trend.append({
                'month': month_label,
                'billed': float(billed),
                'collected': float(collected)
            })

        # 8. Subscription status distribution
        status_counts = Subscription.objects.values('status').annotate(count=Count('id'))
        sub_dist = {item['status']: item['count'] for item in status_counts}

        # 9. Recents
        recent_subscriptions = list(Subscription.objects.select_related('customer', 'plan').order_by('-created_at')[:5].values(
            'id', 'subscription_number', 'customer__name', 'plan__name', 'status', 'created_at'
        ))
        recent_invoices = list(Invoice.objects.select_related('customer').order_by('-created_at')[:8].values(
            'id', 'invoice_number', 'customer__name', 'customer__company', 'customer__email', 'total_amount', 'balance_due', 'status', 'issue_date', 'due_date'
        ))
        recent_payments = list(Payment.objects.select_related('customer', 'invoice').order_by('-created_at')[:5].values(
            'id', 'payment_number', 'customer__name', 'invoice__invoice_number', 'amount', 'payment_method', 'payment_date'
        ))
        overdue_invoices = list(overdue_invoices_qs.select_related('customer').order_by('due_date')[:5].values(
            'id', 'invoice_number', 'customer__name', 'customer__company', 'total_amount', 'balance_due', 'due_date'
        ))

        return Response({
            'metrics': {
                'total_customers': total_customers,
                'active_subscriptions': active_subscriptions_count,
                'mrr': f"{total_mrr:.2f}",
                'arr': f"{total_arr:.2f}",
                'revenue_collected': f"{revenue_collected_all_time:.2f}",
                'revenue_this_month': f"{revenue_this_month:.2f}",
                'outstanding_balance': f"{outstanding_balance:.2f}",
                'overdue_count': overdue_count,
                'overdue_amount': f"{overdue_amount:.2f}",
                'due_next_month': f"{due_next_month:.2f}",
                'avg_days_to_pay': avg_days_to_pay,
                'instant_payout_available': f"{instant_payout_available:.2f}",
                'upcoming_renewals_count': upcoming_renewals_count,
                'churn_rate': churn_rate,
            },
            'revenue_trend': revenue_trend,
            'subscription_distribution': [
                {'name': 'Active', 'count': sub_dist.get(SubscriptionStatus.ACTIVE, 0)},
                {'name': 'Paused', 'count': sub_dist.get(SubscriptionStatus.PAUSED, 0)},
                {'name': 'Draft', 'count': sub_dist.get(SubscriptionStatus.DRAFT, 0)},
                {'name': 'Confirmed', 'count': sub_dist.get(SubscriptionStatus.CONFIRMED, 0)},
                {'name': 'Closed', 'count': sub_dist.get(SubscriptionStatus.CLOSED, 0)},
            ],
            'recent_subscriptions': recent_subscriptions,
            'recent_invoices': recent_invoices,
            'recent_payments': recent_payments,
            'overdue_invoices': overdue_invoices
        })


class MRRBreakdownView(views.APIView):
    """
    Returns MRR breakdown grouped by plan or product.
    Query param: group_by ('plan' or 'product', defaults to 'plan').
    """
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        group_by = request.query_params.get('group_by', 'plan').lower()
        active_subs = Subscription.objects.filter(status=SubscriptionStatus.ACTIVE)

        if group_by == 'product':
            # Group by subscription items product
            products = Product.objects.all()
            data = []
            for p in products:
                items = SubscriptionItem.objects.filter(subscription__in=active_subs, product=p)
                active_units = items.aggregate(total_units=Sum('quantity'))['total_units'] or 0
                item_mrr_case = Case(
                    When(
                        subscription__plan__billing_interval=BillingInterval.DAILY,
                        then=ExpressionWrapper(F('unit_price') * F('quantity') * Value(Decimal('30.00')), output_field=DecimalField(max_digits=14, decimal_places=2))
                    ),
                    When(
                        subscription__plan__billing_interval=BillingInterval.WEEKLY,
                        then=ExpressionWrapper(F('unit_price') * F('quantity') * Value(Decimal('4.33')), output_field=DecimalField(max_digits=14, decimal_places=2))
                    ),
                    When(
                        subscription__plan__billing_interval=BillingInterval.MONTHLY,
                        then=ExpressionWrapper(F('unit_price') * F('quantity') * Value(Decimal('1.00')), output_field=DecimalField(max_digits=14, decimal_places=2))
                    ),
                    When(
                        subscription__plan__billing_interval=BillingInterval.YEARLY,
                        then=ExpressionWrapper(F('unit_price') * F('quantity') / Value(Decimal('12.00')), output_field=DecimalField(max_digits=14, decimal_places=2))
                    ),
                    default=Value(Decimal('0.00')),
                    output_field=DecimalField(max_digits=14, decimal_places=2)
                )
                product_mrr = items.aggregate(total=Sum(item_mrr_case))['total'] or Decimal('0.00')
                if active_units > 0 or product_mrr > 0:
                    data.append({
                        'product_id': p.id,
                        'product_name': p.name,
                        'active_units': active_units,
                        'mrr': f"{product_mrr:.2f}"
                    })
            data.sort(key=lambda x: Decimal(x['mrr']), reverse=True)
            return Response(data)

        # Default group by plan
        plans = Plan.objects.all()
        data = []
        for plan in plans:
            plan_subs = active_subs.filter(plan=plan)
            sub_count = plan_subs.count()
            plan_mrr = calculate_mrr_sql(plan_subs)
            if sub_count > 0 or plan_mrr > 0:
                data.append({
                    'plan_id': plan.id,
                    'plan_name': plan.name,
                    'billing_interval': plan.billing_interval,
                    'price': f"{plan.price:.2f}",
                    'active_subscriptions': sub_count,
                    'mrr': f"{plan_mrr:.2f}"
                })
        data.sort(key=lambda x: Decimal(x['mrr']), reverse=True)
        return Response(data)


class RevenueTrendsView(views.APIView):
    """
    Returns monthly revenue trends for the last 6-12 months.
    """
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        months_count = min(max(int(request.query_params.get('months', 6)), 1), 24)
        today = datetime.date.today()
        trends = []

        for i in range(months_count - 1, -1, -1):
            m_start = (today.replace(day=1) - relativedelta(months=i))
            m_end = (m_start + relativedelta(months=1)) - datetime.timedelta(days=1)
            month_label = m_start.strftime("%b %Y")

            billed = Invoice.objects.filter(
                issue_date__gte=m_start,
                issue_date__lte=m_end,
                status__in=[InvoiceStatus.CONFIRMED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID, InvoiceStatus.OVERDUE]
            ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')

            collected = Payment.objects.filter(
                payment_date__gte=m_start,
                payment_date__lte=m_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

            trends.append({
                'month': month_label,
                'billed': f"{billed:.2f}",
                'collected': f"{collected:.2f}"
            })

        return Response(trends)


class SubscriptionsByStatusView(views.APIView):
    """
    Returns count and total recurring value by subscription status.
    """
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        results = []
        for status_code, status_label in SubscriptionStatus.choices:
            subs = Subscription.objects.filter(status=status_code)
            count = subs.count()
            # If active, calculate normalized MRR; else total plan price sum
            if status_code == SubscriptionStatus.ACTIVE:
                total_val = calculate_mrr_sql(subs)
            else:
                total_val = subs.aggregate(total=Sum('plan__price'))['total'] or Decimal('0.00')

            results.append({
                'status': status_code,
                'status_label': str(status_label),
                'count': count,
                'total_value': f"{total_val:.2f}"
            })
        return Response(results)


class PaymentMethodDistributionView(views.APIView):
    """Cash collected per payment method, largest first (used by the Reports page)."""
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        records = (
            Payment.objects.values('payment_method')
            .annotate(total_amount=Sum('amount'), total_count=Count('id'))
            .order_by('-total_amount')
        )
        data = [
            {
                'method': rec['payment_method'],
                'total_amount': f"{(rec['total_amount'] or Decimal('0.00')):.2f}",
                'count': rec['total_count'],
            }
            for rec in records
        ]
        return Response(data)


class DrillDownView(views.APIView):
    """
    Returns underlying records for a specific high-level metric.
    Metrics supported: 'mrr', 'active_subscriptions', 'overdue_invoices', 'revenue_collected'.
    Supports pagination, date filtering, and entity filtering.
    """
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        metric = request.query_params.get('metric', 'mrr').lower()
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        product_id = request.query_params.get('product_id')
        plan_id = request.query_params.get('plan_id')

        try:
            page = max(1, int(request.query_params.get('page', 1)))
            page_size = min(max(1, int(request.query_params.get('page_size', 20))), 100)
        except ValueError:
            page = 1
            page_size = 20

        records = []

        if metric in ['mrr', 'active_subscriptions']:
            qs = Subscription.objects.filter(status=SubscriptionStatus.ACTIVE).select_related('customer', 'plan')
            if plan_id:
                qs = qs.filter(plan_id=plan_id)
            if product_id:
                qs = qs.filter(items__product_id=product_id).distinct()
            if start_date:
                qs = qs.filter(start_date__gte=start_date)
            if end_date:
                qs = qs.filter(start_date__lte=end_date)

            total_count = qs.count()
            qs_slice = qs.order_by('-start_date')[(page - 1) * page_size : page * page_size]

            for s in qs_slice:
                records.append({
                    'id': s.id,
                    'reference': s.subscription_number,
                    'customer_name': s.customer.name,
                    'amount': f"{s.normalized_mrr:.2f}",
                    'date': s.start_date.isoformat(),
                    'status': s.status,
                    'details': f"Plan: {s.plan.name} ({s.plan.billing_interval})"
                })

        elif metric == 'overdue_invoices':
            qs = get_overdue_invoices_queryset().select_related('customer')
            if start_date:
                qs = qs.filter(due_date__gte=start_date)
            if end_date:
                qs = qs.filter(due_date__lte=end_date)

            total_count = qs.count()
            qs_slice = qs.order_by('due_date')[(page - 1) * page_size : page * page_size]

            for inv in qs_slice:
                records.append({
                    'id': inv.id,
                    'reference': inv.invoice_number,
                    'customer_name': inv.customer.name,
                    'amount': f"{inv.balance_due:.2f}",
                    'date': inv.due_date.isoformat(),
                    'status': inv.status,
                    'details': f"Total: ${inv.total_amount:.2f}, Paid: ${inv.paid_amount:.2f}"
                })

        elif metric in ['revenue_collected', 'revenue', 'payments']:
            qs = Payment.objects.all().select_related('customer', 'invoice')
            if start_date:
                qs = qs.filter(payment_date__gte=start_date)
            if end_date:
                qs = qs.filter(payment_date__lte=end_date)

            total_count = qs.count()
            qs_slice = qs.order_by('-payment_date')[(page - 1) * page_size : page * page_size]

            for p in qs_slice:
                inv_ref = p.invoice.invoice_number if p.invoice else 'N/A'
                records.append({
                    'id': p.id,
                    'reference': p.payment_number,
                    'customer_name': p.customer.name,
                    'amount': f"{p.amount:.2f}",
                    'date': p.payment_date.isoformat(),
                    'status': 'COMPLETED',
                    'details': f"Method: {p.payment_method}, Inv: {inv_ref}"
                })

        else:
            return Response({'error': f'Unsupported metric: {metric}'}, status=status.HTTP_400_BAD_REQUEST)

        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1

        return Response({
            'metric': metric,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'results': records
        })


class ExportReportCSVView(views.APIView):
    """
    Exports clean CSV reports for subscriptions, invoices, payments, or drilldown queries.
    Cells are strictly sanitized against spreadsheet formula injection attacks.
    """
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        report_type = request.query_params.get('type', 'invoices').lower()
        response = HttpResponse(content_type='text/csv')

        if report_type == 'drilldown':
            metric = request.query_params.get('metric', 'mrr').lower()
            response['Content-Disposition'] = f'attachment; filename="brightloop_drilldown_{metric}.csv"'
            writer = csv.writer(response)
            writer.writerow(['ID', 'Reference', 'Customer Name', 'Amount', 'Date', 'Status', 'Details'])

            # Use DrillDown logic without pagination limits
            if metric in ['mrr', 'active_subscriptions']:
                for s in Subscription.objects.filter(status=SubscriptionStatus.ACTIVE).select_related('customer', 'plan').order_by('-start_date'):
                    writer.writerow([
                        sanitize_csv_cell(s.id),
                        sanitize_csv_cell(s.subscription_number),
                        sanitize_csv_cell(s.customer.name),
                        sanitize_csv_cell(f"{s.normalized_mrr:.2f}"),
                        sanitize_csv_cell(s.start_date),
                        sanitize_csv_cell(s.status),
                        sanitize_csv_cell(f"{s.plan.name} ({s.plan.billing_interval})"),
                    ])
            elif metric == 'overdue_invoices':
                for inv in get_overdue_invoices_queryset().select_related('customer').order_by('due_date'):
                    writer.writerow([
                        sanitize_csv_cell(inv.id),
                        sanitize_csv_cell(inv.invoice_number),
                        sanitize_csv_cell(inv.customer.name),
                        sanitize_csv_cell(f"{inv.balance_due:.2f}"),
                        sanitize_csv_cell(inv.due_date),
                        sanitize_csv_cell(inv.status),
                        sanitize_csv_cell(f"Total: ${inv.total_amount:.2f}"),
                    ])
            elif metric in ['revenue_collected', 'revenue', 'payments']:
                for p in Payment.objects.all().select_related('customer', 'invoice').order_by('-payment_date'):
                    writer.writerow([
                        sanitize_csv_cell(p.id),
                        sanitize_csv_cell(p.payment_number),
                        sanitize_csv_cell(p.customer.name),
                        sanitize_csv_cell(f"{p.amount:.2f}"),
                        sanitize_csv_cell(p.payment_date),
                        sanitize_csv_cell('COMPLETED'),
                        sanitize_csv_cell(p.payment_method),
                    ])
            return response

        elif report_type == 'subscriptions':
            response['Content-Disposition'] = 'attachment; filename="brightloop_subscriptions.csv"'
            writer = csv.writer(response)
            writer.writerow(['Subscription Number', 'Customer', 'Plan', 'Status', 'Start Date', 'Expiry Date', 'Next Billing Date', 'MRR'])
            for s in Subscription.objects.select_related('customer', 'plan').all():
                writer.writerow([
                    sanitize_csv_cell(s.subscription_number),
                    sanitize_csv_cell(s.customer.name),
                    sanitize_csv_cell(s.plan.name),
                    sanitize_csv_cell(s.status),
                    sanitize_csv_cell(s.start_date),
                    sanitize_csv_cell(s.expiry_date or ''),
                    sanitize_csv_cell(s.next_billing_date),
                    sanitize_csv_cell(f"${s.normalized_mrr:,.2f}")
                ])
        elif report_type == 'payments':
            response['Content-Disposition'] = 'attachment; filename="brightloop_payments.csv"'
            writer = csv.writer(response)
            writer.writerow(['Payment Ref', 'Invoice', 'Customer', 'Amount', 'Method', 'Date', 'Transaction Ref'])
            for p in Payment.objects.select_related('customer', 'invoice').all():
                writer.writerow([
                    sanitize_csv_cell(p.payment_number),
                    sanitize_csv_cell(p.invoice.invoice_number if p.invoice else ''),
                    sanitize_csv_cell(p.customer.name),
                    sanitize_csv_cell(f"${p.amount:,.2f}"),
                    sanitize_csv_cell(p.payment_method),
                    sanitize_csv_cell(p.payment_date),
                    sanitize_csv_cell(p.transaction_reference)
                ])
        else: # Default invoices
            response['Content-Disposition'] = 'attachment; filename="brightloop_invoices.csv"'
            writer = csv.writer(response)
            writer.writerow(['Invoice Number', 'Customer', 'Status', 'Issue Date', 'Due Date', 'Total', 'Paid', 'Balance Due'])
            for inv in Invoice.objects.select_related('customer').all():
                writer.writerow([
                    sanitize_csv_cell(inv.invoice_number),
                    sanitize_csv_cell(inv.customer.name),
                    sanitize_csv_cell(inv.status),
                    sanitize_csv_cell(inv.issue_date),
                    sanitize_csv_cell(inv.due_date),
                    sanitize_csv_cell(f"${inv.total_amount:,.2f}"),
                    sanitize_csv_cell(f"${inv.paid_amount:,.2f}"),
                    sanitize_csv_cell(f"${inv.balance_due:,.2f}")
                ])

        return response


class PublicSummaryView(views.APIView):
    """
    Public summary endpoint for landing page & health status.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        total_customers = Customer.objects.filter(status=CustomerStatus.ACTIVE).count()
        active_subs = Subscription.objects.filter(status=SubscriptionStatus.ACTIVE)
        active_subscriptions_count = active_subs.count()

        total_mrr = calculate_mrr_sql(active_subs)
        total_arr = (total_mrr * Decimal('12.00')).quantize(Decimal('0.01'))

        total_invoices = Invoice.objects.exclude(status=InvoiceStatus.CANCELLED).count()
        total_paid_invoices = Invoice.objects.filter(status=InvoiceStatus.PAID).count()

        showcase_invoices = list(Invoice.objects.select_related('customer').order_by('-created_at')[:4].values(
            'id', 'invoice_number', 'customer__company', 'customer__name', 'total_amount', 'status', 'due_date'
        ))

        return Response({
            'status': 'HEALTHY',
            'total_customers': total_customers,
            'active_subscriptions': active_subscriptions_count,
            'total_invoices': total_invoices,
            'total_paid_invoices': total_paid_invoices,
            'mrr': f"{total_mrr:.2f}",
            'arr': f"{total_arr:.2f}",
            'showcase_invoices': showcase_invoices,
            'database_engine': 'PostgreSQL / Local DB',
            'billing_engine': 'Celery + Redis / Transactional Row Lock',
        })
