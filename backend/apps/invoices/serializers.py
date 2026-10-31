from rest_framework import serializers
from apps.customers.serializers import CustomerSerializer
from .models import Invoice, InvoiceItem, InvoiceStatus

class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'product_name', 'product_sku', 'variant_name',
            'quantity', 'unit_price', 'discount_amount', 'tax_amount', 'line_total'
        ]
        read_only_fields = ['id', 'line_total']

class InvoiceSerializer(serializers.ModelSerializer):
    customer_details = CustomerSerializer(source='customer', read_only=True)
    items = InvoiceItemSerializer(many=True, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'subscription', 'customer',
            'customer_details', 'billing_period_start', 'billing_period_end',
            'issue_date', 'due_date', 'status', 'subtotal',
            'discount_amount', 'tax_amount', 'total_amount',
            'paid_amount', 'balance_due', 'is_overdue', 'notes',
            'items', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'invoice_number', 'subtotal', 'discount_amount', 'tax_amount',
            'total_amount', 'paid_amount', 'balance_due', 'is_overdue',
            'customer_details', 'created_at', 'updated_at'
        ]

class InvoiceItemInputSerializer(serializers.Serializer):
    product_name = serializers.CharField(max_length=255)
    product_sku = serializers.CharField(max_length=64, required=False, allow_blank=True)
    variant_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    quantity = serializers.IntegerField(default=1)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)

class InvoiceCreateSerializer(serializers.ModelSerializer):
    items = InvoiceItemInputSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = [
            'id', 'customer', 'subscription', 'billing_period_start',
            'billing_period_end', 'issue_date', 'due_date', 'notes', 'items'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        invoice = Invoice.objects.create(status=InvoiceStatus.DRAFT, **validated_data)

        subtotal = 0
        discount_total = 0
        tax_total = 0

        for item_data in items_data:
            qty = item_data.get('quantity', 1)
            price = item_data['unit_price']
            disc = item_data.get('discount_amount', 0)
            tax = item_data.get('tax_amount', 0)
            line_tot = max(0, (price * qty) - disc + tax)

            subtotal += (price * qty)
            discount_total += disc
            tax_total += tax

            InvoiceItem.objects.create(
                invoice=invoice,
                product_name=item_data['product_name'],
                product_sku=item_data.get('product_sku', ''),
                variant_name=item_data.get('variant_name', ''),
                quantity=qty,
                unit_price=price,
                discount_amount=disc,
                tax_amount=tax,
                line_total=line_tot
            )

        final_total = max(0, subtotal - discount_total + tax_total)
        invoice.subtotal = subtotal
        invoice.discount_amount = discount_total
        invoice.tax_amount = tax_total
        invoice.total_amount = final_total
        invoice.balance_due = final_total
        invoice.save()
        return invoice

