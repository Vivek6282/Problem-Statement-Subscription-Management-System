import datetime
from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from apps.accounts.models import User, Role
from apps.customers.models import Customer
from apps.products.models import Product, ProductVariant
from apps.plans.models import Plan, BillingInterval
from apps.quotations.models import Quotation, QuotationItem
from apps.subscriptions.models import Subscription, SubscriptionItem, SubscriptionStatus
from apps.invoices.models import Invoice, InvoiceStatus
from apps.payments.models import Payment, PaymentMethod
from apps.payments.services import PaymentService

class EndToEndFlowTestCase(TestCase):
    """
    Complete end-to-end flow test:
    Customer -> Product -> Plan -> Quotation -> Subscription -> Invoice -> Payment -> Dashboard
    """
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email='admin@brightloop.io',
            password='AdminPassword@2026'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_complete_end_to_end_lifecycle(self):
        # 1. Customer Creation
        res_cust = self.client.post('/api/v1/customers/', {
            'name': 'Bruce Wayne',
            'company': 'Wayne Enterprises',
            'email': 'bruce@wayne.com',
            'phone': '+1 (555) 777-8888',
            'address_line1': '1007 Mountain Drive',
            'city': 'Gotham',
            'country': 'United States'
        })
        self.assertEqual(res_cust.status_code, 201)
        cust_id = res_cust.data['id']

        # 2. Product & Variant Creation
        res_prod = self.client.post('/api/v1/products/', {
            'sku': 'PROD-CYBER-CORE',
            'name': 'Cyber Shield Cloud',
            'product_type': 'SOFTWARE',
            'sales_price': '2000.00',
            'cost_price': '400.00'
        })
        self.assertEqual(res_prod.status_code, 201)
        prod_id = res_prod.data['id']

        res_var = self.client.post('/api/v1/products/variants/', {
            'product': prod_id,
            'name': 'AI Integration Pack',
            'sku_suffix': 'AI',
            'price_adjustment': '560.00'
        })
        self.assertEqual(res_var.status_code, 201)
        var_id = res_var.data['id']

        # 3. Plan Creation
        res_plan = self.client.post('/api/v1/plans/', {
            'name': 'Enterprise Monthly Tier',
            'code': 'enterprise-monthly-tier',
            'price': '1000.00',
            'billing_interval': 'MONTHLY',
            'allow_pause': True,
            'allow_renewal': True
        })
        self.assertEqual(res_plan.status_code, 201)
        plan_id = res_plan.data['id']

        # 4. Quotation Creation & Conversion
        res_quote = self.client.post('/api/v1/quotations/', {
            'customer': cust_id,
            'plan': plan_id,
            'validity_days': 30,
            'items': [
                {
                    'product': prod_id,
                    'variant': var_id,
                    'quantity': 1,
                    'unit_price': '2560.00',
                    'discount_amount': '0.00',
                    'tax_percentage': '0.00'
                }
            ]
        }, format='json')
        self.assertEqual(res_quote.status_code, 201)
        quote_id = res_quote.data['id']

        # Convert quotation into subscription
        res_conv = self.client.post(f'/api/v1/quotations/{quote_id}/convert_to_subscription/')
        self.assertEqual(res_conv.status_code, 200)
        sub_id = res_conv.data['subscription_id']

        # 5. Subscription verification
        sub = Subscription.objects.get(id=sub_id)
        self.assertEqual(sub.status, SubscriptionStatus.ACTIVE)
        # Recurring Subtotal = Plan ($1000) + Item ($2560) = $3560
        self.assertEqual(sub.recurring_subtotal, Decimal('3560.00'))

        # 6. Trigger Recurring Billing to generate Invoice
        res_bill = self.client.post(f'/api/v1/subscriptions/{sub_id}/trigger_billing/')
        self.assertEqual(res_bill.status_code, 200)
        inv_id = res_bill.data['invoice_id']

        inv = Invoice.objects.get(id=inv_id)
        self.assertEqual(inv.total_amount, Decimal('3560.00'))
        self.assertEqual(inv.balance_due, Decimal('3560.00'))
        self.assertEqual(inv.status, InvoiceStatus.CONFIRMED)

        # 7. Record Payment
        res_pay = self.client.post('/api/v1/payments/', {
            'invoice': inv_id,
            'amount': '3560.00',
            'payment_method': 'BANK_TRANSFER',
            'transaction_reference': 'WIRE-WAYNE-9900'
        })
        self.assertEqual(res_pay.status_code, 201)

        inv.refresh_from_db()
        self.assertEqual(inv.balance_due, Decimal('0.00'))
        self.assertEqual(inv.status, InvoiceStatus.PAID)

        # 8. Dashboard metrics live reflection
        res_dash = self.client.get('/api/v1/reports/dashboard/')
        self.assertEqual(res_dash.status_code, 200)
        metrics = res_dash.data['metrics']
        self.assertGreaterEqual(metrics['total_customers'], 1)
        self.assertGreaterEqual(metrics['active_subscriptions'], 1)
        self.assertGreaterEqual(Decimal(str(metrics['mrr'])), Decimal('3560.00'))
        self.assertGreaterEqual(Decimal(str(metrics['revenue_this_month'])), Decimal('3560.00'))


class PublicSummaryPrivacyTestCase(TestCase):
    def test_anonymous_summary_exposes_only_health_status(self):
        customer = Customer.objects.create(name='Private Person', company='Secret Co', email='private@example.com')
        Invoice.objects.create(
            customer=customer, total_amount=Decimal('99.00'), balance_due=Decimal('99.00'),
            due_date=datetime.date.today(), status=InvoiceStatus.CONFIRMED,
        )
        res = APIClient().get('/api/v1/reports/public-summary/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {'status': 'HEALTHY'})
        for key in ('mrr', 'arr', 'showcase_invoices', 'database_engine', 'billing_engine'):
            self.assertNotIn(key, res.json())


class MRRDefinitionTestCase(TestCase):
    """Model and SQL MRR must agree: DAILY x30, WEEKLY x52/12, MONTHLY x1, YEARLY /12."""

    def test_model_and_sql_totals_match_for_all_intervals(self):
        from apps.reports.views import calculate_mrr_sql
        customer = Customer.objects.create(name='MRR Co', email='mrr@example.com')
        product = Product.objects.create(sku='MRR-1', name='Seat', sales_price=Decimal('10.00'), cost_price=Decimal('1.00'))
        prices = {
            BillingInterval.WEEKLY: Decimal('10.01'),
            BillingInterval.DAILY: Decimal('1.00'),
            BillingInterval.MONTHLY: Decimal('49.99'),
            BillingInterval.YEARLY: Decimal('100.00'),
        }
        subs = []
        for interval, price in prices.items():
            plan = Plan.objects.create(name=f'{interval} plan', code=f'mrr-{interval.lower()}', price=price, billing_interval=interval)
            sub = Subscription.objects.create(customer=customer, plan=plan, status=SubscriptionStatus.ACTIVE, start_date=datetime.date.today())
            SubscriptionItem.objects.create(subscription=sub, product=product, quantity=3, unit_price=Decimal('3.33'))
            subs.append(sub)

        weekly = next(s for s in subs if s.plan.billing_interval == BillingInterval.WEEKLY)
        # (10.01 + 3 * 3.33) * 52 / 12 = 20.00 * 52 / 12 = 86.666...
        self.assertEqual(weekly.normalized_mrr_exact.quantize(Decimal('0.0001')), Decimal('86.6667'))
        self.assertEqual(weekly.normalized_mrr, Decimal('86.67'))

        model_total = sum((s.normalized_mrr_exact for s in subs), Decimal('0')).quantize(Decimal('0.01'))
        self.assertEqual(model_total, calculate_mrr_sql())


class RevenueTrendWireFormatTestCase(TestCase):
    def test_dashboard_revenue_trend_money_is_decimal_strings(self):
        admin = User.objects.create_superuser(email='trend@brightloop.io', password='AdminPassword@2026')
        client = APIClient()
        client.force_authenticate(user=admin)
        res = client.get('/api/v1/reports/dashboard/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['revenue_trend'])
        for point in res.data['revenue_trend']:
            self.assertIsInstance(point['billed'], str)
            self.assertIsInstance(point['collected'], str)
            self.assertRegex(point['billed'], r'^\d+\.\d{2}$')


class BusinessConfigTestCase(TestCase):
    def test_config_view_returns_settings_values(self):
        from django.test import override_settings
        user = User.objects.create_user(email='cfg@brightloop.io', password='AdminPassword@2026', role=Role.STAFF)
        client = APIClient()
        client.force_authenticate(user=user)
        with override_settings(CURRENCY_CODE='EUR', BUSINESS_TIMEZONE='Europe/Paris'):
            res = client.get('/api/v1/reports/config/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['currency_code'], 'EUR')
        self.assertEqual(res.data['business_timezone'], 'Europe/Paris')
        self.assertIn('business_today', res.data)

    def test_config_requires_authentication(self):
        self.assertIn(APIClient().get('/api/v1/reports/config/').status_code, (401, 403))

    def test_business_today_near_midnight_utc_uses_business_timezone(self):
        from unittest import mock
        from django.test import override_settings
        from django.utils import timezone as dj_tz
        from apps.reports.business_time import business_today, business_month_start, business_month_end
        # 2026-03-31 20:30 UTC is already 2026-04-01 02:00 in Asia/Kolkata (UTC+5:30).
        fixed = datetime.datetime(2026, 3, 31, 20, 30, tzinfo=datetime.timezone.utc)
        with override_settings(BUSINESS_TIMEZONE='Asia/Kolkata'), mock.patch.object(dj_tz, 'now', return_value=fixed):
            self.assertEqual(business_today(), datetime.date(2026, 4, 1))
        with override_settings(BUSINESS_TIMEZONE='UTC'), mock.patch.object(dj_tz, 'now', return_value=fixed):
            self.assertEqual(business_today(), datetime.date(2026, 3, 31))
        self.assertEqual(business_month_start(datetime.date(2026, 2, 17)), datetime.date(2026, 2, 1))
        self.assertEqual(business_month_end(datetime.date(2026, 2, 17)), datetime.date(2026, 2, 28))
