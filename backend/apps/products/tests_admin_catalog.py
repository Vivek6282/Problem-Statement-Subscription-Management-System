from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from apps.accounts.models import User, Role
from apps.audit.models import AuditEvent
from apps.customers.models import Customer
from apps.plans.models import Plan
from apps.products.models import Product, ProductVariant
from apps.subscriptions.models import Subscription, SubscriptionItem


class ProductCatalogPermissionAndIntegrityTests(TestCase):
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
            name='Acme Corp',
            email=self.customer_user.email
        )
        self.plan = Plan.objects.create(
            name='Basic Plan',
            code='basic-plan',
            price=Decimal('50.00'),
            billing_interval='MONTHLY'
        )

    def test_anonymous_access_denied(self):
        res = self.client.post('/api/v1/products/', {'name': 'Test', 'sku': 'TEST', 'sales_price': '100.00'})
        self.assertIn(res.status_code, [401, 403])

    def test_customer_cannot_write_product(self):
        self.client.force_authenticate(user=self.customer_user)
        res = self.client.post('/api/v1/products/', {'name': 'Test', 'sku': 'TEST', 'sales_price': '100.00'})
        self.assertEqual(res.status_code, 403)

    def test_staff_cannot_create_or_update_product(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post('/api/v1/products/', {'name': 'Test', 'sku': 'TEST', 'sales_price': '100.00'})
        self.assertEqual(res.status_code, 403)

    def test_admin_can_create_and_update_product(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/products/', {
            'name': 'Cloud Platform',
            'sku': 'CLOUD-01',
            'product_type': 'SOFTWARE',
            'sales_price': '199.99',
            'cost_price': '50.00'
        })
        self.assertEqual(res.status_code, 201)
        prod_id = res.data['id']
        self.assertTrue(AuditEvent.objects.filter(action='PRODUCT_CREATED', entity_id=str(prod_id)).exists())

        # Update with price change logs old and new price
        res_patch = self.client.patch(f'/api/v1/products/{prod_id}/', {'sales_price': '249.99'})
        self.assertEqual(res_patch.status_code, 200)
        audit = AuditEvent.objects.filter(action='PRODUCT_UPDATED', entity_id=str(prod_id)).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.metadata.get('old_sales_price'), '199.99')
        self.assertEqual(audit.metadata.get('new_sales_price'), '249.99')

    def test_sku_uniqueness_returns_400(self):
        self.client.force_authenticate(user=self.admin)
        Product.objects.create(name='Original', sku='SKU-UNIQUE', sales_price=Decimal('10.00'))
        res = self.client.post('/api/v1/products/', {
            'name': 'Duplicate',
            'sku': 'sku-unique',
            'sales_price': '20.00'
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn('sku', res.data)

    def test_negative_prices_return_400(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/products/', {
            'name': 'Negative Test',
            'sku': 'NEG-01',
            'sales_price': '-10.00'
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn('sales_price', res.data)

    def test_staff_cannot_create_variant_with_price_adjustment(self):
        self.client.force_authenticate(user=self.admin)
        product = Product.objects.create(name='Base Product', sku='BASE-01', sales_price=Decimal('100.00'))

        self.client.force_authenticate(user=self.staff)
        res = self.client.post('/api/v1/products/variants/', {
            'product': product.id,
            'name': 'Pro Variant',
            'price_adjustment': '50.00'
        })
        self.assertEqual(res.status_code, 403)

    def test_admin_can_create_variant_with_price_adjustment(self):
        self.client.force_authenticate(user=self.admin)
        product = Product.objects.create(name='Base Product 2', sku='BASE-02', sales_price=Decimal('100.00'))

        res = self.client.post('/api/v1/products/variants/', {
            'product': product.id,
            'name': 'Pro Variant',
            'price_adjustment': '50.00'
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Decimal(str(res.data['final_unit_price'])), Decimal('150.00'))

    def test_delete_referenced_product_archives_instead_of_delete(self):
        self.client.force_authenticate(user=self.admin)
        product = Product.objects.create(name='Sub Product', sku='SUB-PROD', sales_price=Decimal('100.00'))
        subscription = Subscription.objects.create(
            customer=self.customer,
            plan=self.plan,
            subscription_number='SUB-001'
        )
        SubscriptionItem.objects.create(
            subscription=subscription,
            product=product,
            quantity=1,
            unit_price=Decimal('100.00')
        )

        res = self.client.delete(f'/api/v1/products/{product.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data.get('archived'))

        product.refresh_from_db()
        self.assertFalse(product.is_active)
        self.assertTrue(AuditEvent.objects.filter(action='PRODUCT_ARCHIVED', entity_id=str(product.id)).exists())

    def test_delete_unreferenced_product_deletes_record(self):
        self.client.force_authenticate(user=self.admin)
        product = Product.objects.create(name='Temp Product', sku='TEMP-PROD', sales_price=Decimal('10.00'))
        prod_id = product.id

        res = self.client.delete(f'/api/v1/products/{prod_id}/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(Product.objects.filter(id=prod_id).exists())
        self.assertTrue(AuditEvent.objects.filter(action='PRODUCT_DELETED', entity_id=str(prod_id)).exists())
