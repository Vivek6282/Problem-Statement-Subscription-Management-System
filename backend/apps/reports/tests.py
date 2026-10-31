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
        }, format='json')
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
        self.assertEqual(res_quote.status_code, 201, getattr(res_quote, 'data', None))
        quote_id = res_quote.data['id']

        # Convert quotation into subscription
        res_conv = self.client.post(f'/api/v1/quotations/{quote_id}/convert_to_subscription/')
        self.assertEqual(res_conv.status_code, 200)
        sub_id = res_conv.data['subscription_id']

        # 5. Subscription verification
        sub = Subscription.objects.get(id=sub_id)
        # Spec lifecycle: confirming a quotation leaves the subscription Confirmed; it is activated as a separate step
        self.assertEqual(sub.status, SubscriptionStatus.CONFIRMED)
        res_act = self.client.post(f'/api/v1/subscriptions/{sub_id}/activate/')
        self.assertEqual(res_act.status_code, 200)
        sub.refresh_from_db()
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
        self.assertGreaterEqual(metrics['mrr'], 3560.00)
        self.assertGreaterEqual(metrics['revenue_this_month'], 3560.00)
