import csv
import datetime
from decimal import Decimal
from dateutil.relativedelta import relativedelta
from django.http import HttpResponse
from django.db.models import Sum, Count, Q
from rest_framework import views, permissions, status
from rest_framework.response import Response

from apps.accounts.permissions import IsStaffOrAdmin
from apps.customers.models import Customer, CustomerStatus
from apps.subscriptions.models import Subscription, SubscriptionStatus
from apps.invoices.models import Invoice, InvoiceStatus, InvoiceItem
from apps.payments.models import Payment, PaymentMethod
from apps.plans.models import Plan

class DashboardMetricsView(views.APIView):
    """
    Computes real-time, database-driven financial and operational metrics.
    MRR and ARR are based strictly on normalized recurring subscriptions charges.
    """
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        today = datetime.date.today()
        first_of_month = today.replace(day=1)
        next_week = today + datetime.timedelta(days=7)

        # 1. Total Customers
        total_customers = Customer.objects.filter(status=CustomerStatus.ACTIVE).count()

        # 2. Active Subscriptions & MRR / ARR
        active_subs = Subscription.objects.filter(status=SubscriptionStatus.ACTIVE).select_related('plan').prefetch_related('items')
        active_subscriptions_count = active_subs.count()

        total_mrr = Decimal('0.00')
        for sub in active_subs:
            total_mrr += sub.normalized_mrr
        total_arr = total_mrr * Decimal('12.00')

        # 3. Cash collected this month
        month_payments = Payment.objects.filter(payment_date__gte=first_of_month, payment_date__lte=today)
        revenue_this_month = month_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # 4. Invoices & Balances
        open_invoices = Invoice.objects.filter(status__in=[InvoiceStatus.CONFIRMED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE])
        outstanding_balance = open_invoices.aggregate(total=Sum('balance_due'))['total'] or Decimal('0.00')
        overdue_invoices_qs = Invoice.objects.filter(
            Q(status=InvoiceStatus.OVERDUE) |
            Q(due_date__lt=today, status__in=[InvoiceStatus.CONFIRMED, InvoiceStatus.PARTIALLY_PAID], balance_due__gt=0)
        )
        overdue_count = overdue_invoices_qs.count()

        # 5. Upcoming renewals (next 7 days)
        upcoming_renewals_count = Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            next_billing_date__gte=today,
            next_billing_date__lte=next_week
        ).count()

        # 6. Monthly trend (past 6 months)
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

        # 7. Subscription status distribution
        status_counts = Subscription.objects.values('status').annotate(count=Count('id'))
        sub_dist = {item['status']: item['count'] for item in status_counts}

        # 8. Recents
        recent_subscriptions = list(Subscription.objects.select_related('customer', 'plan').order_by('-created_at')[:5].values(
            'id', 'subscription_number', 'customer__name', 'plan__name', 'status', 'created_at'
        ))
        recent_invoices = list(Invoice.objects.select_related('customer').order_by('-created_at')[:5].values(
            'id', 'invoice_number', 'customer__name', 'total_amount', 'balance_due', 'status', 'issue_date'
        ))
        recent_payments = list(Payment.objects.select_related('customer', 'invoice').order_by('-created_at')[:5].values(
            'id', 'payment_number', 'customer__name', 'invoice__invoice_number', 'amount', 'payment_method', 'payment_date'
        ))
        overdue_invoices = list(overdue_invoices_qs.select_related('customer').order_by('due_date')[:5].values(
            'id', 'invoice_number', 'customer__name', 'total_amount', 'balance_due', 'due_date'
        ))

        return Response({
            'metrics': {
                'total_customers': total_customers,
                'active_subscriptions': active_subscriptions_count,
                'mrr': float(total_mrr),
                'arr': float(total_arr),
                'revenue_this_month': float(revenue_this_month),
                'outstanding_balance': float(outstanding_balance),
                'overdue_count': overdue_count,
                'upcoming_renewals_count': upcoming_renewals_count
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

class RevenueByProductReportView(views.APIView):
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        items = InvoiceItem.objects.filter(
            invoice__status__in=[InvoiceStatus.CONFIRMED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID, InvoiceStatus.OVERDUE]
        ).values('product_name').annotate(
            total_revenue=Sum('line_total'),
            total_quantity=Sum('quantity')
        ).order_by('-total_revenue')

        data = [
            {
                'product_name': item['product_name'],
                'total_revenue': float(item['total_revenue'] or 0),
                'total_quantity': item['total_quantity'] or 0
            }
            for item in items
        ]
        return Response(data)

class RevenueByPlanReportView(views.APIView):
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        plans = Plan.objects.annotate(
            active_count=Count('subscriptions', filter=Q(subscriptions__status=SubscriptionStatus.ACTIVE))
        ).values('id', 'name', 'billing_interval', 'price', 'active_count')

        data = []
        for p in plans:
            mrr_multiplier = Decimal('1.00')
            if p['billing_interval'] == 'DAILY':
                mrr_multiplier = Decimal('30.00')
            elif p['billing_interval'] == 'WEEKLY':
                mrr_multiplier = (Decimal('52.00') / Decimal('12.00'))
            elif p['billing_interval'] == 'YEARLY':
                mrr_multiplier = (Decimal('1.00') / Decimal('12.00'))

            plan_mrr = (p['price'] * mrr_multiplier * p['active_count']).quantize(Decimal('0.01'))
            data.append({
                'plan_name': p['name'],
                'billing_interval': p['billing_interval'],
                'price': float(p['price']),
                'active_subscribers': p['active_count'],
                'estimated_mrr': float(plan_mrr)
            })
        return Response(data)

class PaymentMethodDistributionView(views.APIView):
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        records = Payment.objects.values('payment_method').annotate(
            total_amount=Sum('amount'),
            total_count=Count('id')
        ).order_by('-total_amount')

        data = [
            {
                'method': rec['payment_method'],
                'total_amount': float(rec['total_amount'] or 0),
                'count': rec['total_count']
            }
            for rec in records
        ]
        return Response(data)

class ExportReportCSVView(views.APIView):
    """
    Exports clean CSV reports for subscriptions, invoices, or payments.
    """
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        report_type = request.query_params.get('type', 'invoices')
        response = HttpResponse(content_type='text/csv')

        if report_type == 'subscriptions':
            response['Content-Disposition'] = 'attachment; filename="brightloop_subscriptions.csv"'
            writer = csv.writer(response)
            writer.writerow(['Subscription Number', 'Customer', 'Plan', 'Status', 'Start Date', 'Expiry Date', 'Next Billing Date', 'MRR'])
            for s in Subscription.objects.select_related('customer', 'plan').all():
                writer.writerow([
                    s.subscription_number,
                    s.customer.name,
                    s.plan.name,
                    s.status,
                    s.start_date,
                    s.expiry_date or '',
                    s.next_billing_date,
                    f"${s.normalized_mrr:,.2f}"
                ])
        elif report_type == 'payments':
            response['Content-Disposition'] = 'attachment; filename="brightloop_payments.csv"'
            writer = csv.writer(response)
            writer.writerow(['Payment Ref', 'Invoice', 'Customer', 'Amount', 'Method', 'Date', 'Transaction Ref'])
            for p in Payment.objects.select_related('customer', 'invoice').all():
                writer.writerow([
                    p.payment_number,
                    p.invoice.invoice_number,
                    p.customer.name,
                    f"${p.amount:,.2f}",
                    p.payment_method,
                    p.payment_date,
                    p.transaction_reference
                ])
        else: # Default invoices
            response['Content-Disposition'] = 'attachment; filename="brightloop_invoices.csv"'
            writer = csv.writer(response)
            writer.writerow(['Invoice Number', 'Customer', 'Status', 'Issue Date', 'Due Date', 'Total', 'Paid', 'Balance Due'])
            for inv in Invoice.objects.select_related('customer').all():
                writer.writerow([
                    inv.invoice_number,
                    inv.customer.name,
                    inv.status,
                    inv.issue_date,
                    inv.due_date,
                    f"${inv.total_amount:,.2f}",
                    f"${inv.paid_amount:,.2f}",
                    f"${inv.balance_due:,.2f}"
                ])

        return response

