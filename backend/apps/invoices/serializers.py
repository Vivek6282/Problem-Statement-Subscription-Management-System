import datetime
from decimal import Decimal
from django.db import transaction, IntegrityError
from rest_framework import serializers

from apps.customers.serializers import CustomerBriefSerializer
from apps.products.models import Product, ProductVariant
from apps.discounts.models import Discount
from apps.audit.models import AuditEvent
from apps.subscriptions.pricing import LineSpec, price_document, product_unit_price
from .models import Invoice, InvoiceItem, InvoiceStatus


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'product_name', 'product_sku', 'variant_name',
            'quantity', 'unit_price', 'discount_amount', 'tax_amount', 'tax_breakdown', 'line_total'
        ]
        read_only_fields = fields


class InvoiceSerializer(serializers.ModelSerializer):
    customer_details = CustomerBriefSerializer(source='customer', read_only=True)
    subscription_number = serializers.CharField(source='subscription.subscription_number', read_only=True, default='')
    items = InvoiceItemSerializer(many=True, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    tax_summary = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'subscription', 'subscription_number', 'customer',
            'customer_details', 'billing_period_start', 'billing_period_end',
            'issue_date', 'due_date', 'status', 'subtotal',
            'discount_amount', 'tax_amount', 'total_amount',
            'paid_amount', 'balance_due', 'is_overdue', 'applied_discounts', 'tax_summary',
            'sent_at', 'notes', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = fields

    def get_tax_summary(self, obj):
        merged = {}
        for item in obj.items.all():
            for t in (item.tax_breakdown or []):
                key = (t['name'], t['rate'])
                merged[key] = merged.get(key, Decimal('0.00')) + Decimal(t['amount'])
        return [{'name': k[0], 'rate': k[1], 'amount': str(v)} for k, v in merged.items()]


class InvoiceItemInputSerializer(serializers.Serializer):
    """
    A line is either a catalogue line (`product` [+ `variant`]: priced by the server) or a custom
    line (`product_name` + `unit_price` typed by staff). Discount and tax are NEVER taken from the client:
    tax comes from the admin tax rules and a discount only from an admin-created discount rule (`discount` id).
    """
    product = serializers.IntegerField(required=False, allow_null=True)
    variant = serializers.IntegerField(required=False, allow_null=True)
    product_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    product_sku = serializers.CharField(max_length=64, required=False, allow_blank=True)
    quantity = serializers.IntegerField(default=1, min_value=1)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, min_value=Decimal('0.00'))
    discount = serializers.IntegerField(required=False, allow_null=True)
    # ignored legacy fields
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, write_only=True)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, write_only=True)

    def validate(self, attrs):
        if not attrs.get('product') and not (attrs.get('product_name') and attrs.get('unit_price') is not None):
            raise serializers.ValidationError("Each line needs either a product, or a name and a unit price.")
        return attrs


class InvoiceWriteSerializer(serializers.ModelSerializer):
    """Create a manual invoice (always starts as DRAFT) or edit a DRAFT one."""
    items = InvoiceItemInputSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = [
            'id', 'customer', 'subscription', 'billing_period_start',
            'billing_period_end', 'issue_date', 'due_date', 'notes', 'items'
        ]
        read_only_fields = ['id']
        extra_kwargs = {'due_date': {'required': False}}

    def validate(self, attrs):
        inst = self.instance
        if inst is not None and inst.status != InvoiceStatus.DRAFT:
            raise serializers.ValidationError(f"Only Draft invoices can be edited (this one is {inst.status}).")
        issue = attrs.get('issue_date', inst.issue_date if inst else datetime.date.today())
        due = attrs.get('due_date', inst.due_date if inst else None)
        if due and due < issue:
            raise serializers.ValidationError({'due_date': "Due date cannot be before the issue date."})
        customer = attrs.get('customer', inst.customer if inst else None)
        subscription = attrs.get('subscription', inst.subscription if inst else None)
        if subscription is not None and customer is not None and subscription.customer_id != customer.id:
            raise serializers.ValidationError({'subscription': "This subscription belongs to a different customer."})
        return attrs

    def _specs(self, items_data):
        specs = []
        for data in items_data:
            if data.get('product'):
                product = Product.objects.filter(id=data['product'], is_active=True).first()
                if product is None:
                    raise serializers.ValidationError({'items': f"Product {data['product']} does not exist or is inactive."})
                variant = None
                if data.get('variant'):
                    variant = ProductVariant.objects.filter(id=data['variant'], product=product, is_active=True).first()
                    if variant is None:
                        raise serializers.ValidationError({'items': "Variant does not belong to the selected product."})
                name, sku = product.name, (variant.effective_sku if variant else product.sku)
                price = product_unit_price(product, variant)
                variant_name = variant.name if variant else ''
            else:
                product, name, sku = None, data['product_name'], data.get('product_sku', '')
                price, variant_name = data['unit_price'], ''
            discount = Discount.objects.filter(id=data['discount']).first() if data.get('discount') else None
            specs.append(LineSpec(name=name, sku=sku, variant_name=variant_name, quantity=data.get('quantity', 1),
                                  unit_price=price, product=product, discount=discount))
        return specs

    def _apply_items(self, invoice, items_data):
        priced = price_document(self._specs(items_data), on_date=invoice.issue_date)
        invoice.items.all().delete()
        for line in priced.lines:
            InvoiceItem.objects.create(
                invoice=invoice, product_name=line.spec.name, product_sku=line.spec.sku,
                variant_name=line.spec.variant_name, quantity=line.spec.quantity, unit_price=line.spec.unit_price,
                discount_amount=line.discount_total, tax_amount=line.tax, line_total=line.total,
                tax_breakdown=line.tax_breakdown,
            )
        invoice.subtotal = priced.subtotal
        invoice.discount_amount = priced.discount_total
        invoice.tax_amount = priced.tax_total
        invoice.total_amount = priced.total
        invoice.balance_due = priced.total - invoice.paid_amount
        invoice.applied_discounts = priced.applied_discounts_summary()
        invoice.save()

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        if not validated_data.get('due_date'):
            validated_data['due_date'] = validated_data.get('issue_date', datetime.date.today()) + datetime.timedelta(days=30)
        try:
            invoice = Invoice.objects.create(status=InvoiceStatus.DRAFT, **validated_data)
        except IntegrityError:
            raise serializers.ValidationError("An invoice already exists for this subscription and billing period.")
        self._apply_items(invoice, items_data)
        AuditEvent.log_event('INVOICE_CREATED', 'Invoice', invoice.invoice_number, "Draft invoice created.",
                             user=self.context['request'].user)
        return invoice

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        try:
            instance.save()
        except IntegrityError:
            raise serializers.ValidationError("An invoice already exists for this subscription and billing period.")
        if items_data is not None:
            self._apply_items(instance, items_data)
        AuditEvent.log_event('INVOICE_UPDATED', 'Invoice', instance.invoice_number, "Draft invoice edited.",
                             user=self.context['request'].user)
        return instance
