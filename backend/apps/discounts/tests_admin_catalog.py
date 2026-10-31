import datetime
from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from apps.accounts.models import User, Role
from apps.audit.models import AuditEvent
from apps.customers.models import Customer
from apps.discounts.models import Discount, DiscountRedemption
from apps.plans.models import Plan
from apps.products.models import Product
from apps.subscriptions.models import Subscription, SubscriptionItem


class DiscountCatalogPermissionAndIntegrityTests(TestCase):
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
        self.customer_user1 = User.objects.create_user(
            email='customer1@brightloop.test',
            password='Password123!',
            role=Role.CUSTOMER
        )
        self.customer1 = Customer.objects.create(
            user=self.customer_user1,
            name='Customer One',
            email=self.customer_user1.email
        )
        self.customer_user2 = User.objects.create_user(
            email='customer2@brightloop.test',
            password='Password123!',
            role=Role.CUSTOMER
        )
        self.customer2 = Customer.objects.create(
            user=self.customer_user2,
            name='Customer Two',
            email=self.customer_user2.email
        )

    def test_anonymous_access_denied(self):
        res = self.client.post('/api/v1/discounts/', {'code': 'SAVE10', 'name': 'Save 10', 'value': '10.00'})
        self.assertIn(res.status_code, [401, 403])

    def test_customer_cannot_write_discount(self):
        self.client.force_authenticate(user=self.customer_user1)
        res = self.client.post('/api/v1/discounts/', {'code': 'SAVE10', 'name': 'Save 10', 'value': '10.00'})
        self.assertEqual(res.status_code, 403)

    def test_staff_cannot_write_discount(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post('/api/v1/discounts/', {'code': 'SAVE10', 'name': 'Save 10', 'value': '10.00'})
        self.assertEqual(res.status_code, 403)

    def test_admin_can_create_and_update_discount_with_normalized_code(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/discounts/', {
            'code': '  launch2026  ',
            'name': 'Launch Promo',
            'discount_type': 'PERCENTAGE',
            'value': '15.00',
            'min_purchase_amount': '50.00'
        })
        self.assertEqual(res.status_code, 201)
        disc_id = res.data['id']
        self.assertEqual(res.data['code'], 'LAUNCH2026')
        self.assertTrue(AuditEvent.objects.filter(action='DISCOUNT_CREATED', entity_id=str(disc_id)).exists())

        # Update value logs old and new
        res_patch = self.client.patch(f'/api/v1/discounts/{disc_id}/', {'value': '20.00'})
        self.assertEqual(res_patch.status_code, 200)
        audit = AuditEvent.objects.filter(action='DISCOUNT_UPDATED', entity_id=str(disc_id)).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.metadata.get('old_value'), '15.00')
        self.assertEqual(audit.metadata.get('new_value'), '20.00')

    def test_case_insensitive_code_uniqueness(self):
        self.client.force_authenticate(user=self.admin)
        Discount.objects.create(code='SUMMER20', name='Summer 20', discount_type='PERCENTAGE', value=Decimal('20.00'))

        res = self.client.post('/api/v1/discounts/', {
            'code': 'summer20',
            'name': 'Duplicate Code',
            'discount_type': 'FIXED',
            'value': '10.00'
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn('code', res.data)

    def test_discount_validation_errors(self):
        self.client.force_authenticate(user=self.admin)
        today = datetime.date.today()

        # Percentage > 100
        res1 = self.client.post('/api/v1/discounts/', {
            'code': 'OVER100',
            'name': 'Over 100',
            'discount_type': 'PERCENTAGE',
            'value': '120.00'
        })
        self.assertEqual(res1.status_code, 400)
        self.assertIn('value', res1.data)

        # Value <= 0
        res2 = self.client.post('/api/v1/discounts/', {
            'code': 'ZEROVAL',
            'name': 'Zero Val',
            'discount_type': 'FIXED',
            'value': '0.00'
        })
        self.assertEqual(res2.status_code, 400)
        self.assertIn('value', res2.data)

        # End date < start date
        res3 = self.client.post('/api/v1/discounts/', {
            'code': 'BADDATES',
            'name': 'Bad Dates',
            'discount_type': 'PERCENTAGE',
            'value': '10.00',
            'start_date': str(today),
            'end_date': str(today - datetime.timedelta(days=2))
        })
        self.assertEqual(res3.status_code, 400)
        self.assertIn('end_date', res3.data)

        # Usage limit < 1
        res4 = self.client.post('/api/v1/discounts/', {
            'code': 'BADLIMIT',
            'name': 'Bad Limit',
            'discount_type': 'PERCENTAGE',
            'value': '10.00',
            'usage_limit': 0
        })
        self.assertEqual(res4.status_code, 400)
        self.assertIn('usage_limit', res4.data)

    def test_customer_cannot_call_validate_code(self):
        Discount.objects.create(code='STAFFONLY', name='Staff Only', discount_type='PERCENTAGE', value=Decimal('10.00'))
        self.client.force_authenticate(user=self.customer_user1)
        res = self.client.post('/api/v1/discounts/validate-code/', {
            'code': 'STAFFONLY',
            'subtotal': '100.00'
        })
        self.assertEqual(res.status_code, 403)

    def test_staff_can_call_validate_code(self):
        Discount.objects.create(code='STAFFVALID', name='Staff Valid', discount_type='PERCENTAGE', value=Decimal('10.00'))
        self.client.force_authenticate(user=self.staff)
        res = self.client.post('/api/v1/discounts/validate-code/', {
            'code': 'STAFFVALID',
            'subtotal': '100.00'
        })
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data.get('valid'))
        self.assertEqual(Decimal(str(res.data.get('discount_amount'))), Decimal('10.00'))

    def test_customer_can_only_view_own_redemptions(self):
        disc = Discount.objects.create(code='REDEEM1', name='Redeem 1', discount_type='FIXED', value=Decimal('25.00'))
        r1 = DiscountRedemption.objects.create(discount=disc, customer=self.customer1, amount_discounted=Decimal('25.00'))
        r2 = DiscountRedemption.objects.create(discount=disc, customer=self.customer2, amount_discounted=Decimal('25.00'))

        # Customer 1 sees only r1
        self.client.force_authenticate(user=self.customer_user1)
        res1 = self.client.get('/api/v1/discounts/redemptions/')
        self.assertEqual(res1.status_code, 200)
        ids1 = [item['id'] for item in res1.data['results']]
        self.assertIn(r1.id, ids1)
        self.assertNotIn(r2.id, ids1)

        # Staff sees both
        self.client.force_authenticate(user=self.staff)
        res_staff = self.client.get('/api/v1/discounts/redemptions/')
        ids_staff = [item['id'] for item in res_staff.data['results']]
        self.assertIn(r1.id, ids_staff)
        self.assertIn(r2.id, ids_staff)

    def test_delete_referenced_discount_archives(self):
        self.client.force_authenticate(user=self.admin)
        disc = Discount.objects.create(code='REFDISC', name='Ref Disc', discount_type='PERCENTAGE', value=Decimal('10.00'))
        DiscountRedemption.objects.create(discount=disc, customer=self.customer1, amount_discounted=Decimal('10.00'))

        res = self.client.delete(f'/api/v1/discounts/{disc.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data.get('archived'))

        disc.refresh_from_db()
        self.assertFalse(disc.is_active)
        self.assertTrue(AuditEvent.objects.filter(action='DISCOUNT_ARCHIVED', entity_id=str(disc.id)).exists())

    def test_delete_unreferenced_discount_deletes(self):
        self.client.force_authenticate(user=self.admin)
        disc = Discount.objects.create(code='UNREFDISC', name='Unref Disc', discount_type='PERCENTAGE', value=Decimal('10.00'))
        disc_id = disc.id

        res = self.client.delete(f'/api/v1/discounts/{disc_id}/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(Discount.objects.filter(id=disc_id).exists())
        self.assertTrue(AuditEvent.objects.filter(action='DISCOUNT_DELETED', entity_id=str(disc_id)).exists())

