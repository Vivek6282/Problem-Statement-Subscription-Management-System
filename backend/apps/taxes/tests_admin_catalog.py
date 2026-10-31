import datetime
from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from apps.accounts.models import User, Role
from apps.audit.models import AuditEvent
from apps.customers.models import Customer
from apps.plans.models import Plan
from apps.products.models import Product
from apps.subscriptions.models import Subscription, SubscriptionItem
from apps.taxes.models import TaxRule


class TaxCatalogPermissionAndIntegrityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@brightloop.test',
            password='Password123!',
            role=Role.ADMIN,
            is_staff=True,
            is_superuser=True
        )
        self.staff = User.objects.create_user(
            email='staff@brightloop.test',
            password='Password123!',
            role=Role.STAFF,
            is_staff=True
        )
        self.customer_user = User.objects.create_user(
            email='customer@brightloop.test',
            password='Password123!',
            role=Role.CUSTOMER
        )
        self.customer = Customer.objects.create(
            user=self.customer_user,
            name='Test Customer',
            email=self.customer_user.email
        )
        self.plan = Plan.objects.create(
            name='Standard Plan',
            code='standard-plan',
            price=Decimal('100.00'),
            billing_interval='MONTHLY'
        )
        self.product = Product.objects.create(
            name='Base Product',
            sku='BASE-01',
            sales_price=Decimal('100.00')
        )

    def test_anonymous_access_denied(self):
        res = self.client.get('/api/v1/taxes/')
        self.assertIn(res.status_code, [401, 403])

    def test_customer_cannot_list_tax_rules(self):
        self.client.force_authenticate(user=self.customer_user)
        res = self.client.get('/api/v1/taxes/')
        self.assertEqual(res.status_code, 403)

    def test_customer_cannot_write_tax_rule(self):
        self.client.force_authenticate(user=self.customer_user)
        res = self.client.post('/api/v1/taxes/', {
            'name': 'VAT 10',
            'percentage': '10.00',
            'effective_from': '2026-01-01'
        })
        self.assertEqual(res.status_code, 403)

    def test_staff_can_read_tax_rules_but_cannot_write(self):
        TaxRule.objects.create(name='GST 18', percentage=Decimal('18.00'), effective_from=datetime.date.today())
        self.client.force_authenticate(user=self.staff)

        # Read allowed
        res_get = self.client.get('/api/v1/taxes/')
        self.assertEqual(res_get.status_code, 200)

        # Write blocked
        res_post = self.client.post('/api/v1/taxes/', {
            'name': 'VAT 10',
            'percentage': '10.00',
            'effective_from': '2026-01-01'
        })
        self.assertEqual(res_post.status_code, 403)

    def test_admin_can_create_and_update_tax_rule(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/taxes/', {
            'name': 'Sales Tax 5%',
            'percentage': '5.00',
            'effective_from': '2026-01-01'
        })
        self.assertEqual(res.status_code, 201)
        rule_id = res.data['id']
        self.assertTrue(AuditEvent.objects.filter(action='TAX_RULE_CREATED', entity_id=str(rule_id)).exists())

        # Update percentage logs old and new
        res_patch = self.client.patch(f'/api/v1/taxes/{rule_id}/', {'percentage': '6.00'})
        self.assertEqual(res_patch.status_code, 200)
        audit = AuditEvent.objects.filter(action='TAX_RULE_UPDATED', entity_id=str(rule_id)).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.metadata.get('old_percentage'), '5.00')
        self.assertEqual(audit.metadata.get('new_percentage'), '6.00')

    def test_tax_rule_validation_errors(self):
        self.client.force_authenticate(user=self.admin)

        # Percentage > 100
        res1 = self.client.post('/api/v1/taxes/', {
            'name': 'Over 100%',
            'percentage': '105.00',
            'effective_from': '2026-01-01'
        })
        self.assertEqual(res1.status_code, 400)
        self.assertIn('percentage', res1.data)

        # End date < start date
        res2 = self.client.post('/api/v1/taxes/', {
            'name': 'Bad Dates',
            'percentage': '10.00',
            'effective_from': '2026-05-01',
            'effective_to': '2026-04-01'
        })
        self.assertEqual(res2.status_code, 400)
        self.assertIn('effective_to', res2.data)

    def test_delete_referenced_tax_rule_archives(self):
        self.client.force_authenticate(user=self.admin)
        tax = TaxRule.objects.create(name='Attached Tax', percentage=Decimal('10.00'), effective_from=datetime.date.today())
        subscription = Subscription.objects.create(
            customer=self.customer,
            plan=self.plan,
            subscription_number='SUB-TAX-01'
        )
        SubscriptionItem.objects.create(
            subscription=subscription,
            product=self.product,
            quantity=1,
            unit_price=Decimal('100.00'),
            tax_rule=tax
        )

        res = self.client.delete(f'/api/v1/taxes/{tax.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data.get('archived'))

        tax.refresh_from_db()
        self.assertFalse(tax.is_active)
        self.assertTrue(AuditEvent.objects.filter(action='TAX_RULE_ARCHIVED', entity_id=str(tax.id)).exists())

    def test_delete_unreferenced_tax_rule_deletes(self):
        self.client.force_authenticate(user=self.admin)
        tax = TaxRule.objects.create(name='Unused Tax', percentage=Decimal('8.00'), effective_from=datetime.date.today())
        tax_id = tax.id

        res = self.client.delete(f'/api/v1/taxes/{tax_id}/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(TaxRule.objects.filter(id=tax_id).exists())
        self.assertTrue(AuditEvent.objects.filter(action='TAX_RULE_DELETED', entity_id=str(tax_id)).exists())
