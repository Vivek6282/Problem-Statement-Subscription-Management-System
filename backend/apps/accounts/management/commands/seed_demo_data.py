import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand
from apps.accounts.models import User, Role
from apps.customers.models import Customer, CustomerStatus
from apps.products.models import Product, ProductVariant, ProductType
from apps.plans.models import Plan, BillingInterval
from apps.taxes.models import TaxRule
from apps.discounts.models import Discount, DiscountType
from apps.subscriptions.models import Subscription, SubscriptionItem, SubscriptionStatus, PaymentTerms
from apps.invoices.models import Invoice, InvoiceItem, InvoiceStatus
from apps.payments.models import Payment, PaymentMethod
from apps.quotations.models import Quotation, QuotationItem, QuotationStatus
from apps.audit.models import AuditEvent

class Command(BaseCommand):
    help = 'Seeds database with realistic demo data for Brightloop Subscription Billing System.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding Brightloop initial data..."))

        # 1. Accounts
        admin, _ = User.objects.get_or_create(
            email='admin@brightloop.io',
            defaults={
                'first_name': 'Sarah',
                'last_name': 'Connor',
                'role': Role.ADMIN,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        admin.set_password('BrightloopAdmin@2026')
        admin.save()

        staff, _ = User.objects.get_or_create(
            email='staff@brightloop.io',
            defaults={
                'first_name': 'Marcus',
                'last_name': 'Wright',
                'role': Role.STAFF,
                'is_staff': True,
            }
        )
        staff.set_password('BrightloopStaff@2026')
        staff.save()

        cust_user, _ = User.objects.get_or_create(
            email='acme@example.com',
            defaults={
                'first_name': 'John',
                'last_name': 'Doe',
                'role': Role.CUSTOMER,
            }
        )
        cust_user.set_password('CustomerUser@2026')
        cust_user.save()

        self.stdout.write(self.style.SUCCESS("Users seeded (Admin, Staff, Customer)."))

        # 2. Customers
        acme, _ = Customer.objects.get_or_create(
            email='acme@example.com',
            defaults={
                'user': cust_user,
                'name': 'John Doe',
                'company': 'Acme Corporation',
                'phone': '+1 (555) 234-5678',
                'address_line1': '100 Innovation Way',
                'city': 'San Francisco',
                'state': 'CA',
                'postal_code': '94105',
                'country': 'United States',
                'status': CustomerStatus.ACTIVE
            }
        )

        globex, _ = Customer.objects.get_or_create(
            email='hank@globex.com',
            defaults={
                'name': 'Hank Scorpio',
                'company': 'Globex Industries',
                'phone': '+1 (555) 987-6543',
                'address_line1': '742 Evergreen Terrace',
                'city': 'Springfield',
                'state': 'OR',
                'postal_code': '97477',
                'country': 'United States',
                'status': CustomerStatus.ACTIVE
            }
        )

        initech, _ = Customer.objects.get_or_create(
            email='peter@initech.com',
            defaults={
                'name': 'Peter Gibbons',
                'company': 'Initech Software',
                'phone': '+1 (555) 321-4567',
                'address_line1': '4120 Freidrich Lane',
                'city': 'Austin',
                'state': 'TX',
                'postal_code': '78744',
                'country': 'United States',
                'status': CustomerStatus.ACTIVE
            }
        )

        stark, _ = Customer.objects.get_or_create(
            email='tony@starkindustries.com',
            defaults={
                'name': 'Tony Stark',
                'company': 'Stark Industries',
                'phone': '+1 (555) 000-3000',
                'address_line1': '10880 Malibu Point',
                'city': 'Malibu',
                'state': 'CA',
                'postal_code': '90265',
                'country': 'United States',
                'status': CustomerStatus.ACTIVE
            }
        )

        # 3. Products & Variants
        erp_prod, _ = Product.objects.get_or_create(
            sku='PROD-ERP-CORE',
            defaults={
                'name': 'Cloud ERP Platform',
                'product_type': ProductType.SOFTWARE,
                'sales_price': Decimal('2000.00'),
                'cost_price': Decimal('500.00'),
                'description': 'Enterprise Resource Planning cloud suite.',
                'is_active': True
            }
        )

        odoo_variant, _ = ProductVariant.objects.get_or_create(
            product=erp_prod,
            name='Odoo Integration Suite',
            defaults={
                'sku_suffix': 'OD',
                'price_adjustment': Decimal('560.00'),
                'is_active': True
            }
        )

        analytics_prod, _ = Product.objects.get_or_create(
            sku='PROD-ANALYTICS-AI',
            defaults={
                'name': 'Brightloop AI Analytics',
                'product_type': ProductType.SOFTWARE,
                'sales_price': Decimal('450.00'),
                'cost_price': Decimal('80.00'),
                'description': 'Predictive recurring revenue churn & billing forecasts.',
                'is_active': True
            }
        )

        storage_prod, _ = Product.objects.get_or_create(
            sku='PROD-STORAGE-1TB',
            defaults={
                'name': 'Dedicated Storage Add-on 1TB',
                'product_type': ProductType.SUBSCRIPTION,
                'sales_price': Decimal('120.00'),
                'cost_price': Decimal('25.00'),
                'description': 'High availability NVMe cloud storage.',
                'is_active': True
            }
        )

        # 4. Subscription Plans
        starter_plan, _ = Plan.objects.get_or_create(
            code='plan-starter-monthly',
            defaults={
                'name': 'Starter Monthly',
                'billing_interval': BillingInterval.MONTHLY,
                'price': Decimal('99.00'),
                'description': 'Designed for small teams getting started with automated subscriptions.',
                'allow_pause': True,
                'allow_renewal': True,
                'is_active': True
            }
        )

        pro_plan, _ = Plan.objects.get_or_create(
            code='plan-pro-monthly',
            defaults={
                'name': 'Pro Business Monthly',
                'billing_interval': BillingInterval.MONTHLY,
                'price': Decimal('499.00'),
                'description': 'Full feature access, priority engine execution, and unlimited invoices.',
                'allow_pause': True,
                'allow_renewal': True,
                'is_active': True
            }
        )

        enterprise_plan, _ = Plan.objects.get_or_create(
            code='plan-enterprise-annual',
            defaults={
                'name': 'Enterprise Annual',
                'billing_interval': BillingInterval.YEARLY,
                'price': Decimal('4999.00'),
                'description': 'Dedicated multi-region cluster, SLA guarantee, and custom payment gateways.',
                'allow_pause': True,
                'allow_renewal': True,
                'is_active': True
            }
        )

        # 5. Taxes & Discounts
        gst_tax, _ = TaxRule.objects.get_or_create(
            name='GST 18%',
            defaults={
                'percentage': Decimal('18.00'),
                'effective_from': datetime.date(2025, 1, 1),
                'is_active': True
            }
        )

        vat_tax, _ = TaxRule.objects.get_or_create(
            name='Standard VAT 10%',
            defaults={
                'percentage': Decimal('10.00'),
                'effective_from': datetime.date(2025, 1, 1),
                'is_active': True
            }
        )

        welcome_discount, _ = Discount.objects.get_or_create(
            code='WELCOME20',
            defaults={
                'name': 'Welcome Promotion 20%',
                'discount_type': DiscountType.PERCENTAGE,
                'value': Decimal('20.00'),
                'start_date': datetime.date(2025, 1, 1),
                'is_active': True
            }
        )

        # 6. Subscriptions
        today = datetime.date.today()
        sub_acme, _ = Subscription.objects.get_or_create(
            subscription_number='SUB-2026-0001',
            defaults={
                'customer': acme,
                'plan': pro_plan,
                'status': SubscriptionStatus.ACTIVE,
                'start_date': today - datetime.timedelta(days=45),
                'next_billing_date': today + datetime.timedelta(days=15),
                'payment_terms': PaymentTerms.NET_30,
                'notes': 'Key enterprise account.'
            }
        )
        if not sub_acme.items.exists():
            SubscriptionItem.objects.create(
                subscription=sub_acme,
                product=erp_prod,
                variant=odoo_variant,
                quantity=1,
                unit_price=Decimal('2560.00'), # 2000 + 560
                tax_rule=gst_tax
            )
            SubscriptionItem.objects.create(
                subscription=sub_acme,
                product=analytics_prod,
                quantity=2,
                unit_price=Decimal('450.00'),
                tax_rule=gst_tax
            )

        sub_globex, _ = Subscription.objects.get_or_create(
            subscription_number='SUB-2026-0002',
            defaults={
                'customer': globex,
                'plan': enterprise_plan,
                'status': SubscriptionStatus.ACTIVE,
                'start_date': today - datetime.timedelta(days=120),
                'next_billing_date': today + datetime.timedelta(days=245),
                'payment_terms': PaymentTerms.NET_30
            }
        )

        sub_initech, _ = Subscription.objects.get_or_create(
            subscription_number='SUB-2026-0003',
            defaults={
                'customer': initech,
                'plan': starter_plan,
                'status': SubscriptionStatus.PAUSED,
                'start_date': today - datetime.timedelta(days=60),
                'next_billing_date': today + datetime.timedelta(days=5),
                'payment_terms': PaymentTerms.NET_15
            }
        )

        # 7. Invoices & Payments
        # Paid invoice for Acme
        inv_acme_paid, _ = Invoice.objects.get_or_create(
            invoice_number='INV-2026-0001',
            defaults={
                'subscription': sub_acme,
                'customer': acme,
                'billing_period_start': today - datetime.timedelta(days=45),
                'billing_period_end': today - datetime.timedelta(days=15),
                'issue_date': today - datetime.timedelta(days=45),
                'due_date': today - datetime.timedelta(days=15),
                'status': InvoiceStatus.PAID,
                'subtotal': Decimal('3959.00'),
                'discount_amount': Decimal('0.00'),
                'tax_amount': Decimal('622.62'),
                'total_amount': Decimal('4581.62'),
                'paid_amount': Decimal('4581.62'),
                'balance_due': Decimal('0.00'),
            }
        )
        if not inv_acme_paid.items.exists():
            InvoiceItem.objects.create(
                invoice=inv_acme_paid,
                product_name='Pro Business Monthly',
                product_sku='plan-pro-monthly',
                quantity=1,
                unit_price=Decimal('499.00'),
                line_total=Decimal('499.00')
            )
            InvoiceItem.objects.create(
                invoice=inv_acme_paid,
                product_name='Cloud ERP Platform (Odoo Integration Suite)',
                product_sku='PROD-ERP-CORE-OD',
                variant_name='Odoo Integration Suite',
                quantity=1,
                unit_price=Decimal('2560.00'),
                tax_amount=Decimal('460.80'),
                line_total=Decimal('3020.80')
            )

        Payment.objects.get_or_create(
            payment_number='PAY-2026-0001',
            defaults={
                'invoice': inv_acme_paid,
                'customer': acme,
                'amount': Decimal('4581.62'),
                'payment_method': PaymentMethod.BANK_TRANSFER,
                'payment_date': today - datetime.timedelta(days=20),
                'transaction_reference': 'WIRE-ACME-99124',
                'notes': 'Full invoice clearance.'
            }
        )

        # Overdue invoice for Globex
        inv_globex_overdue, _ = Invoice.objects.get_or_create(
            invoice_number='INV-2026-0002',
            defaults={
                'subscription': sub_globex,
                'customer': globex,
                'billing_period_start': today - datetime.timedelta(days=70),
                'billing_period_end': today - datetime.timedelta(days=40),
                'issue_date': today - datetime.timedelta(days=70),
                'due_date': today - datetime.timedelta(days=40),
                'status': InvoiceStatus.OVERDUE,
                'subtotal': Decimal('4999.00'),
                'discount_amount': Decimal('0.00'),
                'tax_amount': Decimal('499.90'),
                'total_amount': Decimal('5498.90'),
                'paid_amount': Decimal('2000.00'),
                'balance_due': Decimal('3498.90'),
            }
        )
        if not inv_globex_overdue.items.exists():
            InvoiceItem.objects.create(
                invoice=inv_globex_overdue,
                product_name='Enterprise Annual Plan',
                product_sku='plan-enterprise-annual',
                quantity=1,
                unit_price=Decimal('4999.00'),
                tax_amount=Decimal('499.90'),
                line_total=Decimal('5498.90')
            )

        Payment.objects.get_or_create(
            payment_number='PAY-2026-0002',
            defaults={
                'invoice': inv_globex_overdue,
                'customer': globex,
                'amount': Decimal('2000.00'),
                'payment_method': PaymentMethod.CARD,
                'payment_date': today - datetime.timedelta(days=35),
                'transaction_reference': 'TXN-CARD-4482',
                'notes': 'Partial installment.'
            }
        )

        # Confirmed Due invoice for Stark
        Invoice.objects.get_or_create(
            invoice_number='INV-2026-0003',
            defaults={
                'customer': stark,
                'issue_date': today - datetime.timedelta(days=5),
                'due_date': today + datetime.timedelta(days=25),
                'status': InvoiceStatus.CONFIRMED,
                'subtotal': Decimal('1500.00'),
                'discount_amount': Decimal('0.00'),
                'tax_amount': Decimal('270.00'),
                'total_amount': Decimal('1770.00'),
                'paid_amount': Decimal('0.00'),
                'balance_due': Decimal('1770.00'),
                'notes': 'Initial setup and advisory package.'
            }
        )

        # 8. Quotation
        qt, _ = Quotation.objects.get_or_create(
            quotation_number='QT-2026-0001',
            defaults={
                'customer': stark,
                'plan': enterprise_plan,
                'validity_days': 30,
                'issue_date': today,
                'expiry_date': today + datetime.timedelta(days=30),
                'status': QuotationStatus.SENT,
                'subtotal': Decimal('6999.00'),
                'discount_amount': Decimal('500.00'),
                'tax_amount': Decimal('1169.82'),
                'total_amount': Decimal('7668.82'),
                'notes': 'Proposed expansion package for next quarter.'
            }
        )
        if not qt.items.exists():
            QuotationItem.objects.create(
                quotation=qt,
                product=erp_prod,
                variant=odoo_variant,
                quantity=1,
                unit_price=Decimal('2560.00'),
                tax_percentage=Decimal('18.00'),
                line_total=Decimal('3020.80')
            )

        # 9. Audit Events
        AuditEvent.log_event(
            action='SYSTEM_INITIALIZED',
            entity_type='System',
            entity_id='1',
            description='Brightloop system seeded with initial demo data.',
            user=admin
        )

        self.stdout.write(self.style.SUCCESS("All Brightloop demo data seeded successfully!"))

