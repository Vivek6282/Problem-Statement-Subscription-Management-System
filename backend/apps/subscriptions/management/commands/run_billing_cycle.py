import datetime
from django.core.management.base import BaseCommand
from apps.subscriptions.billing import BillingEngine

class Command(BaseCommand):
    help = 'Executes recurring billing cycle for all active subscriptions due on or before target date.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            help='Target billing date in YYYY-MM-DD format (defaults to current system date)'
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
            f"Billing cycle finished!\n"
            f"Due Subscriptions Identified: {results['found_due']}\n"
            f"Invoices Generated: {results['invoices_created']}\n"
            f"Skipped / Failed: {results['skipped_or_failed']}"
        ))

        for item in results['details']:
            if item['status'] == 'SUCCESS':
                self.stdout.write(f"  [CREATED] Sub {item['subscription_id']} -> Inv {item['invoice_number']} (${item['total']})")
            else:
                self.stdout.write(self.style.WARNING(f"  [SKIPPED] Sub {item['subscription_id']} -> {item.get('reason') or item.get('error')}"))

