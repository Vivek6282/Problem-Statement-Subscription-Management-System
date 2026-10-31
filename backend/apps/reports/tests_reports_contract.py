"""Metric contract: overdue rule, and cards reconcile with their drill-downs."""
import datetime
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.customers.models import Customer
from apps.invoices.models import Invoice, InvoiceStatus
from apps.payments.models import Payment
from apps.reports.business_time import business_today
from apps.reports.views import get_overdue_invoices_queryset


class MetricContractTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(email='contract@brightloop.io', password='AdminPassword@2026')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)
        self.customer = Customer.objects.create(name='Contract Co', email='contract@example.com')
        self.today = business_today()

    def invoice(self, status, due_offset, total='100.00', paid='0.00', issue_offset=-10):
        total, paid = Decimal(total), Decimal(paid)
        return Invoice.objects.create(
            customer=self.customer, status=status,
            issue_date=self.today + datetime.timedelta(days=issue_offset),
            due_date=self.today + datetime.timedelta(days=due_offset),
            total_amount=total, paid_amount=paid, balance_due=max(Decimal('0.00'), total - paid),
        )

    def test_paid_and_cancelled_and_draft_are_never_overdue(self):
        self.invoice(InvoiceStatus.PAID, -5, paid='100.00')
        self.invoice(InvoiceStatus.CANCELLED, -5)
        self.invoice(InvoiceStatus.DRAFT, -5)
        self.assertEqual(get_overdue_invoices_queryset().count(), 0)

    def test_partly_paid_past_due_shows_remaining_balance(self):
        inv = self.invoice(InvoiceStatus.PARTIALLY_PAID, -3, total='100.00', paid='40.00')
        self.assertEqual(list(get_overdue_invoices_queryset()), [inv])
        metrics = self.client.get('/api/v1/reports/dashboard/').data['metrics']
        self.assertEqual(metrics['overdue_count'], 1)
        self.assertEqual(metrics['overdue_amount'], '60.00')

    def test_stored_overdue_status_with_future_due_date_is_not_overdue(self):
        self.invoice(InvoiceStatus.OVERDUE, 1)
        self.assertEqual(get_overdue_invoices_queryset().count(), 0)
        # ...but it is still outstanding.
        metrics = self.client.get('/api/v1/reports/dashboard/').data['metrics']
        self.assertEqual(metrics['overdue_count'], 0)
        self.assertEqual(metrics['outstanding_count'], 1)

    def test_invoice_due_today_is_not_overdue_but_yesterday_is(self):
        self.invoice(InvoiceStatus.CONFIRMED, 0)
        self.assertEqual(get_overdue_invoices_queryset().count(), 0)
        self.invoice(InvoiceStatus.CONFIRMED, -1)
        self.assertEqual(get_overdue_invoices_queryset().count(), 1)

    def test_due_soon_is_separate_from_overdue(self):
        self.invoice(InvoiceStatus.CONFIRMED, 10, total='70.00')
        self.invoice(InvoiceStatus.CONFIRMED, -2, total='30.00')
        metrics = self.client.get('/api/v1/reports/dashboard/').data['metrics']
        self.assertEqual(metrics['due_next_month'], '70.00')
        self.assertEqual(metrics['overdue_amount'], '30.00')
        self.assertEqual(metrics['outstanding_balance'], '100.00')

    def _seed_mixed(self):
        self.invoice(InvoiceStatus.CONFIRMED, -20, total='100.00', issue_offset=-40)
        self.invoice(InvoiceStatus.PARTIALLY_PAID, -1, total='80.00', paid='30.00', issue_offset=-25)
        self.invoice(InvoiceStatus.CONFIRMED, 15, total='50.00', issue_offset=-2)
        self.invoice(InvoiceStatus.OVERDUE, 2, total='25.00', issue_offset=-1)
        paid = self.invoice(InvoiceStatus.PAID, 5, total='60.00', paid='60.00', issue_offset=0)
        Payment.objects.create(customer=self.customer, invoice=paid, amount=Decimal('60.00'), payment_date=self.today)
        Payment.objects.create(customer=self.customer, invoice=paid, amount=Decimal('15.00'),
                               payment_date=self.today - datetime.timedelta(days=45))

    def drill(self, metric, **params):
        qs = '&'.join([f'metric={metric}'] + [f'{k}={v}' for k, v in params.items()])
        res = self.client.get(f'/api/v1/reports/drilldown/?{qs}')
        self.assertEqual(res.status_code, 200, res.content)
        return res.data

    def test_cards_equal_drilldowns_without_filters(self):
        self._seed_mixed()
        m = self.client.get('/api/v1/reports/dashboard/').data['metrics']
        overdue = self.drill('overdue_invoices')
        self.assertEqual((m['overdue_count'], m['overdue_amount']), (overdue['count'], overdue['total']))
        outstanding = self.drill('outstanding')
        self.assertEqual((m['outstanding_count'], m['outstanding_balance']), (outstanding['count'], outstanding['total']))
        received = self.drill('revenue_collected')
        self.assertEqual((m['revenue_collected_count'], m['revenue_collected']), (received['count'], received['total']))

    def test_cards_equal_drilldowns_with_month_filters(self):
        self._seed_mixed()
        m = self.client.get('/api/v1/reports/dashboard/').data['metrics']
        start = self.today.replace(day=1).isoformat()
        end = self.today.isoformat()
        received = self.drill('revenue_collected', start_date=start, end_date=end)
        self.assertEqual((m['revenue_this_month_count'], m['revenue_this_month']), (received['count'], received['total']))
        billed = self.drill('billed', start_date=start, end_date=end)
        self.assertEqual((m['billed_this_month_count'], m['billed_this_month']), (billed['count'], billed['total']))

    def test_overdue_drilldown_with_wide_date_range_matches_card(self):
        self._seed_mixed()
        m = self.client.get('/api/v1/reports/dashboard/').data['metrics']
        wide = self.drill('overdue_invoices', start_date='2000-01-01', end_date='2999-12-31')
        self.assertEqual((m['overdue_count'], m['overdue_amount']), (wide['count'], wide['total']))
        narrow = self.drill('overdue_invoices', start_date=(self.today - datetime.timedelta(days=5)).isoformat())
        self.assertEqual(narrow['count'], 1)
        self.assertEqual(narrow['total'], '50.00')

    def test_invalid_filter_is_rejected_not_a_server_error(self):
        res = self.client.get('/api/v1/reports/drilldown/?metric=billed&start_date=not-a-date')
        self.assertEqual(res.status_code, 400)

    def test_report_responses_carry_currency_and_timestamps(self):
        dash = self.client.get('/api/v1/reports/dashboard/').data
        for key in ('currency_code', 'generated_at', 'as_of_date'):
            self.assertIn(key, dash)
        self.assertTrue(dash['metrics']['churn_provisional'])
        self.assertTrue(dash['generated_at'].endswith('Z'))
        for url in ('mrr-breakdown', 'revenue-trends'):
            data = self.client.get(f'/api/v1/reports/{url}/').data
            self.assertIsInstance(data['results'], list)
            for key in ('currency_code', 'generated_at', 'as_of_date'):
                self.assertIn(key, data)
