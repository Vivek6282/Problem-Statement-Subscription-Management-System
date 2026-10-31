from django.contrib.auth import get_user_model
from django.contrib.sessions.backends.db import SessionStore
from django.contrib.sessions.models import Session
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import Role

User = get_user_model()
PASSWORD = 'AdminPassword123!'


def make_user(email, role, **extra):
    return User.objects.create_user(email=email, password=PASSWORD, role=role, is_staff=role != Role.CUSTOMER, **extra)


class StaffSafetyTests(TestCase):
    def setUp(self):
        self.admin = make_user('safe-admin@test.com', Role.ADMIN)
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def create_payload(self, **kw):
        data = {'email': 'new@test.com', 'password': 'StrongPass@2026x', 'first_name': 'N', 'last_name': 'U', 'role': Role.ADMIN}
        data.update(kw)
        return data

    def test_created_admin_is_not_a_django_superuser(self):
        res = self.client.post('/api/v1/auth/users/', self.create_payload(), format='json')
        self.assertEqual(res.status_code, 201, res.content)
        created = User.objects.get(email='new@test.com')
        self.assertEqual(created.role, Role.ADMIN)
        self.assertTrue(created.is_staff)
        self.assertFalse(created.is_superuser)
        self.assertTrue(created.is_admin_user)  # still an application admin via the role

    def test_promotion_leaves_superuser_flag_alone(self):
        staff = make_user('promote@test.com', Role.STAFF)
        res = self.client.patch(f'/api/v1/auth/users/{staff.id}/', {'role': Role.ADMIN}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        staff.refresh_from_db()
        self.assertEqual(staff.role, Role.ADMIN)
        self.assertFalse(staff.is_superuser)

    def test_demoting_a_superuser_admin_clears_superuser(self):
        super_admin = make_user('super@test.com', Role.ADMIN, is_superuser=True)
        res = self.client.patch(f'/api/v1/auth/users/{super_admin.id}/', {'role': Role.STAFF}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        super_admin.refresh_from_db()
        self.assertEqual(super_admin.role, Role.STAFF)
        self.assertFalse(super_admin.is_superuser)
        self.assertFalse(super_admin.is_admin_user)

    def test_patch_cannot_deactivate_self(self):
        res = self.client.patch(f'/api/v1/auth/users/{self.admin.id}/', {'is_active': False}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertTrue(User.objects.get(pk=self.admin.pk).is_active)

    def test_patch_cannot_deactivate_or_demote_the_last_active_admin(self):
        # A Django superuser with role STAFF passes IsAdminUserOnly, so it can act on the only ADMIN-role user.
        operator = make_user('operator@test.com', Role.STAFF, is_superuser=True)
        self.client.force_authenticate(user=operator)
        for payload in ({'is_active': False}, {'role': Role.STAFF}):
            res = self.client.patch(f'/api/v1/auth/users/{self.admin.id}/', payload, format='json')
            self.assertEqual(res.status_code, 400, (payload, res.content))
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)
        self.assertEqual(self.admin.role, Role.ADMIN)

    def test_patch_cannot_demote_self(self):
        res = self.client.patch(f'/api/v1/auth/users/{self.admin.id}/', {'role': Role.STAFF}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(User.objects.get(pk=self.admin.pk).role, Role.ADMIN)

    def test_patch_cannot_set_role_customer_or_touch_customer_accounts(self):
        staff = make_user('s1@test.com', Role.STAFF)
        res = self.client.patch(f'/api/v1/auth/users/{staff.id}/', {'role': Role.CUSTOMER}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(User.objects.get(pk=staff.pk).role, Role.STAFF)

        customer = User.objects.create_user(email='cust@test.com', password=PASSWORD, role=Role.CUSTOMER)
        res = self.client.patch(f'/api/v1/auth/users/{customer.id}/', {'is_active': False}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertTrue(User.objects.get(pk=customer.pk).is_active)

    def test_duplicate_email_differing_in_case_is_rejected(self):
        make_user('Dup@Test.com', Role.STAFF)
        res = self.client.post('/api/v1/auth/users/', self.create_payload(email='dup@test.COM', role=Role.STAFF), format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('email', res.data)

    def test_new_email_is_lowercased(self):
        res = self.client.post('/api/v1/auth/users/', self.create_payload(email='MiXeD@Test.com', role=Role.STAFF), format='json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertTrue(User.objects.filter(email='mixed@test.com').exists())

    def test_delete_stays_disabled(self):
        staff = make_user('del@test.com', Role.STAFF)
        self.assertEqual(self.client.delete(f'/api/v1/auth/users/{staff.id}/').status_code, 405)

    def _session_for(self, user):
        store = SessionStore()
        store['_auth_user_id'] = str(user.pk)
        store['_auth_user_backend'] = 'django.contrib.auth.backends.ModelBackend'
        store['_auth_user_hash'] = user.get_session_auth_hash()
        store.create()
        return store.session_key

    def test_deactivation_removes_only_that_users_sessions(self):
        victim = make_user('victim@test.com', Role.STAFF)
        bystander = make_user('bystander@test.com', Role.STAFF)
        victim_keys = [self._session_for(victim), self._session_for(victim)]
        bystander_key = self._session_for(bystander)
        admin_key = self._session_for(self.admin)

        res = self.client.patch(f'/api/v1/auth/users/{victim.id}/', {'is_active': False}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        for key in victim_keys:
            self.assertFalse(Session.objects.filter(session_key=key).exists())
        self.assertTrue(Session.objects.filter(session_key=bystander_key).exists())
        self.assertTrue(Session.objects.filter(session_key=admin_key).exists())

        # Same through the dedicated action.
        other_victim = make_user('victim2@test.com', Role.STAFF)
        other_key = self._session_for(other_victim)
        res = self.client.post(f'/api/v1/auth/users/{other_victim.id}/deactivate/')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(Session.objects.filter(session_key=other_key).exists())
        self.assertTrue(Session.objects.filter(session_key=bystander_key).exists())
