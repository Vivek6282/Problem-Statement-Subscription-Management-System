import csv
import datetime
import io
from decimal import Decimal

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.audit.models import AuditEvent
from apps.customers.models import Customer
from apps.invoices.models import Invoice, InvoiceStatus
from apps.payments.models import Payment
from apps.reports.business_time import business_today
from apps.reports.views import sanitize_csv_cell


def read_csv(response):
    text = b''.join(response.streaming_content).decode('utf-8')
    return list(csv.reader(io.StringIO(text)))


class ExportTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(email='export@brightloop.io', password='AdminPassword@2026')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)
        self.customer = Customer.objects.create(name='Export Co', email='export@example.com')
        self.today = business_today()

    def make_invoice(self, **kw):
        defaults = dict(
            customer=self.customer, status=InvoiceStatus.CONFIRMED, issue_date=self.today,
            due_date=self.today - datetime.timedelta(days=3), total_amount=Decimal('100.00'),
            balance_due=Decimal('100.00'),
        )
        defaults.update(kw)
        return Invoice.objects.create(**defaults)

    def test_anonymous_and_customer_are_denied(self):
        anon = APIClient().get('/api/v1/reports/export/?type=invoices')
        self.assertIn(anon.status_code, (401, 403))
        customer_user = User.objects.create_user(email='cust@example.com', password='CustomerPass@2026', role=Role.CUSTOMER)
        client = APIClient()
        client.force_authenticate(user=customer_user)
        self.assertEqual(client.get('/api/v1/reports/export/?type=invoices').status_code, 403)

    def test_sanitize_prefixes_formula_starts(self):
        for value in (' =cmd', '\t=cmd', '\r=cmd', '+1', '-1', '@x', '=1+1', '\n@x'):
            self.assertEqual(sanitize_csv_cell(value), "'" + value, repr(value))
        for value in ('Regular', '12.50', '', None, 'a=b'):
            self.assertEqual(sanitize_csv_cell(value), '' if value is None else value)

    def test_commas_quotes_and_newlines_are_quoted(self):
        customer = Customer.objects.create(name='Acme, "Big"\nCo', email='acme@example.com')
        self.make_invoice(customer=customer)
        rows = read_csv(self.client.get('/api/v1/reports/export/?type=invoices'))
        self.assertEqual(rows[1][1], 'Acme, "Big"\nCo')

    def test_dangerous_customer_name_is_neutralised_in_file(self):
        customer = Customer.objects.create(name=' =HYPERLINK("http://x")', email='evil@example.com')
        self.make_invoice(customer=customer)
        rows = read_csv(self.client.get('/api/v1/reports/export/?type=invoices'))
        self.assertTrue(rows[1][1].startswith("'"))

    def test_empty_result_returns_only_header(self):
        rows = read_csv(self.client.get('/api/v1/reports/export/?type=invoices'))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0][0], 'Invoice Number')

    def test_money_is_plain_decimal_with_currency_column(self):
        self.make_invoice(total_amount=Decimal('1234.5'), balance_due=Decimal('1234.5'))
        with override_settings(CURRENCY_CODE='EUR'):
            rows = read_csv(self.client.get('/api/v1/reports/export/?type=invoices'))
        header, row = rows[0], rows[1]
        self.assertEqual(row[header.index('Total')], '1234.50')
        self.assertEqual(row[header.index('Currency')], 'EUR')
        self.assertEqual(row[header.index('Issue Date')], self.today.isoformat())

    def test_export_count_equals_drilldown_count_for_same_filters(self):
        for offset in (-30, -10, -2):
            self.make_invoice(due_date=self.today + datetime.timedelta(days=offset))
        self.make_invoice(status=InvoiceStatus.PAID, balance_due=Decimal('0.00'))
        start = (self.today - datetime.timedelta(days=15)).isoformat()
        for metric, extra in (('overdue_invoices', ''), ('overdue_invoices', f'&start_date={start}'), ('outstanding', ''), ('billed', f'&start_date={start}')):
            drill = self.client.get(f'/api/v1/reports/drilldown/?metric={metric}{extra}').data
            rows = read_csv(self.client.get(f'/api/v1/reports/export/?type=drilldown&metric={metric}{extra}'))
            self.assertEqual(len(rows) - 1, drill['count'], (metric, extra))

    def test_payments_export_and_filename(self):
        inv = self.make_invoice()
        Payment.objects.create(customer=self.customer, invoice=inv, amount=Decimal('10.00'), payment_date=self.today)
        res = self.client.get(f'/api/v1/reports/export/?type=payments&start_date=2026-01-01&end_date=2026-12-31')
        self.assertIn('brightloop_payments_2026-01-01_2026-12-31.csv', res['Content-Disposition'])

    def test_export_is_streamed_and_audited_without_personal_data(self):
        self.make_invoice()
        res = self.client.get('/api/v1/reports/export/?type=invoices')
        self.assertTrue(res.streaming)
        read_csv(res)
        event = AuditEvent.objects.get(action='REPORT_EXPORTED')
        self.assertEqual(event.entity_type, 'Report')
        self.assertEqual(event.entity_id, 'invoices')
        self.assertNotIn('Export Co', str(event.metadata))
        self.assertNotIn('export@example.com', str(event.metadata))

    def test_bad_date_is_a_400(self):
        self.assertEqual(self.client.get('/api/v1/reports/export/?type=invoices&start_date=nope').status_code, 400)
