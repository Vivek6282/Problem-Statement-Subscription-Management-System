import datetime
from django.core.management.base import BaseCommand
from apps.subscriptions.billing import BillingEngine
from apps.subscriptions.maintenance import run_housekeeping

class Command(BaseCommand):
    help = 'Executes recurring billing cycle for all active subscriptions due on or before target date.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            help='Target billing date in YYYY-MM-DD format (defaults to current system date)'
        )
        parser.add_argument(
            '--skip-housekeeping',
            action='store_true',
            help='Do not mark overdue invoices / expire quotations / auto-close expired subscriptions afterwards'
        )

    def handle(self, *args, **options):
        date_str = options.get('date')
        if date_str:
            try:
                target_date = datetime.date.fromisoformat(date_str)
            except ValueError:
                self.stderr.write(self.style.ERROR(f"Invalid date format: {date_str}. Use YYYY-MM-DD."))
                return
        else:
            target_date = datetime.date.today()

        self.stdout.write(self.style.NOTICE(f"Initiating Brightloop recurring billing execution for {target_date}..."))
        results = BillingEngine.run_all_due_billing(target_date=target_date)

        self.stdout.write(self.style.SUCCESS(
            f"Billing cycle finished (every due period is billed, including missed ones)!\n"
            f"Due Subscriptions Identified: {results['found_due']}\n"
            f"Invoices Generated: {results['invoices_created']}\n"
            f"Skipped / Failed: {results['skipped_or_failed']}"
        ))

        for item in results['details']:
            if item['status'] == 'SUCCESS':
                self.stdout.write(f"  [CREATED] Sub {item['subscription_id']} -> Inv {item['invoice_number']} (${item['total']})")
            else:
                self.stdout.write(self.style.WARNING(f"  [SKIPPED] Sub {item['subscription_id']} -> {item.get('reason') or item.get('error')}"))

        if not options.get('skip_housekeeping'):
            summary = run_housekeeping(target_date)
            self.stdout.write(self.style.NOTICE(
                f"Housekeeping: {summary['invoices_marked_overdue']} invoice(s) marked overdue, "
                f"{summary['quotations_expired']} quotation(s) expired, "
                f"{summary['subscriptions_auto_closed']} subscription(s) auto-closed."
            ))
