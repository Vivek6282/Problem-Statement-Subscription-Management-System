import datetime
from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from apps.accounts.models import User, Role
from apps.customers.models import Customer
from apps.products.models import Product, ProductVariant
from apps.plans.models import Plan, BillingInterval
from apps.subscriptions.models import Subscription, SubscriptionItem, SubscriptionStatus
from apps.subscriptions.billing import BillingEngine
from apps.invoices.models import Invoice, InvoiceStatus
from apps.payments.services import PaymentService
from apps.payments.models import PaymentMethod

class SubscriptionLifecycleAndBillingTestCase(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email='admin@test.com',
            password='AdminPassword@2026'
        )
        self.cust_user1 = User.objects.create_user(
            email='cust1@test.com',
            password='CustomerPassword@2026',
            role=Role.CUSTOMER
        )
        self.cust_user2 = User.objects.create_user(
            email='cust2@test.com',
            password='CustomerPassword@2026',
            role=Role.CUSTOMER
        )
        self.customer1 = Customer.objects.create(
            user=self.cust_user1,
            name='Customer One',
            email=self.cust_user1.email,
            company='Alpha Corp'
        )
        self.customer2 = Customer.objects.create(
            user=self.cust_user2,
            name='Customer Two',
            email=self.cust_user2.email,
            company='Beta LLC'
        )

        # Product with Variant
        self.product = Product.objects.create(
            sku='BASE-PROD',
            name='Core Service',
            sales_price=Decimal('2000.00'),
            cost_price=Decimal('500.00')
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            name='Odoo Integration',
            price_adjustment=Decimal('560.00')
        )

        # Plan
        self.plan = Plan.objects.create(
            name='Monthly Business',
            code='plan-monthly-biz',
            price=Decimal('500.00'),
            billing_interval=BillingInterval.MONTHLY
        )

    def test_variant_pricing_calculation(self):
        # Base: 2000, Variant adjustment: 560 -> Final: 2560
        self.assertEqual(self.variant.final_unit_price, Decimal('2560.00'))

    def test_subscription_lifecycle_transitions(self):
        sub = Subscription.objects.create(
            customer=self.customer1,
            plan=self.plan,
            status=SubscriptionStatus.DRAFT,
            start_date=datetime.date.today(),
            next_billing_date=datetime.date.today()
        )
        # Valid: DRAFT -> CONFIRMED
        self.assertTrue(sub.can_transition_to(SubscriptionStatus.CONFIRMED))
        # Valid: DRAFT -> CLOSED
        self.assertTrue(sub.can_transition_to(SubscriptionStatus.CLOSED))
        # Invalid: DRAFT -> PAUSED
        self.assertFalse(sub.can_transition_to(SubscriptionStatus.PAUSED))

    def test_recurring_billing_and_idempotency(self):
        today = datetime.date.today()
        sub = Subscription.objects.create(
            customer=self.customer1,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            start_date=today - datetime.timedelta(days=30),
            next_billing_date=today
        )
        SubscriptionItem.objects.create(
            subscription=sub,
            product=self.product,
            variant=self.variant,
            quantity=1,
            unit_price=self.variant.final_unit_price
        )

        # Run billing
        success, inv = BillingEngine.process_subscription_billing(sub.id, target_date=today)
        self.assertTrue(success)
        self.assertIsNotNone(inv)
        # Subtotal: 500 (plan) + 2560 (item) = 3060.00
        self.assertEqual(inv.total_amount, Decimal('3060.00'))
        self.assertEqual(inv.balance_due, Decimal('3060.00'))

        # Idempotency check: Process again immediately on same date
        success2, msg = BillingEngine.process_subscription_billing(sub.id, target_date=today)
        self.assertFalse(success2)
        # Ensure only 1 invoice exists
        self.assertEqual(Invoice.objects.filter(subscription=sub).count(), 1)

    def test_partial_payment_and_overpayment_prevention(self):
        today = datetime.date.today()
        inv = Invoice.objects.create(
            customer=self.customer1,
            issue_date=today,
            due_date=today + datetime.timedelta(days=30),
            status=InvoiceStatus.CONFIRMED,
            subtotal=Decimal('1000.00'),
            total_amount=Decimal('1000.00'),
            paid_amount=Decimal('0.00'),
            balance_due=Decimal('1000.00')
        )

        # Partial payment: $400
        pay1 = PaymentService.record_payment(
            invoice_id=inv.id,
            amount=Decimal('400.00'),
            payment_method=PaymentMethod.BANK_TRANSFER,
            user=self.admin
        )
        inv.refresh_from_db()
        self.assertEqual(inv.paid_amount, Decimal('400.00'))
        self.assertEqual(inv.balance_due, Decimal('600.00'))
        self.assertEqual(inv.status, InvoiceStatus.PARTIALLY_PAID)

        # Attempt overpayment: $700 when balance is $600
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            PaymentService.record_payment(
                invoice_id=inv.id,
                amount=Decimal('700.00'),
                payment_method=PaymentMethod.CASH,
                user=self.admin
            )

        # Pay remaining $600 exactly
        pay2 = PaymentService.record_payment(
            invoice_id=inv.id,
            amount=Decimal('600.00'),
            payment_method=PaymentMethod.UPI,
            user=self.admin
        )
        inv.refresh_from_db()
        self.assertEqual(inv.paid_amount, Decimal('1000.00'))
        self.assertEqual(inv.balance_due, Decimal('0.00'))
        self.assertEqual(inv.status, InvoiceStatus.PAID)

    def test_customer_isolation_via_api(self):
        client = APIClient()
        # Login as customer 1
        client.force_authenticate(user=self.cust_user1)

        # Create sub for customer 2
        sub2 = Subscription.objects.create(
            customer=self.customer2,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            start_date=datetime.date.today(),
            next_billing_date=datetime.date.today()
        )

        # Customer 1 attempts to access Customer 2's subscription
        res = client.get(f'/api/v1/subscriptions/{sub2.id}/')
        # Expect 404 Not Found (or 403 Forbidden)
        self.assertIn(res.status_code, [404, 403])

