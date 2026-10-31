import datetime
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import Role
from apps.customers.models import Customer
from apps.plans.models import Plan, BillingInterval
from apps.subscriptions.models import Subscription, SubscriptionStatus
from apps.invoices.models import Invoice, InvoiceStatus
from apps.payments.models import Payment, PaymentMethod
from apps.reports.views import calculate_mrr_sql, sanitize_csv_cell

User = get_user_model()


class ReportingDrillDownTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin = User.objects.create_user(
            email='admin@reports.com',
            password='AdminPassword123!',
            role=Role.ADMIN,
            is_staff=True,
            is_superuser=True
        )

        # Customer
        self.customer = Customer.objects.create(
            name='Test Corp',
            email='billing@testcorp.com',
            company='Test Corp Ltd'
        )

        # Plans
        self.daily_plan = Plan.objects.create(
            name='Daily Tier',
            code='DAILY-1',
            price=Decimal('1.00'),
            billing_interval=BillingInterval.DAILY
        )
        self.weekly_plan = Plan.objects.create(
            name='Weekly Tier',
            code='WEEKLY-10',
            price=Decimal('10.00'),
            billing_interval=BillingInterval.WEEKLY
        )
        self.monthly_plan = Plan.objects.create(
            name='Monthly Tier',
            code='MONTHLY-100',
            price=Decimal('100.00'),
            billing_interval=BillingInterval.MONTHLY
        )
        self.yearly_plan = Plan.objects.create(
            name='Yearly Tier',
            code='YEARLY-1200',
            price=Decimal('1200.00'),
            billing_interval=BillingInterval.YEARLY
        )

    def test_mrr_calculation_with_known_dataset(self):
        """
        Known dataset:
        1 daily ($1/day = $30/mo)
        1 weekly ($10/wk = $43.33/mo, x52/12)
        1 monthly ($100/mo)
        1 yearly ($1200/yr = $100/mo)
        Total MRR = 30 + 43.333 + 100 + 100 = 273.33
        """
        Subscription.objects.create(
            customer=self.customer,
            plan=self.daily_plan,
            status=SubscriptionStatus.ACTIVE,
            start_date=datetime.date.today(),
            next_billing_date=datetime.date.today()
        )
        Subscription.objects.create(
            customer=self.customer,
            plan=self.weekly_plan,
            status=SubscriptionStatus.ACTIVE,
            start_date=datetime.date.today(),
            next_billing_date=datetime.date.today()
        )
        Subscription.objects.create(
            customer=self.customer,
            plan=self.monthly_plan,
            status=SubscriptionStatus.ACTIVE,
            start_date=datetime.date.today(),
            next_billing_date=datetime.date.today()
        )
        Subscription.objects.create(
            customer=self.customer,
            plan=self.yearly_plan,
            status=SubscriptionStatus.ACTIVE,
            start_date=datetime.date.today(),
            next_billing_date=datetime.date.today()
        )

        calculated_mrr = calculate_mrr_sql()
        self.assertEqual(calculated_mrr, Decimal('273.33'))

        # Also verify via the dashboard endpoint
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/reports/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['metrics']['mrr'], '273.33')
        # ARR = MRR * 12 = 3279.96
        self.assertEqual(res.data['metrics']['arr'], '3279.96')

    def test_paused_and_closed_subscriptions_do_not_contribute_to_mrr(self):
        # Active subscription: $100/mo
        Subscription.objects.create(
            customer=self.customer,
            plan=self.monthly_plan,
            status=SubscriptionStatus.ACTIVE,
            start_date=datetime.date.today(),
            next_billing_date=datetime.date.today()
        )
        # Paused subscription: $100/mo (should contribute 0)
        Subscription.objects.create(
            customer=self.customer,
            plan=self.monthly_plan,
            status=SubscriptionStatus.PAUSED,
            start_date=datetime.date.today(),
            next_billing_date=datetime.date.today()
        )
        # Closed subscription: $1200/yr (should contribute 0)
        Subscription.objects.create(
            customer=self.customer,
            plan=self.yearly_plan,
            status=SubscriptionStatus.CLOSED,
            start_date=datetime.date.today(),
            next_billing_date=datetime.date.today()
        )
        # Draft subscription: (should contribute 0)
        Subscription.objects.create(
            customer=self.customer,
            plan=self.daily_plan,
            status=SubscriptionStatus.DRAFT,
            start_date=datetime.date.today(),
            next_billing_date=datetime.date.today()
        )

        calculated_mrr = calculate_mrr_sql()
        self.assertEqual(calculated_mrr, Decimal('100.00'))

    def test_overdue_invoices_aggregation(self):
        today = datetime.date.today()
        yesterday = today - datetime.timedelta(days=1)
        tomorrow = today + datetime.timedelta(days=1)

        # 1. Status explicitly OVERDUE ($200 balance)
        Invoice.objects.create(
            customer=self.customer,
            issue_date=yesterday,
            due_date=yesterday,
            total_amount=Decimal('200.00'),
            paid_amount=Decimal('0.00'),
            balance_due=Decimal('200.00'),
            status=InvoiceStatus.OVERDUE
        )

        # 2. Status CONFIRMED, due_date < today, balance > 0 ($150 balance)
        Invoice.objects.create(
            customer=self.customer,
            issue_date=yesterday,
            due_date=yesterday,
            total_amount=Decimal('200.00'),
            paid_amount=Decimal('50.00'),
            balance_due=Decimal('150.00'),
            status=InvoiceStatus.CONFIRMED
        )

        # 3. Not overdue: due tomorrow ($300)
        Invoice.objects.create(
            customer=self.customer,
            issue_date=today,
            due_date=tomorrow,
            total_amount=Decimal('300.00'),
            paid_amount=Decimal('0.00'),
            balance_due=Decimal('300.00'),
            status=InvoiceStatus.CONFIRMED
        )

        # 4. Paid invoice in past (balance = 0)
        Invoice.objects.create(
            customer=self.customer,
            issue_date=yesterday,
            due_date=yesterday,
            total_amount=Decimal('500.00'),
            paid_amount=Decimal('500.00'),
            balance_due=Decimal('0.00'),
            status=InvoiceStatus.PAID
        )

        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/reports/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Overdue count should be 2, overdue amount = 200 + 150 = 350.00
        self.assertEqual(res.data['metrics']['overdue_count'], 2)
        self.assertEqual(res.data['metrics']['overdue_amount'], '350.00')

    def test_drilldown_endpoint_records(self):
        self.client.force_authenticate(user=self.admin)

        sub = Subscription.objects.create(
            customer=self.customer,
            plan=self.monthly_plan,
            status=SubscriptionStatus.ACTIVE,
            start_date=datetime.date.today(),
            next_billing_date=datetime.date.today()
        )

        # Drilldown for MRR
        res = self.client.get('/api/v1/reports/drilldown/?metric=mrr')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['reference'], sub.subscription_number)
        self.assertEqual(res.data['results'][0]['amount'], '100.00')

    def test_csv_export_and_formula_sanitization(self):
        self.client.force_authenticate(user=self.admin)

        # Test formula sanitizer helper directly
        self.assertEqual(sanitize_csv_cell('=1+1'), "'=1+1")
        self.assertEqual(sanitize_csv_cell('+cmd|calc'), "'+cmd|calc")
        self.assertEqual(sanitize_csv_cell('-100'), "'-100")
        self.assertEqual(sanitize_csv_cell('@SUM(A1)'), "'@SUM(A1)")
        self.assertEqual(sanitize_csv_cell('Regular Text'), 'Regular Text')

        # Test CSV export endpoint
        res = self.client.get('/api/v1/reports/export/?type=invoices')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res['Content-Type'], 'text/csv')
        self.assertIn('attachment; filename="brightloop_invoices.csv"', res['Content-Disposition'])
        content = res.content.decode('utf-8')
        self.assertIn('Invoice Number,Customer,Status', content)


    def test_payment_method_distribution(self):
        """The Reports page loads this alongside the other reports; it must exist for staff."""
        invoice = Invoice.objects.create(customer=self.customer, due_date=datetime.date.today())
        for amount, method in [('60.00', PaymentMethod.CARD), ('40.00', PaymentMethod.CARD), ('25.50', PaymentMethod.CASH)]:
            Payment.objects.create(invoice=invoice, customer=self.customer, amount=Decimal(amount), payment_method=method)

        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/reports/payment-methods/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data[0], {'method': PaymentMethod.CARD, 'total_amount': '100.00', 'count': 2})
        self.assertEqual(res.data[1]['total_amount'], '25.50')
