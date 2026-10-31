from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import Role
from apps.audit.models import AuditEvent

User = get_user_model()


class StaffAdminManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Primary admin
        self.admin = User.objects.create_user(
            email='admin1@test.com',
            password='AdminPassword123!',
            role=Role.ADMIN,
            is_staff=True,
            is_superuser=True,
            first_name='Admin',
            last_name='One'
        )

        # Secondary admin
        self.admin2 = User.objects.create_user(
            email='admin2@test.com',
            password='AdminPassword123!',
            role=Role.ADMIN,
            is_staff=True,
            is_superuser=True,
            first_name='Admin',
            last_name='Two'
        )

        # Staff user
        self.staff = User.objects.create_user(
            email='staff1@test.com',
            password='StaffPassword123!',
            role=Role.STAFF,
            is_staff=True,
            is_superuser=False,
            first_name='Staff',
            last_name='One'
        )

        # Customer user
        self.customer = User.objects.create_user(
            email='customer1@test.com',
            password='CustomerPassword123!',
            role=Role.CUSTOMER,
            is_staff=False,
            is_superuser=False,
            first_name='Customer',
            last_name='One'
        )

    def test_admin_can_list_staff_and_admins(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/users/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        emails = [u['email'] for u in res.data['results']]
        self.assertIn('admin1@test.com', emails)
        self.assertIn('staff1@test.com', emails)
        # Customer should not be in staff list
        self.assertNotIn('customer1@test.com', emails)

    def test_admin_can_create_staff(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            'email': 'newstaff@test.com',
            'password': 'StrongPassword!2026',
            'first_name': 'New',
            'last_name': 'Hire',
            'role': Role.STAFF
        }
        res = self.client.post('/api/v1/users/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        new_user = User.objects.get(email='newstaff@test.com')
        self.assertEqual(new_user.role, Role.STAFF)
        self.assertTrue(new_user.is_staff)
        self.assertFalse(new_user.is_superuser)

        # Verify audit event
        event = AuditEvent.objects.filter(action='STAFF_CREATED', entity_id=str(new_user.id)).first()
        self.assertIsNotNone(event)
        self.assertEqual(event.user, self.admin)

    def test_admin_can_update_staff_role(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(f'/api/v1/users/{self.staff.id}/', {'role': Role.ADMIN})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.staff.refresh_from_db()
        self.assertEqual(self.staff.role, Role.ADMIN)
        # ADMIN is an application role, not a Django superuser.
        self.assertFalse(self.staff.is_superuser)

        # Audit event
        event = AuditEvent.objects.filter(action='USER_ROLE_CHANGED', entity_id=str(self.staff.id)).first()
        self.assertIsNotNone(event)
        self.assertEqual(event.metadata['new_role'], Role.ADMIN)

    def test_staff_cannot_access_userviewset_writes(self):
        self.client.force_authenticate(user=self.staff)
        # Staff cannot read the account list either (admin only)
        get_res = self.client.get('/api/v1/users/')
        self.assertEqual(get_res.status_code, status.HTTP_403_FORBIDDEN)

        # Staff cannot POST create
        post_res = self.client.post('/api/v1/users/', {
            'email': 'unauth@test.com',
            'password': 'Password123!',
            'role': Role.STAFF
        })
        self.assertEqual(post_res.status_code, status.HTTP_403_FORBIDDEN)

        # Staff cannot PATCH
        patch_res = self.client.patch(f'/api/v1/users/{self.staff.id}/', {'first_name': 'Hacker'})
        self.assertEqual(patch_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_cannot_access_userviewset_at_all(self):
        self.client.force_authenticate(user=self.customer)
        get_res = self.client.get('/api/v1/users/')
        self.assertEqual(get_res.status_code, status.HTTP_403_FORBIDDEN)

        post_res = self.client.post('/api/v1/users/', {'email': 'test@test.com'})
        self.assertEqual(post_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_cannot_deactivate_themselves(self):
        self.client.force_authenticate(user=self.admin)
        # Via patch
        res = self.client.patch(f'/api/v1/users/{self.admin.id}/', {'is_active': False})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

        # Via deactivate action
        res2 = self.client.post(f'/api/v1/users/{self.admin.id}/deactivate/')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_admin_cannot_demote_themselves(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(f'/api/v1/users/{self.admin.id}/', {'role': Role.STAFF})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.role, Role.ADMIN)

    def test_admin_cannot_deactivate_only_active_admin(self):
        # Deactivate admin2 first so admin1 is the ONLY active admin
        self.admin2.is_active = False
        self.admin2.save()

        # Admin1 cannot be deactivated by admin2 or anyone
        self.client.force_authenticate(user=self.admin)
        # Try deactivating admin1 (already prevented by self-check, but test another admin trying when only 1 active admin exists)
        self.admin2.is_active = True
        self.admin2.save()
        self.admin.is_active = False
        self.admin.save()
        # Now admin2 is the ONLY active admin
        self.client.force_authenticate(user=self.admin2)
        res = self.client.post(f'/api/v1/users/{self.admin2.id}/deactivate/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_deactivating_user_logs_audit_event_and_reactivate(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f'/api/v1/users/{self.staff.id}/deactivate/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.staff.refresh_from_db()
        self.assertFalse(self.staff.is_active)

        event = AuditEvent.objects.filter(action='USER_DEACTIVATED', entity_id=str(self.staff.id)).first()
        self.assertIsNotNone(event)
        self.assertEqual(event.user, self.admin)

        # Reactivate
        res2 = self.client.post(f'/api/v1/users/{self.staff.id}/reactivate/')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.staff.refresh_from_db()
        self.assertTrue(self.staff.is_active)

        event2 = AuditEvent.objects.filter(action='USER_REACTIVATED', entity_id=str(self.staff.id)).first()
        self.assertIsNotNone(event2)

    def test_hard_delete_returns_405(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.delete(f'/api/v1/users/{self.staff.id}/')
        self.assertEqual(res.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        # Verify staff was not deleted
        self.assertTrue(User.objects.filter(id=self.staff.id).exists())

