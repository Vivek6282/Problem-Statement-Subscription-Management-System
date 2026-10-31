from django.test import TestCase
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from apps.accounts.models import User, Role
from apps.accounts.validators import ComplexPasswordValidator
from apps.customers.models import Customer

class AuthenticationAndPermissionsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.validator = ComplexPasswordValidator(min_length=9)

    def test_password_policy(self):
        # Too short (<9)
        with self.assertRaises(ValidationError):
            self.validator.validate("Ab1!")
        # Missing uppercase
        with self.assertRaises(ValidationError):
            self.validator.validate("securepassword1!")
        # Missing lowercase
        with self.assertRaises(ValidationError):
            self.validator.validate("SECUREPASSWORD1!")
        # Missing special character
        with self.assertRaises(ValidationError):
            self.validator.validate("SecurePassword123")
        # Valid password passes cleanly
        self.validator.validate("Brightloop@2026")

    def test_registration_creates_customer_role_and_profile(self):
        response = self.client.post('/api/v1/auth/register/', {
            'email': 'newuser@example.com',
            'password': 'SecurePassword@2026',
            'password_confirm': 'SecurePassword@2026',
            'first_name': 'Alice',
            'last_name': 'Wonder',
            'company_name': 'Wonderland Inc'
        })
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email='newuser@example.com')
        self.assertEqual(user.role, Role.CUSTOMER)
        self.assertFalse(user.is_staff)
        # Verify linked customer profile created
        customer = Customer.objects.get(user=user)
        self.assertEqual(customer.company, 'Wonderland Inc')

    def test_login_and_csrf(self):
        User.objects.create_user(
            email='alice@example.com',
            password='ValidPassword@123',
            role=Role.CUSTOMER
        )
        csrf_res = self.client.get('/api/v1/auth/csrf/')
        self.assertEqual(csrf_res.status_code, 200)
        self.assertIn('csrfToken', csrf_res.data)

        login_res = self.client.post('/api/v1/auth/login/', {
            'email': 'ALICE@EXAMPLE.COM', # Case-insensitive test
            'password': 'ValidPassword@123'
        })
        self.assertEqual(login_res.status_code, 200)
        self.assertEqual(login_res.data['user']['email'], 'alice@example.com')

