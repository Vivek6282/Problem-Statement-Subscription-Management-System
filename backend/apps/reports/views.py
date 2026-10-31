import csv
import datetime
from decimal import Decimal
from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.utils import timezone
from django.http import StreamingHttpResponse
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
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.accounts.permissions import IsStaffOrAdmin
from apps.audit.models import AuditEvent
from apps.customers.models import Customer, CustomerStatus
from apps.subscriptions.models import MRR_FACTORS, Subscription, SubscriptionStatus, SubscriptionItem
from apps.invoices.models import Invoice, InvoiceStatus, InvoiceItem
from apps.payments.models import Payment, PaymentMethod
from apps.plans.models import Plan, BillingInterval
from apps.products.models import Product
from .business_time import business_today


_CSV_FORMULA_START = ('=', '+', '-', '@')
_CSV_LEADING_BLANKS = ' \t\r\n'


def sanitize_csv_cell(val):
    """
    Neutralise spreadsheet formula injection. The value is treated as text; if, after skipping
    leading space, tab, CR and LF, it starts with = + - @, or if it starts with a tab or CR,
    a single quote is prefixed so the cell opens as plain text.
    """
    if val is None:
        return ''
    s = str(val)
    if s[:1] in ('\t', '\r') or s.lstrip(_CSV_LEADING_BLANKS)[:1] in _CSV_FORMULA_START:
        return "'" + s
    return s


_MONEY_FIELD = DecimalField(max_digits=18, decimal_places=6)


def mrr_case(amount_expr, interval_path):
    """
    CASE expression turning a recurring amount into normalised monthly revenue.
    `interval_path` is the lookup to the plan billing interval, e.g. 'plan__billing_interval'.
    """
    whens = [
        When(
            **{interval_path: interval},
            then=ExpressionWrapper(
                amount_expr * Value(factor),
                output_field=_MONEY_FIELD,
            ),
        )
        for interval, factor in MRR_FACTORS.items()
    ]
    return Case(*whens, default=Value(Decimal('0')), output_field=_MONEY_FIELD)


def calculate_mrr_sql(qs=None):
    """
    Database-aggregated MRR for ACTIVE subscriptions (plan price plus line items).
    Multipliers: DAILY x30, WEEKLY x52/12, MONTHLY x1, YEARLY /12.
    Only the final sum is rounded to 2 decimals.
    """
    if qs is None:
        active_subs = Subscription.objects.filter(status=SubscriptionStatus.ACTIVE)
    else:
        active_subs = qs.filter(status=SubscriptionStatus.ACTIVE)

    plan_total = active_subs.aggregate(
        total=Sum(mrr_case(F('plan__price'), 'plan__billing_interval'))
    )['total'] or Decimal('0')

    items_total = SubscriptionItem.objects.filter(subscription__in=active_subs).aggregate(
        total=Sum(mrr_case(F('unit_price') * F('quantity'), 'subscription__plan__billing_interval'))
    )['total'] or Decimal('0')

    return (plan_total + items_total).quantize(Decimal('0.01'))


OPEN_INVOICE_STATUSES = [InvoiceStatus.CONFIRMED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]
BILLED_INVOICE_STATUSES = [
    InvoiceStatus.CONFIRMED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID, InvoiceStatus.OVERDUE,
]


def report_meta():
    """Fields every report response carries so figures can be traced to a moment and currency."""
    return {
        'currency_code': settings.CURRENCY_CODE,
        'generated_at': timezone.now().astimezone(datetime.timezone.utc).isoformat().replace('+00:00', 'Z'),
        'as_of_date': business_today().isoformat(),
    }


def get_open_invoices_queryset():
    """Outstanding = unpaid balance on invoices that are open (confirmed, partly paid or flagged overdue)."""
    return Invoice.objects.filter(status__in=OPEN_INVOICE_STATUSES, balance_due__gt=0)


def get_overdue_invoices_queryset(today=None):
    """
    Overdue = open invoice with a balance whose due date is before business today.
    The stored OVERDUE status alone is not enough (a due date of today or later is not overdue);
    DRAFT, PAID and CANCELLED are never overdue.
    """
    today = today or business_today()
    return get_open_invoices_queryset().filter(due_date__lt=today)


def get_billed_invoices_queryset(start_date=None, end_date=None):
    """Billed = invoiced total of non-draft, non-cancelled invoices, by issue date."""
    qs = Invoice.objects.filter(status__in=BILLED_INVOICE_STATUSES)
    if start_date:
        qs = qs.filter(issue_date__gte=start_date)
    if end_date:
        qs = qs.filter(issue_date__lte=end_date)
    return qs


def get_received_payments_queryset(start_date=None, end_date=None):
    """Received = recorded payments, by payment date."""
    qs = Payment.objects.all()
    if start_date:
        qs = qs.filter(payment_date__gte=start_date)
    if end_date:
        qs = qs.filter(payment_date__lte=end_date)
    return qs


def _sum(qs, field):
    return qs.aggregate(total=Sum(field))['total'] or Decimal('0.00')


class ConfigView(views.APIView):
    """Display currency and business calendar for the signed-in user. No conversion happens."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({
            'currency_code': settings.CURRENCY_CODE,
            'business_timezone': settings.BUSINESS_TIMEZONE,
            'business_today': business_today().isoformat(),
        })


class DashboardMetricsView(views.APIView):
    """
    Computes real-time, database-driven financial and operational metrics.
    MRR is calculated directly via SQL aggregation without per-row Python loops.
    Monetary values are returned as Decimal strings (wire format).
    """
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        today = business_today()
        first_of_month = today.replace(day=1)
        next_week = today + datetime.timedelta(days=7)

        # 1. Total Customers
        total_customers = Customer.objects.filter(status=CustomerStatus.ACTIVE).count()

        # 2. Active Subscriptions & MRR / ARR via SQL aggregation
        active_subs = Subscription.objects.filter(status=SubscriptionStatus.ACTIVE)
        active_subscriptions_count = active_subs.count()

        total_mrr = calculate_mrr_sql(active_subs)
        total_arr = (total_mrr * Decimal('12.00')).quantize(Decimal('0.01'))

        # 3. Received (payments) and billed (invoiced)
        received_all = get_received_payments_queryset()
        received_month = get_received_payments_queryset(first_of_month, today)
        billed_month = get_billed_invoices_queryset(first_of_month, today)
        revenue_collected_all_time = _sum(received_all, 'amount')
        revenue_this_month = _sum(received_month, 'amount')

        # 4. Outstanding, overdue and due soon share one open-invoice definition
        open_invoices = get_open_invoices_queryset()
        outstanding_balance = _sum(open_invoices, 'balance_due')

        overdue_invoices_qs = get_overdue_invoices_queryset(today)
        overdue_count = overdue_invoices_qs.count()
        overdue_amount = _sum(overdue_invoices_qs, 'balance_due')

        due_next_month = _sum(
            open_invoices.filter(due_date__gte=today, due_date__lte=today + datetime.timedelta(days=30)),
            'balance_due',
        )

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

            billed = _sum(get_billed_invoices_queryset(m_start, m_end), 'total_amount')

            collected = _sum(get_received_payments_queryset(m_start, m_end), 'amount')

            revenue_trend.append({
                'month': month_label,
                'billed': f"{billed:.2f}",
                'collected': f"{collected:.2f}"
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
                'outstanding_count': open_invoices.count(),
                'overdue_count': overdue_count,
                'overdue_amount': f"{overdue_amount:.2f}",
                'due_next_month': f"{due_next_month:.2f}",
                'avg_days_to_pay': avg_days_to_pay,
                'instant_payout_available': f"{instant_payout_available:.2f}",
                'upcoming_renewals_count': upcoming_renewals_count,
                'churn_rate': churn_rate,
                'churn_provisional': True,
                'revenue_collected_count': received_all.count(),
                'revenue_this_month_count': received_month.count(),
                'billed_this_month': f"{_sum(billed_month, 'total_amount'):.2f}",
                'billed_this_month_count': billed_month.count(),
            },
            **report_meta(),
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
                item_mrr_case = mrr_case(F('unit_price') * F('quantity'), 'subscription__plan__billing_interval')
                product_mrr = (items.aggregate(total=Sum(item_mrr_case))['total'] or Decimal('0')).quantize(Decimal('0.01'))
                if active_units > 0 or product_mrr > 0:
                    data.append({
                        'product_id': p.id,
                        'product_name': p.name,
                        'active_units': active_units,
                        'mrr': f"{product_mrr:.2f}"
                    })
            data.sort(key=lambda x: Decimal(x['mrr']), reverse=True)
            return Response({'results': data, 'group_by': 'product', **report_meta()})

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
        return Response({'results': data, 'group_by': 'plan', **report_meta()})


class RevenueTrendsView(views.APIView):
    """
    Returns monthly revenue trends for the last 6-12 months.
    """
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        months_count = min(max(int(request.query_params.get('months', 6)), 1), 24)
        today = business_today()
        trends = []

        for i in range(months_count - 1, -1, -1):
            m_start = (today.replace(day=1) - relativedelta(months=i))
            m_end = (m_start + relativedelta(months=1)) - datetime.timedelta(days=1)
            month_label = m_start.strftime("%b %Y")

            billed = _sum(get_billed_invoices_queryset(m_start, m_end), 'total_amount')

            collected = _sum(get_received_payments_queryset(m_start, m_end), 'amount')

            trends.append({
                'month': month_label,
                'billed': f"{billed:.2f}",
                'collected': f"{collected:.2f}"
            })

        return Response({'results': trends, **report_meta()})


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


DRILLDOWN_METRICS = {
    'mrr': 'subscriptions',
    'active_subscriptions': 'subscriptions',
    'overdue_invoices': 'overdue',
    'overdue': 'overdue',
    'outstanding': 'outstanding',
    'billed': 'billed',
    'revenue_collected': 'payments',
    'revenue': 'payments',
    'payments': 'payments',
}

DRILLDOWN_HEADER = ['ID', 'Reference', 'Customer Name', 'Amount', 'Date', 'Status', 'Details']


def _parse_date_param(params, name):
    raw = params.get(name)
    if not raw:
        return None
    try:
        return datetime.date.fromisoformat(raw)
    except ValueError:
        raise ValidationError({name: 'Use an ISO date, YYYY-MM-DD.'})


def _parse_id_param(params, name):
    raw = params.get(name)
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError:
        raise ValidationError({name: 'Must be a whole number.'})


def parse_report_filters(params):
    """The only filters the drill-down and the exports accept."""
    return {
        'start_date': _parse_date_param(params, 'start_date'),
        'end_date': _parse_date_param(params, 'end_date'),
        'plan_id': _parse_id_param(params, 'plan_id'),
        'product_id': _parse_id_param(params, 'product_id'),
    }


def drilldown_queryset(metric, filters):
    """
    The one place that decides which records sit behind a metric and which filters apply.
    Returns (kind, queryset, total) where total is the metric's headline amount for that set.
    Cards, drill-downs and exports all go through here so they reconcile.
    """
    kind = DRILLDOWN_METRICS[metric]
    start, end = filters['start_date'], filters['end_date']

    if kind == 'subscriptions':
        qs = Subscription.objects.filter(status=SubscriptionStatus.ACTIVE)
        if filters['plan_id']:
            qs = qs.filter(plan_id=filters['plan_id'])
        if filters['product_id']:
            qs = qs.filter(pk__in=SubscriptionItem.objects.filter(product_id=filters['product_id']).values('subscription_id'))
        if start:
            qs = qs.filter(start_date__gte=start)
        if end:
            qs = qs.filter(start_date__lte=end)
        total = calculate_mrr_sql(qs)
        return kind, qs.select_related('customer', 'plan').prefetch_related('items').order_by('-start_date', 'id'), total

    if kind in ('overdue', 'outstanding'):
        qs = get_overdue_invoices_queryset() if kind == 'overdue' else get_open_invoices_queryset()
        if start:
            qs = qs.filter(due_date__gte=start)
        if end:
            qs = qs.filter(due_date__lte=end)
        return kind, qs.select_related('customer').order_by('due_date', 'id'), _sum(qs, 'balance_due')

    if kind == 'billed':
        qs = get_billed_invoices_queryset(start, end)
        return kind, qs.select_related('customer').order_by('-issue_date', 'id'), _sum(qs, 'total_amount')

    qs = get_received_payments_queryset(start, end)
    return kind, qs.select_related('customer', 'invoice').order_by('-payment_date', 'id'), _sum(qs, 'amount')


def drilldown_row(kind, obj):
    """(id, reference, customer, amount, date, status, details) as plain values; amount is a 2-decimal string."""
    if kind == 'subscriptions':
        return (
            obj.id, obj.subscription_number, obj.customer.name, f"{obj.normalized_mrr:.2f}",
            obj.start_date.isoformat(), obj.status, f"Plan: {obj.plan.name} ({obj.plan.billing_interval})",
        )
    if kind in ('overdue', 'outstanding'):
        return (
            obj.id, obj.invoice_number, obj.customer.name, f"{obj.balance_due:.2f}",
            obj.due_date.isoformat(), obj.status, f"Total: {obj.total_amount:.2f}, Paid: {obj.paid_amount:.2f}",
        )
    if kind == 'billed':
        return (
            obj.id, obj.invoice_number, obj.customer.name, f"{obj.total_amount:.2f}",
            obj.issue_date.isoformat(), obj.status, f"Balance due: {obj.balance_due:.2f}",
        )
    inv_ref = obj.invoice.invoice_number if obj.invoice else 'N/A'
    return (
        obj.id, obj.payment_number, obj.customer.name, f"{obj.amount:.2f}",
        obj.payment_date.isoformat(), 'COMPLETED', f"Method: {obj.payment_method}, Inv: {inv_ref}",
    )


class DrillDownView(views.APIView):
    """
    Returns the records behind a headline metric.
    Metrics: mrr, active_subscriptions, overdue_invoices (alias overdue), outstanding, billed,
    revenue_collected (aliases revenue, payments).
    Filters: start_date, end_date, plan_id, product_id (plan/product apply to subscription metrics only).
    `count` and `total` come from the same queryset the dashboard cards use.
    """
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        metric = request.query_params.get('metric', 'mrr').lower()
        if metric not in DRILLDOWN_METRICS:
            return Response({'error': f'Unsupported metric: {metric}'}, status=status.HTTP_400_BAD_REQUEST)
        filters = parse_report_filters(request.query_params)

        try:
            page = max(1, int(request.query_params.get('page', 1)))
            page_size = min(max(1, int(request.query_params.get('page_size', 20))), 100)
        except ValueError:
            page = 1
            page_size = 20

        kind, qs, total = drilldown_queryset(metric, filters)
        total_count = qs.count()
        records = []
        for obj in qs[(page - 1) * page_size: page * page_size]:
            row = drilldown_row(kind, obj)
            records.append(dict(zip(
                ['id', 'reference', 'customer_name', 'amount', 'date', 'status', 'details'], row,
            )))

        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1
        return Response({
            'metric': metric,
            'count': total_count,
            'total': f"{total:.2f}",
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'results': records,
            **report_meta(),
        })


class _Echo:
    """File-like object whose write() returns the value, so csv.writer can feed a generator."""
    def write(self, value):
        return value


EXPORT_CHUNK_SIZE = 1000


def _stream_csv(header, rows):
    writer = csv.writer(_Echo())
    yield writer.writerow(header)
    for row in rows:
        yield writer.writerow([sanitize_csv_cell(v) for v in row])


def _money(value):
    return f"{value:.2f}"


def _export_subscriptions(filters):
    qs = Subscription.objects.all()
    if filters['plan_id']:
        qs = qs.filter(plan_id=filters['plan_id'])
    if filters['product_id']:
        qs = qs.filter(pk__in=SubscriptionItem.objects.filter(product_id=filters['product_id']).values('subscription_id'))
    if filters['start_date']:
        qs = qs.filter(start_date__gte=filters['start_date'])
    if filters['end_date']:
        qs = qs.filter(start_date__lte=filters['end_date'])
    qs = qs.select_related('customer', 'plan').prefetch_related('items').order_by('id')
    header = ['Subscription Number', 'Customer', 'Plan', 'Status', 'Start Date', 'Expiry Date',
              'Next Billing Date', 'MRR', 'Currency']
    rows = (
        (s.subscription_number, s.customer.name, s.plan.name, s.status, s.start_date.isoformat(),
         s.expiry_date.isoformat() if s.expiry_date else '', s.next_billing_date.isoformat() if s.next_billing_date else '',
         _money(s.normalized_mrr), settings.CURRENCY_CODE)
        for s in qs.iterator(chunk_size=EXPORT_CHUNK_SIZE)
    )
    return header, rows


def _export_payments(filters):
    qs = get_received_payments_queryset(filters['start_date'], filters['end_date'])
    qs = qs.select_related('customer', 'invoice').order_by('-payment_date', 'id')
    header = ['Payment Ref', 'Invoice', 'Customer', 'Amount', 'Method', 'Date', 'Transaction Ref', 'Currency']
    rows = (
        (p.payment_number, p.invoice.invoice_number if p.invoice else '', p.customer.name, _money(p.amount),
         p.payment_method, p.payment_date.isoformat(), p.transaction_reference, settings.CURRENCY_CODE)
        for p in qs.iterator(chunk_size=EXPORT_CHUNK_SIZE)
    )
    return header, rows


def _export_invoices(filters):
    qs = Invoice.objects.all()
    if filters['start_date']:
        qs = qs.filter(issue_date__gte=filters['start_date'])
    if filters['end_date']:
        qs = qs.filter(issue_date__lte=filters['end_date'])
    qs = qs.select_related('customer').order_by('-issue_date', 'id')
    header = ['Invoice Number', 'Customer', 'Status', 'Issue Date', 'Due Date', 'Total', 'Paid', 'Balance Due', 'Currency']
    rows = (
        (i.invoice_number, i.customer.name, i.status, i.issue_date.isoformat(), i.due_date.isoformat(),
         _money(i.total_amount), _money(i.paid_amount), _money(i.balance_due), settings.CURRENCY_CODE)
        for i in qs.iterator(chunk_size=EXPORT_CHUNK_SIZE)
    )
    return header, rows


def _export_drilldown(metric, filters):
    kind, qs, _total = drilldown_queryset(metric, filters)
    header = DRILLDOWN_HEADER + ['Currency']
    rows = (drilldown_row(kind, obj) + (settings.CURRENCY_CODE,) for obj in qs.iterator(chunk_size=EXPORT_CHUNK_SIZE))
    return header, rows


class ExportReportCSVView(views.APIView):
    """
    Streams CSV exports (drilldown, subscriptions, payments, invoices) for the same filters the
    drill-down accepts. Money is a plain 2-decimal string with a Currency column, dates are ISO 8601,
    and every cell is neutralised against spreadsheet formula injection.
    """
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        report_type = request.query_params.get('type', 'invoices').lower()
        filters = parse_report_filters(request.query_params)

        if report_type == 'drilldown':
            metric = request.query_params.get('metric', 'mrr').lower()
            if metric not in DRILLDOWN_METRICS:
                return Response({'error': f'Unsupported metric: {metric}'}, status=status.HTTP_400_BAD_REQUEST)
            header, rows = _export_drilldown(metric, filters)
            label = f'drilldown_{metric}'
        elif report_type == 'subscriptions':
            header, rows = _export_subscriptions(filters)
            label = 'subscriptions'
        elif report_type == 'payments':
            header, rows = _export_payments(filters)
            label = 'payments'
        else:
            header, rows = _export_invoices(filters)
            label = 'invoices'

        start = filters['start_date'].isoformat() if filters['start_date'] else 'all'
        end = filters['end_date'].isoformat() if filters['end_date'] else 'all'

        AuditEvent.log_event(
            action='REPORT_EXPORTED',
            entity_type='Report',
            entity_id=label,
            description=f'Exported {label} report as CSV',
            user=request.user,
            metadata={
                'type': label,
                'start_date': start,
                'end_date': end,
                'plan_id': filters['plan_id'],
                'product_id': filters['product_id'],
            },
        )

        response = StreamingHttpResponse(_stream_csv(header, rows), content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="brightloop_{label}_{start}_{end}.csv"'
        response['Cache-Control'] = 'no-store'
        return response


class PublicSummaryView(views.APIView):
    """
    Public health probe. Anonymous callers receive no business data.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'status': 'HEALTHY'})
