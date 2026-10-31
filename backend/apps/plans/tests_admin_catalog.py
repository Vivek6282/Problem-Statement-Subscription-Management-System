import datetime
from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from apps.accounts.models import User, Role
from apps.audit.models import AuditEvent
from apps.customers.models import Customer
from apps.plans.models import Plan
from apps.subscriptions.models import Subscription


class PlanCatalogPermissionAndIntegrityTests(TestCase):
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

    def test_anonymous_access_denied(self):
        res = self.client.post('/api/v1/plans/', {'name': 'Basic', 'code': 'basic', 'price': '10.00'})
        self.assertIn(res.status_code, [401, 403])

    def test_customer_cannot_write_plan(self):
        self.client.force_authenticate(user=self.customer_user)
        res = self.client.post('/api/v1/plans/', {'name': 'Basic', 'code': 'basic', 'price': '10.00'})
        self.assertEqual(res.status_code, 403)

    def test_staff_cannot_create_or_configure_plan_lifecycle_flags(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post('/api/v1/plans/', {
            'name': 'Staff Plan',
            'code': 'staff-plan',
            'price': '10.00',
            'allow_pause': False
        })
        self.assertEqual(res.status_code, 403)

    def test_admin_can_create_and_update_plan(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/plans/', {
            'name': 'Enterprise Yearly',
            'code': 'enterprise-yearly',
            'price': '1200.00',
            'billing_interval': 'YEARLY',
            'min_quantity': 5,
            'allow_pause': True,
            'allow_renewal': True
        })
        self.assertEqual(res.status_code, 201)
        plan_id = res.data['id']
        self.assertTrue(AuditEvent.objects.filter(action='PLAN_CREATED', entity_id=str(plan_id)).exists())

        # Update price tracks old and new
        res_patch = self.client.patch(f'/api/v1/plans/{plan_id}/', {'price': '1500.00'})
        self.assertEqual(res_patch.status_code, 200)
        audit = AuditEvent.objects.filter(action='PLAN_UPDATED', entity_id=str(plan_id)).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.metadata.get('old_price'), '1200.00')
        self.assertEqual(audit.metadata.get('new_price'), '1500.00')

    def test_plan_validation_errors(self):
        self.client.force_authenticate(user=self.admin)
        today = datetime.date.today()

        # Negative price
        res1 = self.client.post('/api/v1/plans/', {
            'name': 'Negative Plan',
            'code': 'neg-plan',
            'price': '-20.00'
        })
        self.assertEqual(res1.status_code, 400)
        self.assertIn('price', res1.data)

        # Min quantity < 1
        res2 = self.client.post('/api/v1/plans/', {
            'name': 'Min Qty Plan',
            'code': 'min-qty-plan',
            'price': '10.00',
            'min_quantity': 0
        })
        self.assertEqual(res2.status_code, 400)
        self.assertIn('min_quantity', res2.data)

        # End date < start date
        res3 = self.client.post('/api/v1/plans/', {
            'name': 'Bad Dates Plan',
            'code': 'bad-dates-plan',
            'price': '10.00',
            'availability_start_date': str(today),
            'availability_end_date': str(today - datetime.timedelta(days=1))
        })
        self.assertEqual(res3.status_code, 400)
        self.assertIn('availability_end_date', res3.data)

    def test_customer_reads_only_active_and_available_plans(self):
        today = datetime.date.today()
        p_active = Plan.objects.create(name='P Active', code='p-active', price=Decimal('10.00'), is_active=True)
        p_inactive = Plan.objects.create(name='P Inactive', code='p-inactive', price=Decimal('20.00'), is_active=False)
        p_future = Plan.objects.create(
            name='P Future', code='p-future', price=Decimal('30.00'), is_active=True,
            availability_start_date=today + datetime.timedelta(days=10)
        )
        p_expired = Plan.objects.create(
            name='P Expired', code='p-expired', price=Decimal('40.00'), is_active=True,
            availability_end_date=today - datetime.timedelta(days=10)
        )

        self.client.force_authenticate(user=self.customer_user)
        res = self.client.get('/api/v1/plans/')
        self.assertEqual(res.status_code, 200)
        names = [p['name'] for p in res.data['results']]
        self.assertIn('P Active', names)
        self.assertNotIn('P Inactive', names)
        self.assertNotIn('P Future', names)
        self.assertNotIn('P Expired', names)

        # Staff can see all
        self.client.force_authenticate(user=self.staff)
        res_staff = self.client.get('/api/v1/plans/')
        staff_names = [p['name'] for p in res_staff.data['results']]
        self.assertIn('P Inactive', staff_names)

    def test_delete_referenced_plan_archives(self):
        self.client.force_authenticate(user=self.admin)
        plan = Plan.objects.create(name='Referenced Plan', code='ref-plan', price=Decimal('100.00'))
        Subscription.objects.create(
            customer=self.customer,
            plan=plan,
            subscription_number='SUB-REF-01'
        )

        res = self.client.delete(f'/api/v1/plans/{plan.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data.get('archived'))

        plan.refresh_from_db()
        self.assertFalse(plan.is_active)
        self.assertTrue(AuditEvent.objects.filter(action='PLAN_ARCHIVED', entity_id=str(plan.id)).exists())

    def test_delete_unreferenced_plan_deletes(self):
        self.client.force_authenticate(user=self.admin)
        plan = Plan.objects.create(name='Unreferenced Plan', code='unref-plan', price=Decimal('100.00'))
        plan_id = plan.id

        res = self.client.delete(f'/api/v1/plans/{plan_id}/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(Plan.objects.filter(id=plan_id).exists())
        self.assertTrue(AuditEvent.objects.filter(action='PLAN_DELETED', entity_id=str(plan_id)).exists())

