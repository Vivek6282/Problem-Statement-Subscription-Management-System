import datetime
import re

from django.core import mail
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User, Role
from apps.customers.models import Customer
from apps.invoices.models import Invoice

PASSWORD = 'Brightloop@2026'


def make_user(email, role, **extra):
    is_internal = role in (Role.ADMIN, Role.STAFF)
    return User.objects.create_user(
        email=email, password=PASSWORD, role=role, is_staff=is_internal, **extra
    )


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


class StaffManagementTests(TestCase):
    """Only the admin can see users and create staff accounts."""

    def setUp(self):
        self.admin = make_user('admin@test.io', Role.ADMIN)
        self.staff = make_user('staff@test.io', Role.STAFF)
        self.customer = make_user('customer@test.io', Role.CUSTOMER)
        self.new_staff = {
            'email': 'new.staff@test.io',
            'password': PASSWORD,
            'first_name': 'New',
            'last_name': 'Staff',
            'role': 'STAFF',
        }

    def test_admin_can_list_users(self):
        res = client_for(self.admin).get('/api/v1/auth/users/')
        self.assertEqual(res.status_code, 200)

    def test_staff_and_customer_cannot_list_users(self):
        for user in (self.staff, self.customer):
            res = client_for(user).get('/api/v1/auth/users/')
            self.assertEqual(res.status_code, 403, user.email)

    def test_admin_can_create_staff(self):
        res = client_for(self.admin).post('/api/v1/auth/users/', self.new_staff)
        self.assertEqual(res.status_code, 201)
        created = User.objects.get(email='new.staff@test.io')
        self.assertEqual(created.role, Role.STAFF)
        self.assertTrue(created.check_password(PASSWORD))

    def test_staff_cannot_create_staff(self):
        res = client_for(self.staff).post('/api/v1/auth/users/', self.new_staff)
        self.assertEqual(res.status_code, 403)
        self.assertFalse(User.objects.filter(email='new.staff@test.io').exists())

    def test_staff_endpoint_cannot_create_customers(self):
        res = client_for(self.admin).post(
            '/api/v1/auth/users/', {**self.new_staff, 'role': 'CUSTOMER'}
        )
        self.assertEqual(res.status_code, 400)

    def test_staff_endpoint_enforces_password_policy(self):
        res = client_for(self.admin).post(
            '/api/v1/auth/users/', {**self.new_staff, 'password': 'weakpass'}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn('password', res.data)

    def test_email_must_be_unique(self):
        res = client_for(self.admin).post(
            '/api/v1/auth/users/', {**self.new_staff, 'email': 'STAFF@test.io'}
        )
        self.assertEqual(res.status_code, 400)

    def test_deactivated_user_cannot_log_in(self):
        res = client_for(self.admin).patch(
            f'/api/v1/auth/users/{self.staff.id}/', {'is_active': False}
        )
        self.assertEqual(res.status_code, 200)
        login = APIClient().post(
            '/api/v1/auth/login/', {'email': 'staff@test.io', 'password': PASSWORD}
        )
        self.assertEqual(login.status_code, 400)

    def test_me_reports_role_for_frontend_flags(self):
        # The frontend's isAdmin relies on role only, because staff also have is_staff=True.
        res = client_for(self.staff).get('/api/v1/auth/me/')
        self.assertEqual(res.data['role'], 'STAFF')
        self.assertTrue(res.data['is_staff'])


class SignupEmailTests(TestCase):
    """Each email can belong to only one account, whatever its capitalisation."""

    def signup(self, email):
        return APIClient().post('/api/v1/auth/register/', {
            'email': email,
            'password': PASSWORD,
            'password_confirm': PASSWORD,
            'first_name': 'Case',
            'last_name': 'Test',
        })

    def test_duplicate_email_with_different_case_is_rejected(self):
        self.assertEqual(self.signup('case.test@test.io').status_code, 201)
        res = self.signup('CASE.Test@test.io')
        self.assertEqual(res.status_code, 400)
        self.assertIn('email', res.data)
        self.assertEqual(User.objects.filter(email__iexact='case.test@test.io').count(), 1)


class PasswordResetTests(TestCase):
    """The emailed link resets the password once and only once."""

    def setUp(self):
        self.user = make_user('reset.me@test.io', Role.CUSTOMER, first_name='Reset')
        self.client = APIClient()

    def request_link(self, email='reset.me@test.io'):
        res = self.client.post('/api/v1/auth/password-reset-request/', {'email': email})
        self.assertEqual(res.status_code, 200)
        return res

    def link_params(self):
        body = mail.outbox[-1].body
        match = re.search(r'/reset-password\?uid=([^&\s]+)&token=([^\s]+)', body)
        self.assertIsNotNone(match, body)
        return match.group(1), match.group(2)

    def confirm(self, uid, token, password='NewSecret#2026', confirm=None):
        return self.client.post('/api/v1/auth/password-reset-confirm/', {
            'uid': uid,
            'token': token,
            'new_password': password,
            'new_password_confirm': confirm or password,
        })

    def test_reset_email_links_to_frontend_page(self):
        self.request_link()
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['reset.me@test.io'])
        self.link_params()

    def test_unknown_email_gets_same_response_and_no_email(self):
        known = self.request_link()
        unknown = self.request_link('nobody@test.io')
        self.assertEqual(known.data, unknown.data)
        self.assertEqual(len(mail.outbox), 1)

    def test_valid_link_resets_password(self):
        self.request_link()
        uid, token = self.link_params()
        res = self.confirm(uid, token)
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewSecret#2026'))

    def test_link_works_only_once(self):
        self.request_link()
        uid, token = self.link_params()
        self.assertEqual(self.confirm(uid, token).status_code, 200)
        self.assertEqual(self.confirm(uid, token, 'Another#20266').status_code, 400)

    def test_tampered_token_is_rejected(self):
        self.request_link()
        uid, _ = self.link_params()
        self.assertEqual(self.confirm(uid, 'not-a-real-token').status_code, 400)

    def test_reset_enforces_password_policy_and_match(self):
        self.request_link()
        uid, token = self.link_params()
        self.assertEqual(self.confirm(uid, token, 'weakpass').status_code, 400)
        self.assertEqual(
            self.confirm(uid, token, 'NewSecret#2026', 'Different#2026').status_code, 400
        )
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PASSWORD))


class CustomerIsolationTests(TestCase):
    """Customers only ever see their own records."""

    def setUp(self):
        self.staff = make_user('staff@test.io', Role.STAFF)
        self.alice = make_user('alice@test.io', Role.CUSTOMER)
        self.bob = make_user('bob@test.io', Role.CUSTOMER)
        due = datetime.date.today() + datetime.timedelta(days=30)
        alice_customer = Customer.objects.create(user=self.alice, name='Alice', email=self.alice.email)
        bob_customer = Customer.objects.create(user=self.bob, name='Bob', email=self.bob.email)
        self.alice_invoice = Invoice.objects.create(customer=alice_customer, due_date=due)
        self.bob_invoice = Invoice.objects.create(customer=bob_customer, due_date=due)

    @staticmethod
    def ids(res):
        rows = res.data['results'] if isinstance(res.data, dict) else res.data
        return {row['id'] for row in rows}

    def test_customer_lists_only_own_invoices(self):
        res = client_for(self.alice).get('/api/v1/invoices/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.ids(res), {self.alice_invoice.id})

    def test_customer_cannot_open_another_customers_invoice(self):
        res = client_for(self.alice).get(f'/api/v1/invoices/{self.bob_invoice.id}/')
        self.assertEqual(res.status_code, 404)

    def test_staff_sees_all_invoices(self):
        res = client_for(self.staff).get('/api/v1/invoices/')
        self.assertEqual(self.ids(res), {self.alice_invoice.id, self.bob_invoice.id})

    def test_customer_cannot_list_customers(self):
        res = client_for(self.alice).get('/api/v1/customers/')
        self.assertIn(res.status_code, (403, 200))
        if res.status_code == 200:
            rows = res.data['results'] if isinstance(res.data, dict) else res.data
            self.assertTrue(all(row.get('email') == self.alice.email for row in rows))

    def test_signed_out_requests_are_rejected(self):
        res = APIClient().get('/api/v1/invoices/')
        self.assertIn(res.status_code, (401, 403))
