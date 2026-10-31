"""Customers can read and act on their own records, but creating, editing and
deleting billing data through the API is staff work."""
import datetime
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.customers.models import Customer
from apps.invoices.models import Invoice
from apps.plans.models import Plan
from apps.subscriptions.models import Subscription, SubscriptionStatus

PASSWORD = 'Brightloop@2026'


class CustomerWriteAccessTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='buyer@test.io', password=PASSWORD, role=Role.CUSTOMER)
        self.staff = User.objects.create_user(
            email='ops@test.io', password=PASSWORD, role=Role.STAFF, is_staff=True
        )
        self.customer = Customer.objects.create(user=self.user, name='Buyer', email=self.user.email)
        self.locked_plan = Plan.objects.create(
            name='Locked', code='locked', price=Decimal('100.00'), allow_pause=False, allow_early_close=False
        )
        self.open_plan = Plan.objects.create(name='Open', code='open', price=Decimal('50.00'))
        next_bill = datetime.date.today() + datetime.timedelta(days=30)
        self.locked_sub = Subscription.objects.create(
            customer=self.customer, plan=self.locked_plan, status=SubscriptionStatus.ACTIVE, next_billing_date=next_bill
        )
        self.open_sub = Subscription.objects.create(
            customer=self.customer, plan=self.open_plan, status=SubscriptionStatus.ACTIVE, next_billing_date=next_bill
        )
        self.invoice = Invoice.objects.create(customer=self.customer, due_date=datetime.date.today())

    def as_user(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def test_customer_cannot_create_billing_records(self):
        c, today = self.as_user(self.user), datetime.date.today().isoformat()
        attempts = {
            '/api/v1/customers/': {'name': 'X', 'email': 'x@test.io'},
            '/api/v1/subscriptions/': {'customer': self.customer.id, 'plan': self.open_plan.id, 'start_date': today, 'items': []},
            '/api/v1/quotations/': {'customer': self.customer.id, 'plan': self.open_plan.id, 'valid_until': today, 'items': []},
            '/api/v1/invoices/': {'customer': self.customer.id, 'due_date': today,
                                  'items': [{'product_name': 'Free', 'quantity': 1, 'unit_price': '1.00'}]},
        }
        for url, payload in attempts.items():
            res = c.post(url, payload, format='json')
            self.assertEqual(res.status_code, 403, url)

    def test_customer_cannot_edit_or_delete_their_records(self):
        c = self.as_user(self.user)
        self.assertEqual(c.patch(f'/api/v1/invoices/{self.invoice.id}/', {'notes': 'x'}, format='json').status_code, 403)
        self.assertEqual(c.patch(f'/api/v1/subscriptions/{self.open_sub.id}/', {'notes': 'x'}, format='json').status_code, 403)
        self.assertEqual(c.delete(f'/api/v1/invoices/{self.invoice.id}/').status_code, 403)
        self.assertEqual(c.delete(f'/api/v1/subscriptions/{self.open_sub.id}/').status_code, 403)
        self.assertEqual(c.post(f'/api/v1/customers/{self.customer.id}/archive/').status_code, 403)
        self.assertTrue(Invoice.objects.filter(id=self.invoice.id).exists())

    def test_customer_close_respects_plan_rules(self):
        c = self.as_user(self.user)
        self.assertEqual(c.post(f'/api/v1/subscriptions/{self.locked_sub.id}/close/').status_code, 400)
        self.locked_sub.refresh_from_db()
        self.assertEqual(self.locked_sub.status, SubscriptionStatus.ACTIVE)
        self.assertEqual(c.post(f'/api/v1/subscriptions/{self.open_sub.id}/close/').status_code, 200)

    def test_customer_can_still_read_own_records(self):
        c = self.as_user(self.user)
        self.assertEqual(c.get('/api/v1/invoices/').status_code, 200)
        self.assertEqual(c.get(f'/api/v1/subscriptions/{self.open_sub.id}/').status_code, 200)

    def test_staff_can_still_manage_records(self):
        c = self.as_user(self.staff)
        res = c.post('/api/v1/invoices/', {
            'customer': self.customer.id, 'due_date': datetime.date.today().isoformat(),
            'items': [{'product_name': 'Consulting', 'quantity': 1, 'unit_price': '10.00'}],
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(c.post(f'/api/v1/customers/{self.customer.id}/archive/').status_code, 200)
        self.assertEqual(c.post(f'/api/v1/subscriptions/{self.locked_sub.id}/close/').status_code, 200)
