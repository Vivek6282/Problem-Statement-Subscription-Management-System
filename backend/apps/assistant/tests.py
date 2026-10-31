from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.audit.models import AuditEvent
from apps.assistant import provider
from apps.assistant.models import AssistantSettings


def make_user(email, role):
    return User.objects.create_user(email=email, password='Passw0rd!Strong1', role=role, is_staff=role != Role.CUSTOMER)


def enable_row(value=True):
    row = AssistantSettings.load()
    row.ai_enabled = value
    row.save()


class AIBase(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = make_user('ai-admin@test.com', Role.ADMIN)
        self.staff = make_user('ai-staff@test.com', Role.STAFF)
        self.client = APIClient()


@override_settings(AI_ENABLED=True, AI_PROVIDER='fake')
class AdapterTests(AIBase):
    def test_disabled_by_env(self):
        enable_row()
        with override_settings(AI_ENABLED=False):
            self.assertEqual(provider.availability(), (False, 'disabled'))
            with self.assertRaises(provider.AIDisabled):
                provider.generate('s', 'u')

    def test_disabled_by_row(self):
        self.assertEqual(provider.availability(), (False, 'disabled'))
        with self.assertRaises(provider.AIDisabled):
            provider.generate('s', 'u')

    def test_not_configured_anthropic_without_key_or_model(self):
        enable_row()
        with override_settings(AI_PROVIDER='anthropic', ANTHROPIC_API_KEY='', AI_MODEL=''):
            self.assertEqual(provider.availability(), (False, 'not_configured'))
        with override_settings(AI_PROVIDER='anthropic', ANTHROPIC_API_KEY='k', AI_MODEL=''):
            self.assertEqual(provider.availability(), (False, 'not_configured'))

    def test_available_and_generates_with_fake(self):
        enable_row()
        result = provider.generate('system', 'user')
        self.assertEqual(result.provider, 'fake')
        self.assertTrue(result.text)

    @override_settings(AI_MAX_INPUT_CHARS=10)
    def test_oversize_input_rejected_before_provider_call(self):
        enable_row()
        fake = provider.FakeProvider()
        with mock.patch.object(provider, 'get_provider', return_value=fake):
            with self.assertRaises(provider.AIInvalidOutput):
                provider.generate('s', 'x' * 11)
        self.assertEqual(fake.calls, [])

    def test_fake_failure_and_timeout_map_to_unavailable(self):
        enable_row()
        for mode in ('unavailable', 'timeout'):
            with mock.patch.object(provider, 'get_provider', return_value=provider.FakeProvider(fail=mode)):
                with self.assertRaises(provider.AIUnavailable):
                    provider.generate('s', 'u')

    @override_settings(AI_PROVIDER='anthropic', ANTHROPIC_API_KEY='test-key', AI_MODEL='some-model')
    def test_anthropic_sdk_errors_and_timeouts_map_to_unavailable(self):
        import anthropic
        enable_row()
        impl = provider.AnthropicProvider()
        with mock.patch.object(impl.client.messages, 'create', side_effect=anthropic.AnthropicError('boom')):
            with self.assertRaises(provider.AIUnavailable):
                impl.generate('s', 'u')

    @override_settings(AI_PROVIDER='anthropic', ANTHROPIC_API_KEY='test-key', AI_MODEL='some-model', AI_MAX_OUTPUT_TOKENS=123)
    def test_anthropic_call_shape_and_text_join(self):
        impl = provider.AnthropicProvider()
        response = mock.Mock(content=[mock.Mock(type='text', text='Hello '), mock.Mock(type='thinking', text='ignored'), mock.Mock(type='text', text='world')])
        with mock.patch.object(impl.client.messages, 'create', return_value=response) as create:
            result = impl.generate('SYS', 'USER')
        create.assert_called_once_with(model='some-model', max_tokens=123, system='SYS', messages=[{'role': 'user', 'content': 'USER'}])
        self.assertEqual(result.text, 'Hello world')


@override_settings(AI_ENABLED=True, AI_PROVIDER='anthropic', ANTHROPIC_API_KEY='super-secret-key', AI_MODEL='secret-model-name')
class EndpointTests(AIBase):
    def test_status_hides_secrets(self):
        enable_row()
        self.client.force_authenticate(user=self.staff)
        res = self.client.get('/api/v1/assistant/status/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {'available': True, 'reason': None})
        body = res.content.decode()
        self.assertNotIn('super-secret-key', body)
        self.assertNotIn('secret-model-name', body)

    def test_status_reports_reason(self):
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.get('/api/v1/assistant/status/').json(), {'available': False, 'reason': 'disabled'})

    def test_status_requires_staff_or_admin(self):
        self.assertIn(self.client.get('/api/v1/assistant/status/').status_code, (401, 403))
        customer = make_user('c@test.com', Role.CUSTOMER)
        self.client.force_authenticate(user=customer)
        self.assertEqual(self.client.get('/api/v1/assistant/status/').status_code, 403)

    def test_staff_cannot_patch_settings_and_anonymous_denied(self):
        self.assertIn(self.client.patch('/api/v1/assistant/settings/', {'ai_enabled': True}, format='json').status_code, (401, 403))
        self.client.force_authenticate(user=self.staff)
        self.assertEqual(self.client.patch('/api/v1/assistant/settings/', {'ai_enabled': True}, format='json').status_code, 403)
        self.assertFalse(AssistantSettings.load().ai_enabled)

    def test_admin_toggles_and_it_is_audited(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch('/api/v1/assistant/settings/', {'ai_enabled': True}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(AssistantSettings.load().ai_enabled)
        self.assertTrue(AuditEvent.objects.filter(action='AI_SETTINGS_CHANGED').exists())
        self.assertEqual(self.client.patch('/api/v1/assistant/settings/', {'ai_enabled': 'maybe'}, format='json').status_code, 400)

    def test_ai_throttle_returns_429_after_limit(self):
        from apps.assistant.throttles import AIRateThrottle
        throttle = AIRateThrottle()
        self.assertEqual(throttle.scope, 'ai')
        self.assertEqual(throttle.get_rate(), '20/hour')
        # Exercise the real throttle: 20 allowed, the 21st refused.
        request = mock.Mock(user=self.admin)
        view = mock.Mock()
        results = [AIRateThrottle().allow_request(request, view) for _ in range(21)]
        self.assertEqual(results.count(True), 20)
        self.assertFalse(results[-1])
