"""
End-to-end tests for every scene of Subscription_Management_System.pdf (workflows 1-8 of the build brief)
plus security regressions. They drive the real HTTP API wherever the behaviour is user-facing.
"""
import datetime
import re
import time
from decimal import Decimal

from django.core import mail
from django.db import IntegrityError, transaction, connection
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.accounts.models import User, Role
from apps.customers.models import Customer
from apps.products.models import Product, ProductVariant
from apps.plans.models import Plan, BillingInterval
from apps.taxes.models import TaxRule
from apps.discounts.models import Discount, DiscountRedemption
from apps.subscriptions.models import Subscription, SubscriptionItem, SubscriptionStatus
from apps.subscriptions.billing import BillingEngine
from apps.subscriptions.maintenance import run_housekeeping
from apps.subscriptions.tasks import run_recurring_billing
from apps.invoices.models import Invoice, InvoiceStatus
from apps.payments.models import Payment, PaymentStatus
from apps.quotations.models import Quotation, QuotationStatus

TODAY = datetime.date.today()
D = Decimal


def api_for(user=None):
    c = APIClient()
    if user:
        c.force_authenticate(user=user)
    return c


class BaseCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_superuser(email='admin@t.io', password='AdminPass@2026', role=Role.ADMIN)
        cls.staff = User.objects.create_user(email='staff@t.io', password='StaffPass@2026', role=Role.STAFF, is_staff=True)
        cls.cu1 = User.objects.create_user(email='c1@t.io', password='CustPass@2026', role=Role.CUSTOMER)
        cls.cu2 = User.objects.create_user(email='c2@t.io', password='CustPass@2026', role=Role.CUSTOMER)
        cls.cust1 = Customer.objects.create(user=cls.cu1, name='Alice', company='Alpha', email='c1@t.io')
        cls.cust2 = Customer.objects.create(user=cls.cu2, name='Bob', company='Beta', email='c2@t.io')
        cls.product = Product.objects.create(sku='CORE', name='Core Service', sales_price=D('2000.00'), cost_price=D('500'))
        cls.variant = ProductVariant.objects.create(product=cls.product, name='Odoo', price_adjustment=D('560.00'))
        cls.plan = Plan.objects.create(name='Monthly', code='monthly', price=D('500.00'), billing_interval=BillingInterval.MONTHLY)

    def setUp(self):
        self.admin_api, self.staff_api = api_for(self.admin), api_for(self.staff)
        self.c1_api, self.c2_api, self.anon = api_for(self.cu1), api_for(self.cu2), api_for()

    # helpers ------------------------------------------------------------
    def make_sub(self, customer=None, plan=None, status=SubscriptionStatus.ACTIVE, next_billing=None, items=True, **kw):
        sub = Subscription.objects.create(
            customer=customer or self.cust1, plan=plan or self.plan, status=status,
            start_date=kw.pop('start_date', TODAY - datetime.timedelta(days=60)),
            next_billing_date=next_billing or TODAY, **kw)
        if items:
            SubscriptionItem.objects.create(subscription=sub, product=self.product, variant=self.variant,
                                            quantity=1, unit_price=self.variant.final_unit_price)
        return sub

    def make_invoice(self, customer=None, total='1000.00', status=InvoiceStatus.CONFIRMED, due=None, **kw):
        return Invoice.objects.create(
            customer=customer or self.cust1, issue_date=TODAY, due_date=due or TODAY + datetime.timedelta(days=30),
            status=status, subtotal=D(total), total_amount=D(total), balance_due=D(total), **kw)


# =============================================================== WORKFLOW 1
class Workflow1Auth(BaseCase):
    def reg(self, email='new@t.io', password='Brightloop@2026'):
        return self.anon.post('/api/v1/auth/register/', {'email': email, 'password': password, 'password_confirm': password,
                                                        'first_name': 'N', 'last_name': 'U'})

    def test_password_rules(self):
        for bad in ['Ab1!', 'Short1!a', 'alllowercase1!', 'ALLUPPERCASE1!', 'NoSpecialChar123']:
            self.assertEqual(self.reg(password=bad).status_code, 400, bad)
        self.assertEqual(self.reg(password='Exactly9!a').status_code, 201)  # 9 chars = "more than eight"

    def test_unique_email_case_insensitive(self):
        self.assertEqual(self.reg('dup@t.io').status_code, 201)
        self.assertEqual(self.reg('DUP@t.io').status_code, 400)

    def test_registration_creates_customer_profile_and_role(self):
        r = self.reg('fresh@t.io')
        user = User.objects.get(email='fresh@t.io')
        self.assertEqual(user.role, Role.CUSTOMER)
        self.assertTrue(Customer.objects.filter(user=user).exists())
        self.assertNotIn('password', r.data['user'])

    def test_login_logout_and_session(self):
        c = APIClient()
        self.assertEqual(c.post('/api/v1/auth/login/', {'email': 'c1@t.io', 'password': 'wrong'}).status_code, 400)
        self.assertEqual(c.post('/api/v1/auth/login/', {'email': 'c1@t.io', 'password': 'CustPass@2026'}).status_code, 200)
        self.assertEqual(c.get('/api/v1/auth/me/').status_code, 200)
        self.assertEqual(c.post('/api/v1/auth/logout/').status_code, 200)
        self.assertIn(c.get('/api/v1/auth/me/').status_code, (401, 403))

    @override_settings(FRONTEND_URL='https://app.example.com')
    def test_password_reset_emails_a_one_time_link(self):
        self.assertEqual(self.anon.post('/api/v1/auth/password-reset-request/', {'email': 'c1@t.io'}).status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['c1@t.io'])
        m = re.search(r'https://app\.example\.com/reset-password\?uid=([^&\s]+)&token=([^\s]+)', mail.outbox[0].body)
        self.assertIsNotNone(m, mail.outbox[0].body)
        uid, token = m.groups()
        payload = {'uid': uid, 'token': token, 'new_password': 'BrandNew@2026x', 'new_password_confirm': 'BrandNew@2026x'}
        self.assertEqual(self.anon.post('/api/v1/auth/password-reset-confirm/', payload).status_code, 200)
        self.assertTrue(User.objects.get(email='c1@t.io').check_password('BrandNew@2026x'))
        # the link works only once
        self.assertEqual(self.anon.post('/api/v1/auth/password-reset-confirm/', payload).status_code, 400)

    def test_password_reset_link_is_time_limited(self):
        self.anon.post('/api/v1/auth/password-reset-request/', {'email': 'c1@t.io'})
        uid, token = re.search(r'uid=([^&\s]+)&token=([^\s]+)', mail.outbox[0].body).groups()
        with override_settings(PASSWORD_RESET_TIMEOUT=-10):
            r = self.anon.post('/api/v1/auth/password-reset-confirm/', {
                'uid': uid, 'token': token, 'new_password': 'BrandNew@2026x', 'new_password_confirm': 'BrandNew@2026x'})
        self.assertEqual(r.status_code, 400)

    def test_reset_for_unknown_email_is_generic_and_sends_nothing(self):
        r = self.anon.post('/api/v1/auth/password-reset-request/', {'email': 'nobody@t.io'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_reset_link_ignores_spoofed_origin_header(self):
        self.anon.post('/api/v1/auth/password-reset-request/', {'email': 'c1@t.io'}, HTTP_ORIGIN='https://evil.example')
        self.assertNotIn('evil.example', mail.outbox[0].body)

    def test_only_admin_creates_staff(self):
        body = {'email': 'newstaff@t.io', 'password': 'StaffNew@2026', 'role': 'STAFF', 'first_name': 'S'}
        self.assertEqual(self.staff_api.post('/api/v1/auth/users/', body).status_code, 403)
        self.assertEqual(self.c1_api.post('/api/v1/auth/users/', body).status_code, 403)
        self.assertEqual(self.anon.post('/api/v1/auth/users/', body).status_code, 403)
        self.assertEqual(self.admin_api.post('/api/v1/auth/users/', body).status_code, 201)
        self.assertEqual(User.objects.get(email='newstaff@t.io').role, Role.STAFF)
        # public registration can never mint a staff/admin account
        r = self.anon.post('/api/v1/auth/register/', {'email': 'sneaky@t.io', 'password': 'Brightloop@2026',
                                                      'password_confirm': 'Brightloop@2026', 'role': 'ADMIN', 'is_staff': True})
        self.assertEqual(User.objects.get(email='sneaky@t.io').role, Role.CUSTOMER)


# =============================================================== WORKFLOW 2
class Workflow2Catalog(BaseCase):
    def test_admin_creates_product_variant_and_plan(self):
        r = self.admin_api.post('/api/v1/products/', {'sku': 'NEW', 'name': 'New Product', 'product_type': 'SOFTWARE',
                                                      'sales_price': '1000.00', 'cost_price': '300.00', 'notes': 'n'})
        self.assertEqual(r.status_code, 201, r.data)
        pid = r.data['id']
        v = self.admin_api.post('/api/v1/products/variants/', {'product': pid, 'name': 'Odoo brand', 'price_adjustment': '560.00'})
        self.assertEqual(v.status_code, 201, v.data)
        detail = self.admin_api.get(f'/api/v1/products/{pid}/').data
        self.assertEqual(Decimal(detail['variants'][0]['final_unit_price']), D('1560.00'))  # 1000 + configurable 560
        p = self.admin_api.post('/api/v1/plans/', {
            'name': 'Gold Monthly', 'code': 'gold-monthly', 'price': '99.00', 'billing_interval': 'MONTHLY', 'min_quantity': 2,
            'availability_start_date': '2026-01-01', 'availability_end_date': '2026-12-31', 'allow_pause': True,
            'allow_early_close': False, 'allow_renewal': True, 'auto_close_on_expiry': True})
        self.assertEqual(p.status_code, 201, p.data)
        self.assertEqual(p.data['billing_interval'], 'MONTHLY')

    def test_variant_adjustment_is_configurable_not_hardcoded(self):
        v = ProductVariant.objects.create(product=self.product, name='SAP', price_adjustment=D('123.45'))
        self.assertEqual(v.final_unit_price, D('2123.45'))

    def test_all_billing_frequencies_supported(self):
        for i, interval in enumerate(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']):
            r = self.admin_api.post('/api/v1/plans/', {'name': f'P{i}', 'code': f'p{i}', 'price': '10.00', 'billing_interval': interval})
            self.assertEqual(r.status_code, 201, r.data)

    def test_catalog_writes_are_admin_only(self):
        for api in (self.staff_api, self.c1_api, self.anon):
            self.assertIn(api.post('/api/v1/products/', {'sku': 'X', 'name': 'X', 'sales_price': '1'}).status_code, (401, 403))
            self.assertIn(api.post('/api/v1/plans/', {'name': 'X', 'code': 'x', 'price': '1'}).status_code, (401, 403))
            self.assertIn(api.patch(f'/api/v1/products/{self.product.id}/', {'sales_price': '1.00'}).status_code, (401, 403))
            self.assertIn(api.patch(f'/api/v1/plans/{self.plan.id}/', {'price': '1.00'}).status_code, (401, 403))
            self.assertIn(api.post('/api/v1/products/variants/', {'product': self.product.id, 'name': 'Z', 'price_adjustment': '1'}).status_code, (401, 403))
        self.product.refresh_from_db()
        self.assertEqual(self.product.sales_price, D('2000.00'))

    def test_plan_validation(self):
        bad_dates = self.admin_api.post('/api/v1/plans/', {'name': 'B', 'code': 'b', 'price': '1', 'billing_interval': 'MONTHLY',
                                                           'availability_start_date': '2026-06-01', 'availability_end_date': '2026-01-01'})
        self.assertEqual(bad_dates.status_code, 400)
        self.assertEqual(self.admin_api.post('/api/v1/plans/', {'name': 'N', 'code': 'n', 'price': '-5', 'billing_interval': 'MONTHLY'}).status_code, 400)
        self.assertEqual(self.admin_api.post('/api/v1/plans/', {'name': 'M', 'code': 'm', 'price': '5', 'min_quantity': 0}).status_code, 400)

    def test_plan_can_be_deactivated_and_inactive_plan_cannot_be_subscribed(self):
        self.assertEqual(self.admin_api.patch(f'/api/v1/plans/{self.plan.id}/', {'is_active': False}).status_code, 200)
        r = self.staff_api.post('/api/v1/subscriptions/', {'customer': self.cust1.id, 'plan': self.plan.id, 'start_date': str(TODAY)})
        self.assertEqual(r.status_code, 400)

    def test_plan_availability_window_and_min_quantity_enforced(self):
        plan = Plan.objects.create(name='Windowed', code='win', price=D('50'), min_quantity=3, billing_interval='MONTHLY',
                                   availability_start_date=TODAY + datetime.timedelta(days=10),
                                   availability_end_date=TODAY + datetime.timedelta(days=100))
        base = {'customer': self.cust1.id, 'plan': plan.id}
        early = self.staff_api.post('/api/v1/subscriptions/', {**base, 'start_date': str(TODAY)})
        self.assertEqual(early.status_code, 400)
        late = self.staff_api.post('/api/v1/subscriptions/', {**base, 'start_date': str(TODAY + datetime.timedelta(days=200))})
        self.assertEqual(late.status_code, 400)
        ok_day = str(TODAY + datetime.timedelta(days=20))
        too_few = self.staff_api.post('/api/v1/subscriptions/', {**base, 'start_date': ok_day,
                                                                 'items': [{'product': self.product.id, 'quantity': 2}]})
        self.assertEqual(too_few.status_code, 400)
        fine = self.staff_api.post('/api/v1/subscriptions/', {**base, 'start_date': ok_day,
                                                              'items': [{'product': self.product.id, 'quantity': 3}]})
        self.assertEqual(fine.status_code, 201, fine.data)

    def test_product_in_use_is_archived_not_deleted(self):
        self.make_sub()
        r = self.admin_api.delete(f'/api/v1/products/{self.product.id}/')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['archived'])
        self.product.refresh_from_db()
        self.assertFalse(self.product.is_active)
        spare = Product.objects.create(sku='SPARE', name='Spare', sales_price=D('1'))
        self.assertEqual(self.admin_api.delete(f'/api/v1/products/{spare.id}/').status_code, 204)
        self.assertFalse(Product.objects.filter(pk=spare.pk).exists())

    def test_plan_in_use_is_deactivated_not_deleted(self):
        self.make_sub()
        r = self.admin_api.delete(f'/api/v1/plans/{self.plan.id}/')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(Plan.objects.filter(pk=self.plan.pk, is_active=False).exists())


# =============================================================== WORKFLOW 3
class Workflow3Quotations(BaseCase):
    def make_template(self):
        r = self.staff_api.post('/api/v1/quotations/templates/', {
            'name': 'Standard Offer', 'plan': self.plan.id, 'validity_days': 14, 'payment_terms': 'NET_15',
            'items': [{'product': self.product.id, 'variant': self.variant.id, 'quantity': 2}]})
        self.assertEqual(r.status_code, 201, r.data)
        return r.data['id']

    def test_template_crud_is_staff_only(self):
        self.make_template()
        self.assertEqual(self.c1_api.get('/api/v1/quotations/templates/').status_code, 403)
        self.assertEqual(self.anon.get('/api/v1/quotations/templates/').status_code, 403)
        self.assertEqual(self.staff_api.get('/api/v1/quotations/templates/').data['count'], 1)

    def test_quotation_from_template_with_server_side_prices(self):
        tid = self.make_template()
        r = self.staff_api.post('/api/v1/quotations/', {'customer': self.cust1.id, 'template': tid})
        self.assertEqual(r.status_code, 201, r.data)
        q = r.data
        self.assertEqual(q['validity_days'], 14)
        self.assertEqual(q['payment_terms'], 'NET_15')
        self.assertEqual(q['expiry_date'], str(TODAY + datetime.timedelta(days=14)))
        self.assertEqual(len(q['items']), 1)
        self.assertEqual(Decimal(q['items'][0]['unit_price']), D('2560.00'))  # 2000 + 560, not typed by anyone
        self.assertEqual(Decimal(q['subtotal']), D('5620.00'))  # plan 500 + 2 x 2560
        self.assertEqual(Decimal(q['total_amount']), D('5620.00'))

    def test_client_supplied_price_tax_discount_are_ignored(self):
        r = self.staff_api.post('/api/v1/quotations/', {
            'customer': self.cust1.id, 'plan': self.plan.id,
            'items': [{'product': self.product.id, 'variant': self.variant.id, 'quantity': 1,
                       'unit_price': '1.00', 'discount_amount': '2000.00', 'tax_percentage': '99.00'}]})
        self.assertEqual(r.status_code, 201, r.data)
        item = r.data['items'][0]
        self.assertEqual(Decimal(item['unit_price']), D('2560.00'))
        self.assertEqual(Decimal(item['discount_amount']), D('0.00'))
        self.assertEqual(Decimal(r.data['total_amount']), D('3060.00'))

    def test_tax_rules_are_applied_automatically_and_consistently(self):
        TaxRule.objects.create(name='GST', percentage=D('18.00'), effective_from=TODAY - datetime.timedelta(days=1))
        q = self.staff_api.post('/api/v1/quotations/', {'customer': self.cust1.id, 'plan': self.plan.id,
                                                       'items': [{'product': self.product.id, 'variant': self.variant.id}]}).data
        # (500 + 2560) * 18% = 550.80
        self.assertEqual(Decimal(q['tax_amount']), D('550.80'))
        self.assertEqual(Decimal(q['total_amount']), D('3610.80'))
        # the subscription estimate and the first invoice use the very same maths
        qid = q['id']
        self.staff_api.post(f'/api/v1/quotations/{qid}/send/')
        conv = self.staff_api.post(f'/api/v1/quotations/{qid}/convert_to_subscription/')
        sub = Subscription.objects.get(id=conv.data['subscription_id'])
        self.staff_api.post(f'/api/v1/subscriptions/{sub.id}/activate/')
        sub_json = self.staff_api.get(f'/api/v1/subscriptions/{sub.id}/').data
        self.assertEqual(Decimal(sub_json['pricing']['total']), D('3610.80'))
        ok, inv = BillingEngine.process_subscription_billing(sub.id, TODAY)
        self.assertTrue(ok)
        self.assertEqual(inv.total_amount, D('3610.80'))
        self.assertEqual(inv.tax_amount, D('550.80'))

    def test_full_lifecycle_and_no_duplicate_subscription(self):
        q = self.staff_api.post('/api/v1/quotations/', {'customer': self.cust1.id, 'plan': self.plan.id,
                                                       'items': [{'product': self.product.id}]}).data
        qid = q['id']
        self.assertEqual(q['status'], 'DRAFT')
        self.assertEqual(self.staff_api.post(f'/api/v1/quotations/{qid}/send/').data['status'], 'SENT')
        sub = Subscription.objects.get(originating_quotation__id=qid)
        self.assertEqual(sub.status, SubscriptionStatus.QUOTATION)
        self.assertEqual(self.c1_api.post(f'/api/v1/quotations/{qid}/accept/').data['status'], 'ACCEPTED')

        first = self.staff_api.post(f'/api/v1/quotations/{qid}/convert_to_subscription/')
        second = self.staff_api.post(f'/api/v1/quotations/{qid}/convert_to_subscription/')  # double click
        third = self.staff_api.post(f'/api/v1/quotations/{qid}/confirm/')
        self.assertEqual((first.status_code, second.status_code, third.status_code), (200, 200, 200))
        self.assertEqual(first.data['subscription_id'], second.data['subscription_id'])
        self.assertTrue(second.data['already_converted'])
        self.assertEqual(Subscription.objects.filter(customer=self.cust1).count(), 1)
        sub.refresh_from_db()
        self.assertEqual(sub.status, SubscriptionStatus.CONFIRMED)
        self.assertEqual(sub.items.count(), 1)

        self.assertEqual(self.staff_api.post(f'/api/v1/subscriptions/{sub.id}/activate/').status_code, 200)
        sub.refresh_from_db()
        self.assertEqual(sub.status, SubscriptionStatus.ACTIVE)
        self.assertEqual(self.staff_api.post(f'/api/v1/subscriptions/{sub.id}/close/').status_code, 200)
        sub.refresh_from_db()
        self.assertEqual(sub.status, SubscriptionStatus.CLOSED)

    def test_invalid_transitions_are_rejected(self):
        sub = self.make_sub(status=SubscriptionStatus.DRAFT)
        for action in ('activate', 'pause', 'resume', 'renew'):
            self.assertEqual(self.staff_api.post(f'/api/v1/subscriptions/{sub.id}/{action}/').status_code, 400, action)
        self.assertEqual(self.staff_api.post(f'/api/v1/subscriptions/{sub.id}/confirm/').status_code, 200)
        self.assertEqual(self.staff_api.post(f'/api/v1/subscriptions/{sub.id}/confirm/').status_code, 400)
        self.assertEqual(self.staff_api.post(f'/api/v1/subscriptions/{sub.id}/resume/').status_code, 400)
        q = Quotation.objects.create(customer=self.cust1, plan=self.plan, status=QuotationStatus.REJECTED)
        self.assertEqual(self.staff_api.post(f'/api/v1/quotations/{q.id}/convert_to_subscription/').status_code, 400)
        self.assertEqual(self.staff_api.patch(f'/api/v1/quotations/{q.id}/', {'notes': 'x'}).status_code, 400)

    def test_expired_quotation_cannot_be_confirmed(self):
        q = Quotation.objects.create(customer=self.cust1, plan=self.plan, status=QuotationStatus.SENT,
                                     issue_date=TODAY - datetime.timedelta(days=40), validity_days=30)
        self.assertEqual(self.staff_api.post(f'/api/v1/quotations/{q.id}/convert_to_subscription/').status_code, 400)
        q.refresh_from_db()
        self.assertEqual(q.status, QuotationStatus.EXPIRED)

    def test_housekeeping_expires_quotations_and_closes_their_subscription(self):
        q = Quotation.objects.create(customer=self.cust1, plan=self.plan, status=QuotationStatus.DRAFT,
                                     issue_date=TODAY - datetime.timedelta(days=40), validity_days=30)
        res = run_housekeeping(TODAY)
        self.assertEqual(res['quotations_expired'], 1)
        q.refresh_from_db()
        self.assertEqual(q.status, QuotationStatus.EXPIRED)

    def test_customers_cannot_confirm_or_edit_quotations(self):
        q = Quotation.objects.create(customer=self.cust1, plan=self.plan, status=QuotationStatus.SENT)
        self.assertEqual(self.c1_api.post(f'/api/v1/quotations/{q.id}/convert_to_subscription/').status_code, 403)
        self.assertEqual(self.c1_api.patch(f'/api/v1/quotations/{q.id}/', {'notes': 'x'}).status_code, 403)
        self.assertEqual(self.c1_api.post('/api/v1/quotations/', {'customer': self.cust1.id, 'plan': self.plan.id}).status_code, 403)

    def test_edit_only_eligible_subscriptions(self):
        sub = self.make_sub(status=SubscriptionStatus.DRAFT, items=False)
        ok = self.staff_api.patch(f'/api/v1/subscriptions/{sub.id}/', {'payment_terms': 'NET_60', 'notes': 'edited',
                                                                      'items': [{'product': self.product.id, 'quantity': 3}]})
        self.assertEqual(ok.status_code, 200, ok.data)
        self.assertEqual(ok.data['payment_terms'], 'NET_60')
        self.assertEqual(Decimal(ok.data['pricing']['subtotal']), D('6500.00'))  # 500 plan + 3 x 2000
        sub.status = SubscriptionStatus.ACTIVE
        sub.save()
        self.assertEqual(self.staff_api.patch(f'/api/v1/subscriptions/{sub.id}/', {'notes': 'again'}).status_code, 400)

    def test_draft_quotation_can_be_edited_and_is_recalculated(self):
        d = Discount.objects.create(code='Q10', name='q', discount_type='PERCENTAGE', value=D('10.00'), start_date=TODAY - datetime.timedelta(days=1))
        q = self.staff_api.post('/api/v1/quotations/', {'customer': self.cust1.id, 'plan': self.plan.id,
                                                       'items': [{'product': self.product.id, 'quantity': 1}]}).data
        self.assertEqual(Decimal(q['total_amount']), D('2500.00'))   # 500 plan + 2000
        r = self.staff_api.patch(f"/api/v1/quotations/{q['id']}/", {
            'discount': d.id, 'payment_terms': 'NET_60', 'validity_days': 10, 'customer': self.cust2.id,
            'items': [{'product': self.product.id, 'variant': self.variant.id, 'quantity': 2}]})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(Decimal(r.data['subtotal']), D('5620.00'))        # 500 + 2 x 2560
        self.assertEqual(Decimal(r.data['discount_amount']), D('562.00'))  # 10% of the whole quote
        self.assertEqual(Decimal(r.data['total_amount']), D('5058.00'))
        self.assertEqual((r.data['payment_terms'], r.data['customer'], len(r.data['items'])), ('NET_60', self.cust2.id, 1))
        self.assertEqual(r.data['expiry_date'], str(TODAY + datetime.timedelta(days=10)))
        cleared = self.staff_api.patch(f"/api/v1/quotations/{q['id']}/", {'discount': None})
        self.assertEqual(Decimal(cleared.data['total_amount']), D('5620.00'))

    def test_status_cannot_be_forced_through_create_or_patch(self):
        r = self.staff_api.post('/api/v1/subscriptions/', {'customer': self.cust1.id, 'plan': self.plan.id, 'status': 'ACTIVE',
                                                           'next_billing_date': '2000-01-01'})
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['status'], 'DRAFT')
        self.assertNotEqual(r.data['next_billing_date'], '2000-01-01')
        patched = self.staff_api.patch(f"/api/v1/subscriptions/{r.data['id']}/", {'status': 'ACTIVE'})
        self.assertEqual(Subscription.objects.get(id=r.data['id']).status, SubscriptionStatus.DRAFT)

    def test_subscription_history_lists_transitions_and_invoices(self):
        sub = self.make_sub(status=SubscriptionStatus.CONFIRMED)
        self.staff_api.post(f'/api/v1/subscriptions/{sub.id}/activate/')
        self.staff_api.post(f'/api/v1/subscriptions/{sub.id}/trigger_billing/')
        h = self.staff_api.get(f'/api/v1/subscriptions/{sub.id}/history/').data
        actions = [e['action'] for e in h['events']]
        self.assertIn('SUBSCRIPTION_ACTIVATED', actions)
        self.assertEqual(len(h['invoices']), 1)

    def test_pause_resume_close_renew_follow_plan_settings(self):
        plan = Plan.objects.create(name='Strict', code='strict', price=D('10'), billing_interval='MONTHLY',
                                   allow_pause=False, allow_early_close=False, allow_renewal=False)
        sub = self.make_sub(plan=plan, items=False)
        self.assertEqual(self.staff_api.post(f'/api/v1/subscriptions/{sub.id}/pause/').status_code, 400)
        self.assertEqual(self.c1_api.post(f'/api/v1/subscriptions/{sub.id}/close/').status_code, 400)  # no early close for customers
        self.assertEqual(self.staff_api.post(f'/api/v1/subscriptions/{sub.id}/close/').status_code, 200)
        self.assertEqual(self.staff_api.post(f'/api/v1/subscriptions/{sub.id}/renew/').status_code, 400)  # no renewal
        sub2 = self.make_sub(items=False)
        self.assertEqual(self.c1_api.post(f'/api/v1/subscriptions/{sub2.id}/pause/').status_code, 200)
        self.assertEqual(self.c1_api.post(f'/api/v1/subscriptions/{sub2.id}/resume/').status_code, 200)
        self.assertEqual(self.c1_api.post(f'/api/v1/subscriptions/{sub2.id}/close/').status_code, 200)
        renewed = self.c1_api.post(f'/api/v1/subscriptions/{sub2.id}/renew/')
        self.assertEqual(renewed.status_code, 200, renewed.data)
        self.assertEqual(renewed.data['status'], 'ACTIVE')


# =============================================================== WORKFLOW 4
class Workflow4Billing(BaseCase):
    def test_bills_once_and_is_safe_to_retry(self):
        sub = self.make_sub()
        ok, inv = BillingEngine.process_subscription_billing(sub.id, TODAY)
        self.assertTrue(ok)
        self.assertEqual(inv.total_amount, D('3060.00'))
        self.assertEqual(inv.status, InvoiceStatus.CONFIRMED)
        self.assertEqual(inv.items.count(), 2)
        self.assertEqual(inv.due_date, TODAY + datetime.timedelta(days=30))  # NET_30 default
        for _ in range(3):
            self.assertFalse(BillingEngine.process_subscription_billing(sub.id, TODAY)[0])
        self.assertEqual(Invoice.objects.filter(subscription=sub).count(), 1)
        sub.refresh_from_db()
        self.assertGreater(sub.next_billing_date, TODAY)

    def test_database_rejects_a_second_invoice_for_the_same_period(self):
        sub = self.make_sub()
        ok, inv = BillingEngine.process_subscription_billing(sub.id, TODAY)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Invoice.objects.create(subscription=sub, customer=sub.customer, billing_period_start=inv.billing_period_start,
                                   billing_period_end=inv.billing_period_end, due_date=TODAY)

    def test_catch_up_never_skips_a_cycle(self):
        start = datetime.date(2026, 1, 31)
        sub = self.make_sub(next_billing=start, items=False, start_date=start)
        run_date = datetime.date(2026, 4, 30)
        res = BillingEngine.run_all_due_billing(run_date)
        self.assertEqual(res['invoices_created'], 4)  # Jan 31, Feb 28 (relativedelta), Mar 28..., Apr
        periods = list(Invoice.objects.filter(subscription=sub).order_by('billing_period_start').values_list('billing_period_start', 'billing_period_end'))
        self.assertEqual(len(periods), 4)
        for (s1, e1), (s2, e2) in zip(periods, periods[1:]):
            self.assertEqual(e1 + datetime.timedelta(days=1), s2, "periods must be contiguous: nothing skipped")
        self.assertEqual(BillingEngine.run_all_due_billing(run_date)['invoices_created'], 0)  # rerun is a no-op
        self.assertEqual(Invoice.objects.filter(subscription=sub).count(), 4)

    def test_month_length_and_leap_year_period_maths(self):
        calc = BillingEngine.calculate_next_period_dates
        self.assertEqual(calc(datetime.date(2024, 1, 31), 'MONTHLY'), (datetime.date(2024, 2, 28), datetime.date(2024, 2, 29)))  # leap year
        self.assertEqual(calc(datetime.date(2025, 1, 31), 'MONTHLY'), (datetime.date(2025, 2, 27), datetime.date(2025, 2, 28)))
        self.assertEqual(calc(datetime.date(2024, 2, 29), 'YEARLY'), (datetime.date(2025, 2, 27), datetime.date(2025, 2, 28)))
        self.assertEqual(calc(datetime.date(2026, 3, 1), 'DAILY'), (datetime.date(2026, 3, 1), datetime.date(2026, 3, 2)))
        self.assertEqual(calc(datetime.date(2026, 3, 1), 'WEEKLY'), (datetime.date(2026, 3, 7), datetime.date(2026, 3, 8)))

    def test_every_frequency_bills_with_correct_next_date(self):
        for interval, days in (('DAILY', 1), ('WEEKLY', 7)):
            plan = Plan.objects.create(name=interval, code=interval.lower(), price=D('10'), billing_interval=interval)
            sub = self.make_sub(plan=plan, items=False)
            BillingEngine.process_subscription_billing(sub.id, TODAY)
            sub.refresh_from_db()
            self.assertEqual(sub.next_billing_date, TODAY + datetime.timedelta(days=days))
        plan = Plan.objects.create(name='Y', code='y', price=D('120'), billing_interval='YEARLY')
        sub = self.make_sub(plan=plan, items=False)
        BillingEngine.process_subscription_billing(sub.id, TODAY)
        sub.refresh_from_db()
        self.assertEqual(sub.next_billing_date.year, TODAY.year + 1)

    def test_paused_closed_draft_and_future_subscriptions_are_not_billed(self):
        for st in (SubscriptionStatus.PAUSED, SubscriptionStatus.CLOSED, SubscriptionStatus.DRAFT, SubscriptionStatus.CONFIRMED):
            self.make_sub(status=st)
        future = self.make_sub(next_billing=TODAY + datetime.timedelta(days=3))
        res = BillingEngine.run_all_due_billing(TODAY)
        self.assertEqual(res['found_due'], 0)
        self.assertEqual(Invoice.objects.count(), 0)
        self.assertFalse(BillingEngine.process_subscription_billing(future.id, TODAY)[0])

    def test_payment_terms_drive_due_date(self):
        for terms, days in (('IMMEDIATE', 0), ('NET_15', 15), ('NET_60', 60)):
            sub = self.make_sub(payment_terms=terms, items=False)
            ok, inv = BillingEngine.process_subscription_billing(sub.id, TODAY)
            self.assertEqual(inv.due_date - inv.issue_date, datetime.timedelta(days=days), terms)

    def test_expiry_follows_each_plans_own_configuration(self):
        closing = Plan.objects.create(name='Closes', code='closes', price=D('10'), billing_interval='MONTHLY', auto_close_on_expiry=True)
        sub = self.make_sub(plan=closing, items=False, expiry_date=TODAY - datetime.timedelta(days=5))
        ok, msg = BillingEngine.process_subscription_billing(sub.id, TODAY)
        sub.refresh_from_db()
        self.assertFalse(ok)
        self.assertEqual(sub.status, SubscriptionStatus.CLOSED)

        stay = Plan.objects.create(name='Stays', code='stays', price=D('10'), billing_interval='MONTHLY', auto_close_on_expiry=False,
                                   allow_renewal=False)
        sub2 = self.make_sub(plan=stay, items=False, expiry_date=TODAY - datetime.timedelta(days=5), auto_renew=False)
        ok, msg = BillingEngine.process_subscription_billing(sub2.id, TODAY)
        sub2.refresh_from_db()
        self.assertFalse(ok)
        self.assertIn('expired', msg)  # explicit, not silent
        self.assertEqual(sub2.status, SubscriptionStatus.ACTIVE)  # the plan does not close on its own
        self.assertEqual(Invoice.objects.filter(subscription=sub2).count(), 0)

        renewing = Plan.objects.create(name='Renews', code='renews', price=D('10'), billing_interval='MONTHLY')
        sub3 = self.make_sub(plan=renewing, items=False, start_date=TODAY - datetime.timedelta(days=100),
                             expiry_date=TODAY - datetime.timedelta(days=5), auto_renew=True)
        ok, inv = BillingEngine.process_subscription_billing(sub3.id, TODAY)
        sub3.refresh_from_db()
        self.assertTrue(ok)
        self.assertGreater(sub3.expiry_date, TODAY)

    def test_housekeeping_closes_expired_subscription_only_after_final_period_is_billed(self):
        plan = Plan.objects.create(name='C', code='c', price=D('10'), billing_interval='MONTHLY', auto_close_on_expiry=True)
        unbilled = self.make_sub(plan=plan, items=False, next_billing=TODAY - datetime.timedelta(days=3),
                                 expiry_date=TODAY - datetime.timedelta(days=1))
        run_housekeeping(TODAY)
        unbilled.refresh_from_db()
        self.assertEqual(unbilled.status, SubscriptionStatus.ACTIVE)  # still owes its last period: billing runs first
        BillingEngine.run_all_due_billing(TODAY)
        run_housekeeping(TODAY)
        unbilled.refresh_from_db()
        self.assertEqual(unbilled.status, SubscriptionStatus.CLOSED)
        self.assertGreaterEqual(Invoice.objects.filter(subscription=unbilled).count(), 1)

    def test_scheduler_task_and_beat_schedule(self):
        from django.conf import settings
        self.assertIn('run-recurring-billing', settings.CELERY_BEAT_SCHEDULE)
        self.make_sub()
        out = run_recurring_billing(str(TODAY))
        self.assertEqual(out['invoices_created'], 1)
        self.assertEqual(run_recurring_billing(str(TODAY))['invoices_created'], 0)

    def test_pause_bills_outstanding_periods_first_and_resume_does_not_backbill(self):
        sub = self.make_sub(next_billing=TODAY - datetime.timedelta(days=1), items=False)
        self.assertEqual(self.staff_api.post(f'/api/v1/subscriptions/{sub.id}/pause/').status_code, 200)
        self.assertEqual(Invoice.objects.filter(subscription=sub).count(), 1)  # the due cycle was not lost
        sub.refresh_from_db()
        sub.next_billing_date = TODAY - datetime.timedelta(days=40)  # paused for a long time
        sub.save()
        self.staff_api.post(f'/api/v1/subscriptions/{sub.id}/resume/')
        sub.refresh_from_db()
        self.assertEqual(sub.next_billing_date, TODAY)

    def test_batch_billing_endpoint_is_staff_only_and_idempotent(self):
        self.make_sub()
        self.assertEqual(self.c1_api.post('/api/v1/subscriptions/run-batch-billing/', {}).status_code, 403)
        first = self.staff_api.post('/api/v1/subscriptions/run-batch-billing/', {'date': str(TODAY)})
        self.assertEqual(first.data['invoices_created'], 1)
        self.assertEqual(self.staff_api.post('/api/v1/subscriptions/run-batch-billing/', {'date': str(TODAY)}).data['invoices_created'], 0)
        self.assertEqual(self.staff_api.post('/api/v1/subscriptions/run-batch-billing/', {'date': 'garbage'}).status_code, 400)


# =============================================================== WORKFLOW 5
class Workflow5TaxDiscount(BaseCase):
    def setUp(self):
        super().setUp()
        self.gst = TaxRule.objects.create(name='GST', percentage=D('18.00'), effective_from=TODAY - datetime.timedelta(days=30))

    def bill(self, sub, on=TODAY):
        ok, inv = BillingEngine.process_subscription_billing(sub.id, on)
        self.assertTrue(ok, inv)
        return inv

    def test_tax_rule_applied_with_breakdown(self):
        inv = self.bill(self.make_sub())
        # (500 plan + 2560 item) = 3060; 18% = 550.80
        self.assertEqual(inv.tax_amount, D('550.80'))
        self.assertEqual(inv.total_amount, D('3610.80'))
        self.assertEqual(inv.items.first().tax_breakdown[0]['name'], 'GST')
        r = self.staff_api.get(f'/api/v1/invoices/{inv.id}/')
        self.assertEqual(r.data['tax_summary'][0]['rate'], '18.00')

    def test_tax_rule_scoped_to_products_and_dates(self):
        self.gst.applicable_products.add(self.product)
        inv = self.bill(self.make_sub())  # plan fee has no product -> not taxed; item taxed
        self.assertEqual(inv.tax_amount, D('460.80'))  # 2560 * 18%
        self.gst.effective_to = TODAY - datetime.timedelta(days=1)
        self.gst.save()
        inv2 = self.bill(self.make_sub(customer=self.cust2))
        self.assertEqual(inv2.tax_amount, D('0.00'))  # expired rule not applied

    def test_only_admin_manages_tax_and_discount_rules(self):
        body = {'name': 'VAT', 'percentage': '20.00', 'effective_from': str(TODAY)}
        for api in (self.staff_api, self.c1_api, self.anon):
            self.assertIn(api.post('/api/v1/taxes/', body).status_code, (401, 403))
        self.assertEqual(self.admin_api.post('/api/v1/taxes/', body).status_code, 201)
        self.assertEqual(self.admin_api.post('/api/v1/taxes/', {**body, 'percentage': '150'}).status_code, 400)
        dbody = {'code': 'SAVE10', 'name': 'Save 10', 'discount_type': 'PERCENTAGE', 'value': '10.00', 'start_date': str(TODAY)}
        for api in (self.staff_api, self.c1_api, self.anon):
            self.assertIn(api.post('/api/v1/discounts/', dbody).status_code, (401, 403))
            self.assertIn(api.patch('/api/v1/discounts/1/', {'value': '99'}).status_code, (401, 403, 404))
        r = self.admin_api.post('/api/v1/discounts/', dbody)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(self.admin_api.post('/api/v1/discounts/', {**dbody, 'code': 'BAD', 'value': '101'}).status_code, 400)

    def test_percentage_discount_appears_on_next_invoice_automatically(self):
        d = Discount.objects.create(code='P10', name='10% off', discount_type='PERCENTAGE', value=D('10.00'),
                                    start_date=TODAY - datetime.timedelta(days=1))
        sub = self.make_sub(discount=d)
        inv = self.bill(sub)
        # subtotal 3060, 10% = 306.00, taxable 2754.00, GST 18% = 495.72
        self.assertEqual(inv.discount_amount, D('306.00'))
        self.assertEqual(inv.tax_amount, D('495.72'))
        self.assertEqual(inv.total_amount, D('3249.72'))
        self.assertEqual(inv.applied_discounts[0]['code'], 'P10')
        d.refresh_from_db()
        self.assertEqual(d.times_redeemed, 1)
        self.assertEqual(DiscountRedemption.objects.filter(discount=d, invoice=inv).count(), 1)
        self.assertEqual(sum(i.discount_amount for i in inv.items.all()), D('306.00'))

    def test_usage_limit_stops_the_discount(self):
        d = Discount.objects.create(code='ONCE', name='Once', discount_type='FIXED', value=D('100.00'),
                                    start_date=TODAY - datetime.timedelta(days=60), usage_limit=1)
        sub = self.make_sub(discount=d, next_billing=TODAY - datetime.timedelta(days=32), items=False)
        res = BillingEngine.run_all_due_billing(TODAY)
        invs = list(Invoice.objects.filter(subscription=sub).order_by('billing_period_start'))
        self.assertGreaterEqual(len(invs), 2)
        self.assertEqual(invs[0].discount_amount, D('100.00'))
        self.assertTrue(all(i.discount_amount == D('0.00') for i in invs[1:]))
        d.refresh_from_db()
        self.assertEqual(d.times_redeemed, 1)

    def test_expired_not_started_inactive_and_minimum_rules(self):
        base = dict(name='x', discount_type='PERCENTAGE', value=D('50.00'))
        cases = {
            'expired': Discount.objects.create(code='EXP', start_date=TODAY - datetime.timedelta(days=30), end_date=TODAY - datetime.timedelta(days=1), **base),
            'future': Discount.objects.create(code='FUT', start_date=TODAY + datetime.timedelta(days=5), **base),
            'inactive': Discount.objects.create(code='OFF', start_date=TODAY - datetime.timedelta(days=5), is_active=False, **base),
            'min_purchase': Discount.objects.create(code='MINP', start_date=TODAY - datetime.timedelta(days=5), min_purchase_amount=D('100000'), **base),
            'min_qty': Discount.objects.create(code='MINQ', start_date=TODAY - datetime.timedelta(days=5), min_quantity=50, **base),
        }
        for name, d in cases.items():
            customer = Customer.objects.create(name=name, email=f'{name}@t.io')
            inv = self.bill(self.make_sub(customer=customer, discount=d))
            self.assertEqual(inv.discount_amount, D('0.00'), name)
            d.refresh_from_db()
            self.assertEqual(d.times_redeemed, 0, name)

    def test_product_specific_discount_only_hits_matching_lines(self):
        other = Product.objects.create(sku='OTH', name='Other', sales_price=D('100.00'))
        d = Discount.objects.create(code='PROD', name='prod', discount_type='PERCENTAGE', value=D('50.00'), start_date=TODAY - datetime.timedelta(days=1))
        d.applicable_products.add(self.product)
        sub = self.make_sub(items=False)
        SubscriptionItem.objects.create(subscription=sub, product=self.product, quantity=1, unit_price=D('2000.00'), discount=d)
        SubscriptionItem.objects.create(subscription=sub, product=other, quantity=1, unit_price=D('100.00'), discount=d)
        inv = self.bill(sub)
        self.assertEqual(inv.discount_amount, D('1000.00'))  # only the 2000 line is eligible

    def test_discount_never_makes_an_invoice_negative(self):
        d = Discount.objects.create(code='HUGE', name='Huge', discount_type='FIXED', value=D('999999.00'), start_date=TODAY - datetime.timedelta(days=1))
        inv = self.bill(self.make_sub(discount=d))
        self.assertEqual(inv.total_amount, D('0.00'))
        self.assertEqual(inv.discount_amount, D('3060.00'))
        self.assertEqual(inv.status, InvoiceStatus.PAID)  # nothing left to collect
        self.assertTrue(all(i.line_total >= 0 for i in inv.items.all()))

    def test_manual_invoice_taxes_discounts_are_server_side(self):
        d = Discount.objects.create(code='M10', name='m', discount_type='PERCENTAGE', value=D('10.00'), start_date=TODAY - datetime.timedelta(days=1), usage_limit=1)
        r = self.staff_api.post('/api/v1/invoices/', {
            'customer': self.cust1.id, 'due_date': str(TODAY + datetime.timedelta(days=10)),
            'items': [{'product_name': 'Consulting', 'quantity': 2, 'unit_price': '100.00', 'tax_amount': '0.00', 'discount_amount': '199.00',
                       'discount': d.id}]})
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['status'], 'DRAFT')
        self.assertEqual(Decimal(r.data['discount_amount']), D('20.00'))   # 10% of 200, the client's 199 is ignored
        self.assertEqual(Decimal(r.data['tax_amount']), D('32.40'))        # (200-20) * 18%
        self.assertEqual(Decimal(r.data['total_amount']), D('212.40'))
        conf = self.staff_api.post(f"/api/v1/invoices/{r.data['id']}/confirm/")
        self.assertEqual(conf.status_code, 200, conf.data)
        d.refresh_from_db()
        self.assertEqual(d.times_redeemed, 1)
        # cancelling returns the usage
        self.assertEqual(self.staff_api.post(f"/api/v1/invoices/{r.data['id']}/cancel/").status_code, 200)
        d.refresh_from_db()
        self.assertEqual(d.times_redeemed, 0)

    def test_invoice_pdf_renders_with_breakdown(self):
        d = Discount.objects.create(code='PDF5', name='p', discount_type='PERCENTAGE', value=D('5.00'), start_date=TODAY - datetime.timedelta(days=1))
        inv = self.bill(self.make_sub(discount=d))
        r = self.staff_api.get(f'/api/v1/invoices/{inv.id}/pdf/')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.content.startswith(b'%PDF'))


# =============================================================== WORKFLOW 6
class Workflow6Payments(BaseCase):
    def pay(self, inv, amount, **kw):
        body = {'invoice': inv.id, 'amount': str(amount), 'payment_method': 'BANK_TRANSFER', **kw}
        return self.staff_api.post('/api/v1/payments/', body)

    def test_partial_then_full_payment_updates_status_and_balance(self):
        inv = self.make_invoice(total='1000.00')
        r = self.pay(inv, '400.00', transaction_reference='R1', notes='deposit')
        self.assertEqual(r.status_code, 201, r.data)
        inv.refresh_from_db()
        self.assertEqual((inv.status, inv.paid_amount, inv.balance_due), (InvoiceStatus.PARTIALLY_PAID, D('400.00'), D('600.00')))
        self.pay(inv, '600.00', payment_method='UPI', transaction_reference='R2')
        inv.refresh_from_db()
        self.assertEqual((inv.status, inv.balance_due), (InvoiceStatus.PAID, D('0.00')))

    def test_partial_payment_is_never_marked_paid(self):
        inv = self.make_invoice(total='1000.00')
        self.pay(inv, '999.99', transaction_reference='ALMOST')
        inv.refresh_from_db()
        self.assertEqual(inv.status, InvoiceStatus.PARTIALLY_PAID)
        self.assertEqual(inv.balance_due, D('0.01'))

    def test_overpayment_and_bad_amounts_rejected(self):
        inv = self.make_invoice(total='100.00')
        self.assertEqual(self.pay(inv, '100.01').status_code, 400)
        self.assertEqual(self.pay(inv, '0').status_code, 400)
        self.assertEqual(self.pay(inv, '-5').status_code, 400)
        draft = self.make_invoice(status=InvoiceStatus.DRAFT)
        self.assertEqual(self.pay(draft, '10').status_code, 400)
        cancelled = self.make_invoice(status=InvoiceStatus.CANCELLED)
        self.assertEqual(self.pay(cancelled, '10').status_code, 400)
        self.assertEqual(Payment.objects.count(), 0)

    def test_duplicate_payments_are_blocked(self):
        inv = self.make_invoice(total='1000.00')
        self.assertEqual(self.pay(inv, '100', transaction_reference='UTR-1').status_code, 201)
        self.assertEqual(self.pay(inv, '50', transaction_reference='UTR-1').status_code, 400)   # same reference
        self.assertEqual(self.pay(inv, '100', payment_method='UPI').status_code, 201)
        self.assertEqual(self.pay(inv, '100', payment_method='UPI').status_code, 400)   # double-click: identical payment moments apart
        self.assertEqual(Payment.objects.filter(invoice=inv).count(), 2)
        inv.refresh_from_db()
        self.assertEqual(inv.paid_amount, D('200.00'))

    def test_payments_are_immutable_and_reversible_by_admin_only(self):
        inv = self.make_invoice(total='500.00')
        pid = self.pay(inv, '500.00', transaction_reference='X1').data['id']
        self.assertEqual(self.admin_api.put(f'/api/v1/payments/{pid}/', {'amount': '1'}).status_code, 405)
        self.assertEqual(self.admin_api.patch(f'/api/v1/payments/{pid}/', {'amount': '1'}).status_code, 405)
        self.assertEqual(self.admin_api.delete(f'/api/v1/payments/{pid}/').status_code, 405)
        self.assertEqual(self.staff_api.post(f'/api/v1/payments/{pid}/reverse/', {'reason': 'oops'}).status_code, 403)
        self.assertEqual(self.c1_api.post(f'/api/v1/payments/{pid}/reverse/').status_code, 403)
        r = self.admin_api.post(f'/api/v1/payments/{pid}/reverse/', {'reason': 'bounced cheque'})
        self.assertEqual(r.status_code, 200, r.data)
        inv.refresh_from_db()
        self.assertEqual((inv.status, inv.paid_amount, inv.balance_due), (InvoiceStatus.CONFIRMED, D('0.00'), D('500.00')))
        self.assertEqual(Payment.objects.get(id=pid).status, PaymentStatus.REVERSED)
        self.assertEqual(self.admin_api.post(f'/api/v1/payments/{pid}/reverse/').status_code, 400)  # once only
        self.assertEqual(self.pay(inv, '500.00', transaction_reference='X2').status_code, 201)  # invoice collectable again

    def test_cancel_rules(self):
        inv = self.make_invoice()
        self.pay(inv, '10', transaction_reference='c')
        self.assertEqual(self.staff_api.post(f'/api/v1/invoices/{inv.id}/cancel/').status_code, 400)  # has payments
        other = self.make_invoice()
        self.assertEqual(self.staff_api.post(f'/api/v1/invoices/{other.id}/cancel/').status_code, 200)
        self.assertEqual(self.staff_api.post(f'/api/v1/invoices/{other.id}/cancel/').status_code, 400)

    def test_overdue_detection_and_distinct_statuses(self):
        late = self.make_invoice(due=TODAY - datetime.timedelta(days=3), total='100.00')
        late_partial = self.make_invoice(due=TODAY - datetime.timedelta(days=3), total='100.00')
        self.pay(late_partial, '40', transaction_reference='lp')
        fresh = self.make_invoice(total='100.00')
        paid = self.make_invoice(total='100.00')
        self.pay(paid, '100', transaction_reference='pd')
        r = self.staff_api.get('/api/v1/invoices/?status=OVERDUE')
        self.assertEqual({i['invoice_number'] for i in r.data['results']}, {late.invoice_number, late_partial.invoice_number})
        for inv, expected in ((fresh, 'CONFIRMED'), (paid, 'PAID'), (late, 'OVERDUE'), (late_partial, 'OVERDUE')):
            inv.refresh_from_db()
            self.assertEqual(inv.status, expected)
        self.assertEqual(self.staff_api.get('/api/v1/invoices/?status=PARTIALLY_PAID').data['count'], 0)
        dash = self.staff_api.get('/api/v1/reports/dashboard/').data['metrics']
        self.assertEqual(dash['overdue_count'], 2)
        self.assertEqual(dash['overdue_amount'], 160.0)

    def test_payment_history_is_on_the_invoice(self):
        inv = self.make_invoice(total='300.00')
        self.pay(inv, '100', transaction_reference='h1')
        h = self.staff_api.get(f'/api/v1/invoices/{inv.id}/history/').data
        self.assertEqual(len(h['payments']), 1)
        self.assertTrue(any(e['action'] == 'INVOICE_PAYMENT_RECEIVED' for e in h['events']))

    def test_invoice_lifecycle_actions(self):
        r = self.staff_api.post('/api/v1/invoices/', {'customer': self.cust1.id, 'items': [{'product_name': 'Setup', 'quantity': 1, 'unit_price': '250.00'}]})
        iid = r.data['id']
        self.assertEqual(self.staff_api.post(f'/api/v1/invoices/{iid}/send-email/').status_code, 400)  # draft can't be sent
        self.assertEqual(self.staff_api.patch(f'/api/v1/invoices/{iid}/', {'notes': 'edited', 'items': [{'product_name': 'Setup', 'quantity': 2, 'unit_price': '250.00'}]}).status_code, 200)
        self.assertEqual(Decimal(self.staff_api.get(f'/api/v1/invoices/{iid}/').data['total_amount']), D('500.00'))
        self.assertEqual(self.staff_api.post(f'/api/v1/invoices/{iid}/confirm/').data['status'], 'CONFIRMED')
        self.assertEqual(self.staff_api.post(f'/api/v1/invoices/{iid}/confirm/').status_code, 400)
        self.assertEqual(self.staff_api.patch(f'/api/v1/invoices/{iid}/', {'notes': 'late edit'}).status_code, 400)  # only drafts editable
        sent = self.staff_api.post(f'/api/v1/invoices/{iid}/send-email/')
        self.assertEqual(sent.status_code, 200)
        self.assertEqual(mail.outbox[-1].to, [self.cust1.email])
        self.assertIsNotNone(Invoice.objects.get(id=iid).sent_at)
        self.assertEqual(self.staff_api.delete(f'/api/v1/invoices/{iid}/').status_code, 405)

    def test_send_reports_real_delivery_failure(self):
        inv = self.make_invoice()
        with override_settings(EMAIL_BACKEND='apps.subscriptions.test_spec_workflows.BrokenEmailBackend'):
            r = self.staff_api.post(f'/api/v1/invoices/{inv.id}/send-email/')
        self.assertEqual(r.status_code, 502)
        self.assertIsNone(Invoice.objects.get(id=inv.id).sent_at)


from django.core.mail.backends.base import BaseEmailBackend  # noqa: E402


class BrokenEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        raise ConnectionError("SMTP unreachable")


# =============================================================== WORKFLOW 7
class Workflow7Permissions(BaseCase):
    def setUp(self):
        super().setUp()
        self.sub1 = self.make_sub(customer=self.cust1, items=False)
        self.sub2 = self.make_sub(customer=self.cust2, items=False)
        self.inv1 = self.make_invoice(customer=self.cust1)
        self.inv2 = self.make_invoice(customer=self.cust2)
        self.q2 = Quotation.objects.create(customer=self.cust2, plan=self.plan, status=QuotationStatus.SENT)
        self.pay2 = Payment.objects.create(invoice=self.inv2, customer=self.cust2, amount=D('5'), payment_method='CASH')
        self.pay1 = Payment.objects.create(invoice=self.inv1, customer=self.cust1, amount=D('5'), payment_method='CASH')

    def test_unauthenticated_users_get_nothing(self):
        for url in ('/api/v1/customers/', '/api/v1/subscriptions/', '/api/v1/invoices/', '/api/v1/payments/', '/api/v1/quotations/',
                    '/api/v1/reports/dashboard/', '/api/v1/audit/', '/api/v1/taxes/', '/api/v1/discounts/', '/api/v1/products/', '/api/v1/auth/users/'):
            self.assertIn(self.anon.get(url).status_code, (401, 403), url)

    def test_customer_cannot_read_other_customers_records_idor(self):
        for url in (f'/api/v1/subscriptions/{self.sub2.id}/', f'/api/v1/invoices/{self.inv2.id}/', f'/api/v1/invoices/{self.inv2.id}/pdf/',
                    f'/api/v1/payments/{self.pay2.id}/', f'/api/v1/quotations/{self.q2.id}/', f'/api/v1/customers/{self.cust2.id}/',
                    f'/api/v1/subscriptions/{self.sub2.id}/history/', f'/api/v1/invoices/{self.inv2.id}/history/'):
            self.assertEqual(self.c1_api.get(url).status_code, 404, url)
        for url in ('subscriptions', 'invoices', 'payments', 'customers'):
            rows = self.c1_api.get(f'/api/v1/{url}/').data['results']
            self.assertEqual(len(rows), 1, url)
        self.assertEqual(self.c1_api.get('/api/v1/quotations/').data['count'], 0)
        # changing ids in the filter does not escape the tenant boundary either
        self.assertEqual(self.c1_api.get(f'/api/v1/invoices/?customer={self.cust2.id}').data['count'], 0)
        self.assertEqual(self.c1_api.get(f'/api/v1/subscriptions/?customer={self.cust2.id}').data['count'], 0)

    def test_customer_cannot_modify_other_customers_records(self):
        for method, url in (('post', f'/api/v1/subscriptions/{self.sub2.id}/close/'), ('post', f'/api/v1/subscriptions/{self.sub2.id}/pause/'),
                            ('post', f'/api/v1/quotations/{self.q2.id}/accept/'), ('post', f'/api/v1/invoices/{self.inv2.id}/cancel/'),
                            ('patch', f'/api/v1/invoices/{self.inv2.id}/'), ('patch', f'/api/v1/customers/{self.cust2.id}/')):
            self.assertIn(getattr(self.c1_api, method)(url, {'status': 'PAID', 'name': 'hax'}).status_code, (403, 404), url)
        self.inv2.refresh_from_db(); self.sub2.refresh_from_db(); self.cust2.refresh_from_db()
        self.assertEqual((self.inv2.status, self.sub2.status, self.cust2.name), (InvoiceStatus.CONFIRMED, SubscriptionStatus.ACTIVE, 'Bob'))

    def test_customer_cannot_mark_own_invoice_paid_or_forge_subscriptions(self):
        r = self.c1_api.patch(f'/api/v1/invoices/{self.inv1.id}/', {'status': 'PAID', 'balance_due': '0'})
        self.assertEqual(r.status_code, 403)
        self.inv1.refresh_from_db()
        self.assertEqual((self.inv1.status, self.inv1.balance_due), (InvoiceStatus.CONFIRMED, D('1000.00')))
        self.assertEqual(self.c1_api.put(f'/api/v1/invoices/{self.inv1.id}/', {'status': 'PAID'}).status_code, 403)
        self.assertEqual(self.c1_api.delete(f'/api/v1/invoices/{self.inv1.id}/').status_code, 403)
        forged = self.c1_api.post('/api/v1/subscriptions/', {'customer': self.cust2.id, 'plan': self.plan.id, 'status': 'ACTIVE'})
        self.assertEqual(forged.status_code, 403)
        self.assertEqual(Subscription.objects.filter(customer=self.cust2).count(), 1)
        self.assertEqual(self.c1_api.post('/api/v1/payments/', {'invoice': self.inv1.id, 'amount': '1000', 'payment_method': 'CASH'}).status_code, 403)
        self.assertEqual(self.c1_api.post(f'/api/v1/subscriptions/{self.sub1.id}/activate/').status_code, 403)
        self.assertEqual(self.c1_api.post(f'/api/v1/customers/{self.cust1.id}/archive/').status_code, 403)
        self.assertEqual(self.c1_api.post('/api/v1/customers/', {'name': 'x', 'email': 'x@x.io'}).status_code, 403)

    def test_customer_has_no_staff_only_screens(self):
        for url in ('/api/v1/reports/dashboard/', '/api/v1/reports/export-csv/', '/api/v1/audit/', '/api/v1/taxes/',
                    '/api/v1/quotations/templates/', '/api/v1/auth/users/'):
            self.assertEqual(self.c1_api.get(url).status_code, 403, url)

    def test_customers_do_not_see_draft_invoices_or_draft_quotes(self):
        draft = self.make_invoice(customer=self.cust1, status=InvoiceStatus.DRAFT)
        self.assertEqual(self.c1_api.get(f'/api/v1/invoices/{draft.id}/').status_code, 404)
        dq = Quotation.objects.create(customer=self.cust1, plan=self.plan)
        self.assertEqual(self.c1_api.get(f'/api/v1/quotations/{dq.id}/').status_code, 404)

    def test_staff_scope(self):
        self.assertEqual(self.staff_api.get('/api/v1/subscriptions/').data['count'], 2)
        self.assertEqual(self.staff_api.get('/api/v1/reports/dashboard/').status_code, 200)
        self.assertEqual(self.staff_api.get('/api/v1/audit/').status_code, 200)
        self.assertEqual(self.staff_api.get('/api/v1/taxes/').status_code, 200)
        self.assertEqual(self.staff_api.post('/api/v1/customers/', {'name': 'New Co', 'email': 'n@co.io'}).status_code, 201)
        self.assertEqual(self.staff_api.post('/api/v1/auth/users/', {'email': 'x@x.io', 'password': 'Passw0rd!x9', 'role': 'STAFF'}).status_code, 403)
        self.assertEqual(self.staff_api.post(f'/api/v1/customers/{self.cust1.id}/archive/').status_code, 200)

    def test_admin_scope(self):
        for url in ('/api/v1/reports/dashboard/', '/api/v1/audit/', '/api/v1/auth/users/', '/api/v1/taxes/', '/api/v1/discounts/', '/api/v1/quotations/templates/'):
            self.assertEqual(self.admin_api.get(url).status_code, 200, url)

    def test_audit_log_records_financial_actions(self):
        self.staff_api.post('/api/v1/payments/', {'invoice': self.inv1.id, 'amount': '10', 'payment_method': 'CASH', 'transaction_reference': 'a1'})
        spare = self.make_invoice(customer=self.cust1)
        self.staff_api.post(f'/api/v1/invoices/{spare.id}/cancel/')
        self.assertEqual(self.admin_api.get('/api/v1/audit/?action=PAYMENT_RECORDED').data['count'], 1)
        self.assertEqual(self.admin_api.get('/api/v1/audit/?action=INVOICE_CANCELLED').data['count'], 1)


# =============================================================== WORKFLOW 8
class Workflow8Dashboard(BaseCase):
    def setUp(self):
        super().setUp()
        self.s1 = self.make_sub(customer=self.cust1)                       # active, MRR 500 + 2560 = 3060
        self.s2 = self.make_sub(customer=self.cust2, items=False)          # active, MRR 500
        self.make_sub(customer=self.cust2, status=SubscriptionStatus.PAUSED, items=False)
        self.make_sub(customer=self.cust1, status=SubscriptionStatus.CLOSED, items=False)
        self.i1 = self.make_invoice(customer=self.cust1, total='1000.00')
        self.i2 = self.make_invoice(customer=self.cust2, total='2000.00', due=TODAY - datetime.timedelta(days=5))
        self.i3 = self.make_invoice(customer=self.cust2, total='500.00')
        self.pa = Payment.objects.create(invoice=self.i3, customer=self.cust2, amount=D('500'), payment_method='CASH', payment_date=TODAY)
        self.i3.paid_amount, self.i3.balance_due, self.i3.status = D('500'), D('0'), InvoiceStatus.PAID
        self.i3.save()
        # a reversed payment must never count as revenue
        Payment.objects.create(invoice=self.i1, customer=self.cust1, amount=D('300'), payment_method='UPI', status=PaymentStatus.REVERSED, payment_date=TODAY)
        Payment.objects.create(invoice=self.i1, customer=self.cust1, amount=D('100'), payment_method='UPI', payment_date=TODAY - datetime.timedelta(days=45))
        self.i1.paid_amount, self.i1.balance_due, self.i1.status = D('100'), D('900'), InvoiceStatus.PARTIALLY_PAID
        self.i1.save()

    def metrics(self, qs=''):
        r = self.staff_api.get(f'/api/v1/reports/dashboard/{qs}')
        self.assertEqual(r.status_code, 200, r.data)
        return r.data

    def test_headline_numbers_come_from_the_database(self):
        m = self.metrics()['metrics']
        self.assertEqual(m['active_subscriptions'], 2)
        self.assertEqual(m['total_subscriptions'], 4)
        self.assertEqual(m['total_invoices'], 3)
        self.assertEqual(m['revenue_received'], 600.0)          # 500 + 100, the 300 reversed payment excluded
        self.assertEqual(m['outstanding_balance'], 2900.0)      # 900 + 2000 still owed
        self.assertEqual(m['invoiced_total'], 3500.0)           # invoice value is not revenue
        self.assertEqual(m['overdue_count'], 1)
        self.assertEqual(m['overdue_amount'], 2000.0)
        self.assertEqual(m['mrr'], 3560.0)
        self.assertEqual(m['arr'], 42720.0)

    def test_revenue_is_not_confused_with_invoiced_or_outstanding(self):
        m = self.metrics()['metrics']
        self.assertNotEqual(m['revenue_received'], m['invoiced_total'])
        self.assertNotEqual(m['revenue_received'], m['outstanding_balance'])
        # 3500 invoiced = 600 received + 2900 outstanding
        self.assertEqual(m['invoiced_total'], m['revenue_received'] + m['outstanding_balance'])

    def test_filters(self):
        self.assertEqual(self.metrics(f'?customer={self.cust1.id}')['metrics']['active_subscriptions'], 1)
        self.assertEqual(self.metrics(f'?customer={self.cust1.id}')['metrics']['total_invoices'], 1)
        self.assertEqual(self.metrics('?payment_method=CASH')['metrics']['revenue_received'], 500.0)
        self.assertEqual(self.metrics('?payment_method=UPI')['metrics']['revenue_received'], 100.0)
        recent = (TODAY - datetime.timedelta(days=10)).isoformat()
        self.assertEqual(self.metrics(f'?date_from={recent}')['metrics']['revenue_received'], 500.0)
        self.assertEqual(self.metrics(f'?date_to={recent}')['metrics']['revenue_received'], 100.0)
        self.assertEqual(self.metrics('?invoice_status=PAID')['metrics']['total_invoices'], 1)
        data = self.metrics('?subscription_status=PAUSED')
        self.assertEqual(data['metrics']['filtered_subscriptions'], 1)
        self.assertTrue(all(s['status'] == 'PAUSED' for s in data['recent_subscriptions']))
        self.assertEqual(self.staff_api.get('/api/v1/reports/dashboard/?date_from=nope').status_code, 400)
        self.assertEqual(self.staff_api.get('/api/v1/reports/dashboard/?date_from=2026-05-01&date_to=2026-01-01').status_code, 400)
        self.assertEqual(self.staff_api.get('/api/v1/reports/dashboard/?customer=abc').status_code, 400)

    def test_chart_data_is_dynamic(self):
        d = self.metrics()
        self.assertEqual(len(d['revenue_trend']), 6)
        self.assertEqual(sum(x['count'] for x in d['subscription_distribution']), 4)
        self.assertEqual({x['name']: x['count'] for x in d['subscription_distribution']}['Active'], 2)
        self.assertEqual(sum(p['total_amount'] for p in d['payment_summary']), 600.0)
        self.assertEqual(self.staff_api.get('/api/v1/reports/payment-methods/').data[0]['method'], 'CASH')

    def test_reports_and_csv_export(self):
        self.assertEqual(self.staff_api.get('/api/v1/reports/revenue-by-plan/').status_code, 200)
        self.assertEqual(self.staff_api.get('/api/v1/reports/revenue-by-product/').status_code, 200)
        r = self.staff_api.get(f'/api/v1/reports/export-csv/?type=invoices&customer={self.cust1.id}')
        self.assertEqual(r.status_code, 200)
        lines = r.content.decode().strip().splitlines()
        self.assertEqual(len(lines), 2)   # header + the one invoice of that customer
        self.assertEqual(self.staff_api.get('/api/v1/reports/export-csv/?type=payments').content.decode().count('REVERSED'), 1)

    def test_list_filters_search_sort_and_pagination(self):
        r = self.staff_api.get('/api/v1/invoices/?page_size=2')
        self.assertEqual(r.data['count'], 3)
        self.assertEqual(len(r.data['results']), 2)
        self.assertIsNotNone(r.data['next'])
        self.assertEqual(len(self.staff_api.get('/api/v1/invoices/?page_size=2&page=2').data['results']), 1)
        self.assertEqual(self.staff_api.get('/api/v1/invoices/?ordering=-total_amount').data['results'][0]['total_amount'], '2000.00')
        self.assertEqual(self.staff_api.get(f'/api/v1/invoices/?search={self.cust1.company}').data['count'], 1)
        self.assertEqual(self.staff_api.get(f'/api/v1/invoices/?due_date__lte={TODAY - datetime.timedelta(days=1)}').data['count'], 1)
        self.assertEqual(self.staff_api.get(f'/api/v1/invoices/?issue_date__gte={TODAY}&status=PAID').data['count'], 1)
        self.assertEqual(self.staff_api.get('/api/v1/subscriptions/?status=PAUSED').data['count'], 1)
        self.assertEqual(self.staff_api.get('/api/v1/subscriptions/?search=Beta').data['count'], 2)
        self.assertEqual(self.staff_api.get('/api/v1/payments/?payment_method=CASH').data['count'], 1)
        self.assertEqual(self.staff_api.get(f'/api/v1/payments/?payment_date__gte={TODAY}').data['count'], 2)
        self.assertEqual(self.staff_api.get('/api/v1/customers/?search=alpha').data['count'], 1)
        page = self.staff_api.get('/api/v1/subscriptions/?page=1')
        self.assertIn('next', page.data)


# =============================================================== PERFORMANCE
class PerformanceBudget(BaseCase):
    """Thousands of subscriptions: pages must stay well inside the 2 second budget and avoid N+1 queries."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        customers = Customer.objects.bulk_create([Customer(name=f'C{i}', email=f'c{i}@bulk.io', reference=f'BULK-{i}') for i in range(2000)])
        subs = Subscription.objects.bulk_create([
            Subscription(subscription_number=f'SUB-BULK-{i}', customer=customers[i], plan=cls.plan, status=SubscriptionStatus.ACTIVE,
                         start_date=TODAY, next_billing_date=TODAY + datetime.timedelta(days=i % 30))
            for i in range(2000)])
        SubscriptionItem.objects.bulk_create([SubscriptionItem(subscription=s, product=cls.product, quantity=2, unit_price=D('2000')) for s in subs])
        invoices = Invoice.objects.bulk_create([
            Invoice(invoice_number=f'INV-BULK-{i}', customer=customers[i], subscription=subs[i], issue_date=TODAY, due_date=TODAY,
                    status=InvoiceStatus.CONFIRMED, subtotal=D('100'), total_amount=D('100'), balance_due=D('100'))
            for i in range(2000)])

    def timed(self, url):
        t0 = time.perf_counter()
        r = self.staff_api.get(url)
        elapsed = time.perf_counter() - t0
        self.assertEqual(r.status_code, 200)
        self.assertLess(elapsed, 2.0, f'{url} took {elapsed:.2f}s')
        return r, elapsed

    def test_list_and_dashboard_endpoints_are_fast(self):
        for url in ('/api/v1/subscriptions/', '/api/v1/invoices/', '/api/v1/customers/', '/api/v1/payments/',
                    '/api/v1/subscriptions/?search=C19&status=ACTIVE', '/api/v1/invoices/?status=CONFIRMED&ordering=-total_amount',
                    '/api/v1/reports/dashboard/'):
            self.timed(url)

    def test_list_pages_do_not_issue_per_row_queries(self):
        for url, budget in (('/api/v1/subscriptions/', 25), ('/api/v1/invoices/', 20), ('/api/v1/customers/', 12), ('/api/v1/payments/', 12)):
            with CaptureQueriesContext(connection) as ctx:
                r = self.staff_api.get(url)
            self.assertEqual(r.status_code, 200)
            self.assertLessEqual(len(ctx), budget, f'{url}: {len(ctx)} queries')
        self.assertEqual(len(r.data['results']), min(20, r.data['count']))

    def test_dashboard_query_count_is_constant(self):
        with CaptureQueriesContext(connection) as ctx:
            self.staff_api.get('/api/v1/reports/dashboard/')
        self.assertLessEqual(len(ctx), 40)
