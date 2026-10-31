import csv
import datetime
from decimal import Decimal
from dateutil.relativedelta import relativedelta
from django.http import HttpResponse
from django.db.models import Sum, Count, Q, F, DecimalField, ExpressionWrapper
from django.db.models.functions import TruncMonth
from rest_framework import views, status
from rest_framework.response import Response

from apps.accounts.permissions import IsStaffOrAdmin
from apps.customers.models import Customer, CustomerStatus
from apps.subscriptions.models import Subscription, SubscriptionItem, SubscriptionStatus
from apps.invoices.models import Invoice, InvoiceStatus, InvoiceItem
from apps.payments.models import Payment, PaymentStatus
from apps.plans.models import Plan

BILLED_STATUSES = [InvoiceStatus.CONFIRMED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID, InvoiceStatus.OVERDUE]
OPEN_STATUSES = [InvoiceStatus.CONFIRMED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]
MRR_FACTORS = {
    'DAILY': Decimal('30'), 'WEEKLY': Decimal('52') / Decimal('12'),
    'MONTHLY': Decimal('1'), 'YEARLY': Decimal('1') / Decimal('12'),
}
ZERO = Decimal('0.00')


class ReportFilters:
    """Parses the shared dashboard / report query parameters and applies them to each model."""

    def __init__(self, params):
        self.errors = []
        self.date_from = self._date(params.get('date_from'), 'date_from')
        self.date_to = self._date(params.get('date_to'), 'date_to')
        self.subscription_status = params.get('subscription_status') or None
        self.invoice_status = params.get('invoice_status') or None
        self.payment_method = params.get('payment_method') or None
        self.customer = self._int(params.get('customer'), 'customer')
        if self.date_from and self.date_to and self.date_from > self.date_to:
            self.errors.append("date_from must be on or before date_to.")

    def _date(self, value, name):
        if not value:
            return None
        try:
            return datetime.date.fromisoformat(value)
        except ValueError:
            self.errors.append(f"{name} must be YYYY-MM-DD.")
            return None

    def _int(self, value, name):
        if not value:
            return None
        try:
            return int(value)
        except ValueError:
            self.errors.append(f"{name} must be an integer id.")
            return None

    def _range(self, qs, field):
        if self.date_from:
            qs = qs.filter(**{f'{field}__gte': self.date_from})
        if self.date_to:
            qs = qs.filter(**{f'{field}__lte': self.date_to})
        return qs

    def invoices(self, qs=None, with_status=True, with_dates=True):
        qs = Invoice.objects.all() if qs is None else qs
        if self.customer:
            qs = qs.filter(customer_id=self.customer)
        if with_status and self.invoice_status:
            qs = qs.filter(status=self.invoice_status)
        return self._range(qs, 'issue_date') if with_dates else qs

    def payments(self, qs=None):
        qs = Payment.objects.filter(status=PaymentStatus.COMPLETED) if qs is None else qs
        if self.customer:
            qs = qs.filter(customer_id=self.customer)
        if self.payment_method:
            qs = qs.filter(payment_method=self.payment_method)
        return self._range(qs, 'payment_date')

    def subscriptions(self, qs=None, with_status=True):
        qs = Subscription.objects.all() if qs is None else qs
        if self.customer:
            qs = qs.filter(customer_id=self.customer)
        if with_status and self.subscription_status:
            qs = qs.filter(status=self.subscription_status)
        return qs


def _bad_filters(f):
    return Response({'error': ' '.join(f.errors)}, status=status.HTTP_400_BAD_REQUEST)


def total_mrr(subscriptions_qs):
    """Normalised MRR of the ACTIVE subscriptions in the queryset, using two aggregate queries (no per-row loop)."""
    active = subscriptions_qs.filter(status=SubscriptionStatus.ACTIVE)
    mrr = ZERO
    for row in active.values('plan__billing_interval').annotate(total=Sum('plan__price')):
        mrr += (row['total'] or ZERO) * MRR_FACTORS.get(row['plan__billing_interval'], Decimal('1'))
    line_amount = ExpressionWrapper(F('quantity') * F('unit_price'), output_field=DecimalField(max_digits=14, decimal_places=2))
    items = SubscriptionItem.objects.filter(subscription__in=active.values('pk'))
    for row in items.values('subscription__plan__billing_interval').annotate(total=Sum(line_amount)):
        mrr += (row['total'] or ZERO) * MRR_FACTORS.get(row['subscription__plan__billing_interval'], Decimal('1'))
    return mrr.quantize(Decimal('0.01'))


class DashboardMetricsView(views.APIView):
    """
    Database-driven financial and operational metrics.

    Optional filters: date_from, date_to (invoice issue date / payment date), subscription_status,
    invoice_status, customer (id), payment_method.
    - revenue_received  = completed (non-reversed) payments in range. It is cash, never invoice value.
    - invoiced_total    = value of confirmed invoices in range.
    - outstanding_balance = balance still owed on open invoices.
    """
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        f = ReportFilters(request.query_params)
        if f.errors:
            return _bad_filters(f)
        today = datetime.date.today()
        first_of_month = today.replace(day=1)
        next_week = today + datetime.timedelta(days=7)

        # Customers and subscriptions
        total_customers = Customer.objects.filter(status=CustomerStatus.ACTIVE).count()
        subs_all = f.subscriptions(with_status=False)
        sub_counts = {r['status']: r['n'] for r in subs_all.values('status').annotate(n=Count('id'))}
        active_subscriptions_count = sub_counts.get(SubscriptionStatus.ACTIVE, 0)
        mrr = total_mrr(subs_all)
        upcoming_renewals_count = subs_all.filter(
            status=SubscriptionStatus.ACTIVE, next_billing_date__gte=today, next_billing_date__lte=next_week
        ).count()
        filtered_subs = f.subscriptions()

        # Invoices
        invoices = f.invoices()
        invoiced_total = invoices.filter(status__in=BILLED_STATUSES).aggregate(t=Sum('total_amount'))['t'] or ZERO
        total_invoices = invoices.count()
        open_invoices = f.invoices(with_status=False).filter(status__in=OPEN_STATUSES)
        outstanding_balance = open_invoices.aggregate(t=Sum('balance_due'))['t'] or ZERO
        overdue_qs = f.invoices(with_status=False).filter(due_date__lt=today, status__in=OPEN_STATUSES, balance_due__gt=0)
        overdue_agg = overdue_qs.aggregate(n=Count('id'), amount=Sum('balance_due'))

        # Payments (cash actually received)
        payments = f.payments()
        revenue_received = payments.aggregate(t=Sum('amount'))['t'] or ZERO
        revenue_this_month = Payment.objects.filter(
            status=PaymentStatus.COMPLETED, payment_date__gte=first_of_month, payment_date__lte=today,
            **({'customer_id': f.customer} if f.customer else {}), **({'payment_method': f.payment_method} if f.payment_method else {}),
        ).aggregate(t=Sum('amount'))['t'] or ZERO

        # 6-month trend (two grouped queries instead of twelve)
        trend_start = today.replace(day=1) - relativedelta(months=5)
        billed_by_month = {
            r['m']: r['t'] for r in Invoice.objects.filter(
                issue_date__gte=trend_start, status__in=BILLED_STATUSES,
                **({'customer_id': f.customer} if f.customer else {}),
            ).annotate(m=TruncMonth('issue_date')).values('m').annotate(t=Sum('total_amount'))
        }
        collected_by_month = {
            r['m']: r['t'] for r in Payment.objects.filter(
                status=PaymentStatus.COMPLETED, payment_date__gte=trend_start,
                **({'customer_id': f.customer} if f.customer else {}), **({'payment_method': f.payment_method} if f.payment_method else {}),
            ).annotate(m=TruncMonth('payment_date')).values('m').annotate(t=Sum('amount'))
        }
        revenue_trend = []
        for i in range(5, -1, -1):
            m_start = today.replace(day=1) - relativedelta(months=i)
            revenue_trend.append({
                'month': m_start.strftime("%b %Y"),
                'billed': float(billed_by_month.get(m_start) or 0),
                'collected': float(collected_by_month.get(m_start) or 0),
            })

        payment_summary = [
            {'method': r['payment_method'], 'total_amount': float(r['t'] or 0), 'count': r['n']}
            for r in payments.values('payment_method').annotate(t=Sum('amount'), n=Count('id')).order_by('-t')
        ]
        invoice_status_summary = [
            {'status': r['status'], 'count': r['n'], 'total': float(r['t'] or 0)}
            for r in f.invoices(with_status=False).values('status').annotate(n=Count('id'), t=Sum('total_amount'))
        ]

        recent_subscriptions = list(filtered_subs.select_related('customer', 'plan').order_by('-created_at')[:5].values(
            'id', 'subscription_number', 'customer__name', 'plan__name', 'status', 'created_at'
        ))
        recent_invoices = list(invoices.select_related('customer').order_by('-created_at')[:5].values(
            'id', 'invoice_number', 'customer__name', 'total_amount', 'balance_due', 'status', 'issue_date'
        ))
        recent_payments = list(payments.select_related('customer', 'invoice').order_by('-created_at')[:5].values(
            'id', 'payment_number', 'customer__name', 'invoice__invoice_number', 'amount', 'payment_method', 'payment_date'
        ))
        overdue_invoices = list(overdue_qs.select_related('customer').order_by('due_date')[:5].values(
            'id', 'invoice_number', 'customer__name', 'total_amount', 'balance_due', 'due_date'
        ))

        labels = [('Active', SubscriptionStatus.ACTIVE), ('Paused', SubscriptionStatus.PAUSED), ('Draft', SubscriptionStatus.DRAFT),
                  ('Quotation', SubscriptionStatus.QUOTATION), ('Confirmed', SubscriptionStatus.CONFIRMED), ('Closed', SubscriptionStatus.CLOSED)]
        return Response({
            'filters': {
                'date_from': f.date_from, 'date_to': f.date_to, 'subscription_status': f.subscription_status,
                'invoice_status': f.invoice_status, 'customer': f.customer, 'payment_method': f.payment_method,
            },
            'metrics': {
                'total_customers': total_customers,
                'active_subscriptions': active_subscriptions_count,
                'total_subscriptions': sum(sub_counts.values()),
                'filtered_subscriptions': filtered_subs.count(),
                'mrr': float(mrr),
                'arr': float(mrr * 12),
                'revenue_received': float(revenue_received),
                'revenue_this_month': float(revenue_this_month),
                'invoiced_total': float(invoiced_total),
                'total_invoices': total_invoices,
                'outstanding_balance': float(outstanding_balance),
                'overdue_count': overdue_agg['n'] or 0,
                'overdue_amount': float(overdue_agg['amount'] or 0),
                'upcoming_renewals_count': upcoming_renewals_count,
            },
            'revenue_trend': revenue_trend,
            'subscription_distribution': [{'name': n, 'count': sub_counts.get(s, 0)} for n, s in labels],
            'invoice_status_summary': invoice_status_summary,
            'payment_summary': payment_summary,
            'recent_subscriptions': recent_subscriptions,
            'recent_invoices': recent_invoices,
            'recent_payments': recent_payments,
            'overdue_invoices': overdue_invoices,
        })


class RevenueByProductReportView(views.APIView):
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        f = ReportFilters(request.query_params)
        if f.errors:
            return _bad_filters(f)
        invoices = f.invoices(with_status=False).filter(status__in=BILLED_STATUSES)
        items = InvoiceItem.objects.filter(invoice__in=invoices.values('pk')).values('product_name').annotate(
            total_revenue=Sum('line_total'), total_quantity=Sum('quantity')
        ).order_by('-total_revenue')
        return Response([
            {'product_name': i['product_name'], 'total_revenue': float(i['total_revenue'] or 0), 'total_quantity': i['total_quantity'] or 0}
            for i in items
        ])


class RevenueByPlanReportView(views.APIView):
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        f = ReportFilters(request.query_params)
        if f.errors:
            return _bad_filters(f)
        plans = Plan.objects.annotate(
            active_count=Count('subscriptions', filter=Q(subscriptions__status=SubscriptionStatus.ACTIVE,
                                                         **({'subscriptions__customer_id': f.customer} if f.customer else {})))
        ).values('id', 'name', 'billing_interval', 'price', 'active_count')
        data = []
        for p in plans:
            mult = MRR_FACTORS.get(p['billing_interval'], Decimal('1'))
            data.append({
                'plan_name': p['name'], 'billing_interval': p['billing_interval'], 'price': float(p['price']),
                'active_subscribers': p['active_count'],
                'estimated_mrr': float((p['price'] * mult * p['active_count']).quantize(Decimal('0.01'))),
            })
        return Response(data)


class PaymentMethodDistributionView(views.APIView):
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        f = ReportFilters(request.query_params)
        if f.errors:
            return _bad_filters(f)
        records = f.payments().values('payment_method').annotate(total_amount=Sum('amount'), total_count=Count('id')).order_by('-total_amount')
        return Response([
            {'method': r['payment_method'], 'total_amount': float(r['total_amount'] or 0), 'count': r['total_count']}
            for r in records
        ])


class ExportReportCSVView(views.APIView):
    """CSV export of subscriptions, invoices or payments, honouring the same filters as the dashboard."""
    permission_classes = [IsStaffOrAdmin]

    @staticmethod
    def _safe(value):
        text = '' if value is None else str(value)
        return "'" + text if text[:1] in ('=', '+', '-', '@') else text  # neutralise spreadsheet formula injection

    def get(self, request):
        f = ReportFilters(request.query_params)
        if f.errors:
            return _bad_filters(f)
        report_type = request.query_params.get('type', 'invoices')
        response = HttpResponse(content_type='text/csv')
        writer = csv.writer(response)

        if report_type == 'subscriptions':
            response['Content-Disposition'] = 'attachment; filename="brightloop_subscriptions.csv"'
            writer.writerow(['Subscription Number', 'Customer', 'Plan', 'Status', 'Start Date', 'Expiry Date', 'Next Billing Date', 'Plan Price'])
            for s in f.subscriptions().select_related('customer', 'plan').iterator(chunk_size=500):
                writer.writerow([s.subscription_number, self._safe(s.customer.name), self._safe(s.plan.name), s.status,
                                 s.start_date, s.expiry_date or '', s.next_billing_date, s.plan.price])
        elif report_type == 'payments':
            response['Content-Disposition'] = 'attachment; filename="brightloop_payments.csv"'
            writer.writerow(['Payment Ref', 'Invoice', 'Customer', 'Amount', 'Method', 'Date', 'Transaction Ref', 'Status'])
            qs = f.payments(Payment.objects.all()).select_related('customer', 'invoice')
            for p in qs.iterator(chunk_size=500):
                writer.writerow([p.payment_number, p.invoice.invoice_number, self._safe(p.customer.name), p.amount,
                                 p.payment_method, p.payment_date, self._safe(p.transaction_reference), p.status])
        else:
            response['Content-Disposition'] = 'attachment; filename="brightloop_invoices.csv"'
            writer.writerow(['Invoice Number', 'Customer', 'Status', 'Issue Date', 'Due Date', 'Subtotal', 'Discount', 'Tax', 'Total', 'Paid', 'Balance Due'])
            for inv in f.invoices().select_related('customer').iterator(chunk_size=500):
                writer.writerow([inv.invoice_number, self._safe(inv.customer.name), inv.status, inv.issue_date, inv.due_date,
                                 inv.subtotal, inv.discount_amount, inv.tax_amount, inv.total_amount, inv.paid_amount, inv.balance_due])
        return response
