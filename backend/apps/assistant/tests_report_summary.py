import datetime
import json
from decimal import Decimal
from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.assistant import provider
from apps.assistant.models import AssistantSettings
from apps.assistant.views import summary_is_verified
from apps.customers.models import Customer
from apps.invoices.models import Invoice, InvoiceStatus
from apps.payments.models import Payment
from apps.plans.models import BillingInterval, Plan
from apps.reports.business_time import business_today
from apps.subscriptions.models import Subscription, SubscriptionStatus

URL = '/api/v1/assistant/report-summary/'
BODY = {'report': 'dashboard', 'filters': {}}


def make_user(email, role):
    return User.objects.create_user(email=email, password='Passw0rd!Strong1', role=role, is_staff=role != Role.CUSTOMER)


@override_settings(AI_ENABLED=True, AI_PROVIDER='fake')
class ReportSummaryTests(TestCase):
    def setUp(self):
        cache.clear()
        row = AssistantSettings.load()
        row.ai_enabled = True
        row.save()
        self.admin = make_user('rs-admin@test.com', Role.ADMIN)
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)
        self.today = business_today()
        customer = Customer.objects.create(name='Very Private Name', company='Hidden Ltd', email='hidden@example.com')
        self.plan = Plan.objects.create(name='Monthly', code='rs-m', price=Decimal('100.00'), billing_interval=BillingInterval.MONTHLY)
        self.other_plan = Plan.objects.create(name='Other', code='rs-o', price=Decimal('40.00'), billing_interval=BillingInterval.MONTHLY)
        for plan in (self.plan, self.other_plan):
            Subscription.objects.create(customer=customer, plan=plan, status=SubscriptionStatus.ACTIVE, start_date=self.today)
        inv = Invoice.objects.create(
            customer=customer, status=InvoiceStatus.CONFIRMED, issue_date=self.today,
            due_date=self.today - datetime.timedelta(days=2),
            total_amount=Decimal('250.00'), balance_due=Decimal('250.00'),
        )
        Payment.objects.create(customer=customer, invoice=inv, amount=Decimal('75.50'), payment_date=self.today)

    def fake(self, text):
        fake = provider.FakeProvider(text=text)
        return fake, mock.patch.object(provider, 'get_provider', return_value=fake)

    def sent(self, fake):
        return json.loads(fake.calls[0]['user'].split('\n')[1])

    GOOD = (
        '- MRR is 140.00 across 2 active subscriptions.\n'
        '- 250.00 is billed and 75.50 received (about 76 in whole units).\n'
        '1. Optional next step: review the 1 overdue invoice worth 250.00.'
    )

    def test_admin_gets_verified_summary(self):
        _fake, patch = self.fake(self.GOOD)
        with patch:
            res = self.client.post(URL, BODY, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()
        self.assertEqual(data['label'], 'AI-generated, may be inaccurate')
        self.assertEqual(data['figures']['mrr'], '140.00')
        self.assertEqual(data['currency'], 'USD')
        self.assertIn('MRR is 140.00', data['summary'])

    def test_unsupported_number_returns_422_and_shows_nothing(self):
        _fake, patch = self.fake('- MRR is 999.00 this month.')
        with patch:
            res = self.client.post(URL, BODY, format='json')
        self.assertEqual(res.status_code, 422)
        self.assertEqual(res.json(), {'detail': 'Summary could not be verified'})

    def test_verifier_rules(self):
        figures = {'mrr': '1234.50', 'churn_provisional': '2.5%', 'as_of_date': '2026-10-31', 'period_start': None,
                   'period_end': None, 'currency_code': 'USD', 'overdue_count': 3}
        ok = lambda t: summary_is_verified(t, figures)
        self.assertTrue(ok('MRR is $1,234.50'))
        self.assertTrue(ok('MRR is about 1,235'))
        self.assertTrue(ok('Churn 2.5% so far, 3 invoices overdue, as of 2026-10-31'))
        self.assertTrue(ok('1. First point\n2. Second 3 overdue'))
        self.assertFalse(ok('MRR is 1,234.51'))
        self.assertTrue(ok('Churn is about 3%'))
        self.assertFalse(ok('Churn is 4%'))
        self.assertFalse(ok('Growing 10% a month'))
        self.assertFalse(ok('as of 2026-10-30'))

    def test_payload_contains_only_allow_listed_aggregates(self):
        fake, patch = self.fake(self.GOOD)
        with patch:
            self.client.post(URL, BODY, format='json')
        payload = self.sent(fake)
        self.assertEqual(set(payload), {
            'currency_code', 'period_start', 'period_end', 'as_of_date', 'active_subscriptions', 'mrr', 'arr',
            'billed', 'received', 'outstanding', 'overdue_count', 'overdue_amount', 'churn_provisional',
        })
        sent = fake.calls[0]['system'] + fake.calls[0]['user']
        for private in ('Very Private Name', 'Hidden Ltd', 'hidden@example.com', 'INV-'):
            self.assertNotIn(private, sent)
        self.assertEqual(payload['active_subscriptions'], 2)
        self.assertEqual(payload['overdue_amount'], '250.00')
        self.assertEqual(payload['received'], '75.50')

    def test_filters_change_the_figures_sent(self):
        fake, patch = self.fake(self.GOOD)
        with patch:
            self.client.post(URL, {'report': 'dashboard', 'filters': {'plan_id': str(self.plan.id)}}, format='json')
        self.assertEqual(self.sent(fake)['mrr'], '100.00')
        self.assertEqual(self.sent(fake)['active_subscriptions'], 1)

    def test_client_cannot_supply_numbers(self):
        fake, patch = self.fake(self.GOOD)
        with patch:
            res = self.client.post(URL, {'report': 'dashboard', 'filters': {'mrr': '1'}}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(fake.calls, [])

    def test_bad_filter_is_400(self):
        res = self.client.post(URL, {'report': 'dashboard', 'filters': {'start_date': 'nope'}}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_permissions(self):
        self.client.force_authenticate(user=make_user('rs-staff@test.com', Role.STAFF))
        self.assertEqual(self.client.post(URL, BODY, format='json').status_code, 403)
        self.client.force_authenticate(user=make_user('rs-cust@test.com', Role.CUSTOMER))
        self.assertEqual(self.client.post(URL, BODY, format='json').status_code, 403)
        self.assertIn(APIClient().post(URL, BODY, format='json').status_code, (401, 403))

    def test_unavailable_returns_503_and_reports_still_work(self):
        fake = provider.FakeProvider(fail='unavailable')
        with mock.patch.object(provider, 'get_provider', return_value=fake):
            res = self.client.post(URL, BODY, format='json')
        self.assertEqual(res.status_code, 503)
        with override_settings(AI_ENABLED=False):
            self.assertEqual(self.client.post(URL, BODY, format='json').status_code, 503)
            self.assertEqual(self.client.get('/api/v1/reports/dashboard/').status_code, 200)
            self.assertEqual(self.client.get('/api/v1/reports/mrr-breakdown/').status_code, 200)

    def test_audit_records_feature_and_outcome_only(self):
        from apps.audit.models import AuditEvent
        _fake, patch = self.fake(self.GOOD)
        with patch:
            self.client.post(URL, BODY, format='json')
        event = AuditEvent.objects.get(action='AI_SUMMARY_REQUESTED')
        self.assertEqual(event.metadata, {'feature': 'report_summary', 'outcome': 'success'})
