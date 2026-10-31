from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import Role, User


def make_user(email, role):
    return User.objects.create_user(email=email, password='Passw0rd!Strong1', role=role, is_staff=role != Role.CUSTOMER)


class TourTests(TestCase):
    def test_anonymous_denied(self):
        self.assertIn(APIClient().get('/api/v1/tour/').status_code, (401, 403))

    def test_every_role_starts_with_the_tour_shown(self):
        for role in (Role.ADMIN, Role.STAFF, Role.CUSTOMER):
            client = APIClient()
            client.force_authenticate(user=make_user(f'{role.lower()}@tour.test', role))
            data = client.get('/api/v1/tour/').json()
            self.assertEqual(data['role'], role)
            self.assertTrue(data['show_automatically'])

    def test_never_show_and_completed_stop_the_automatic_tour(self):
        client = APIClient()
        client.force_authenticate(user=make_user('opt@tour.test', Role.STAFF))
        self.assertFalse(client.patch('/api/v1/tour/', {'never_show': True}, format='json').json()['show_automatically'])
        client.patch('/api/v1/tour/', {'never_show': False}, format='json')
        self.assertTrue(client.get('/api/v1/tour/').json()['show_automatically'])
        self.assertFalse(client.patch('/api/v1/tour/', {'completed': True}, format='json').json()['show_automatically'])

    def test_preferences_are_per_user(self):
        a, b = APIClient(), APIClient()
        a.force_authenticate(user=make_user('a@tour.test', Role.STAFF))
        b.force_authenticate(user=make_user('b@tour.test', Role.STAFF))
        a.patch('/api/v1/tour/', {'never_show': True}, format='json')
        self.assertTrue(b.get('/api/v1/tour/').json()['show_automatically'])

    def test_rejects_non_boolean(self):
        client = APIClient()
        client.force_authenticate(user=make_user('bad@tour.test', Role.STAFF))
        self.assertEqual(client.patch('/api/v1/tour/', {'never_show': 'maybe'}, format='json').status_code, 400)
