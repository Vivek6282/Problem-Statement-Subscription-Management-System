from rest_framework import serializers
from apps.customers.serializers import CustomerSerializer
from apps.plans.serializers import PlanSerializer
from apps.products.serializers import ProductSerializer
from .models import Quotation, QuotationItem, QuotationStatus

class QuotationItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    variant_name = serializers.CharField(source='variant.name', read_only=True)

    class Meta:
        model = QuotationItem
        fields = [
            'id', 'product', 'product_name', 'product_sku', 'variant',
            'variant_name', 'description', 'quantity', 'unit_price',
            'discount_amount', 'tax_percentage', 'line_total'
        ]
        read_only_fields = ['id', 'line_total', 'product_name', 'product_sku', 'variant_name']

class QuotationSerializer(serializers.ModelSerializer):
    customer_details = CustomerSerializer(source='customer', read_only=True)
    plan_details = PlanSerializer(source='plan', read_only=True)
    items = QuotationItemSerializer(many=True, read_only=True)

    class Meta:
        model = Quotation
        fields = [
            'id', 'quotation_number', 'customer', 'customer_details',
            'plan', 'plan_details', 'validity_days', 'issue_date',
            'expiry_date', 'status', 'subtotal', 'discount_amount',
            'tax_amount', 'total_amount', 'converted_subscription',
            'notes', 'terms_and_conditions', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'quotation_number', 'subtotal', 'discount_amount', 'tax_amount',
            'total_amount', 'converted_subscription', 'customer_details', 'plan_details',
            'created_at', 'updated_at'
        ]

class QuotationItemInputSerializer(serializers.Serializer):
    product = serializers.IntegerField(required=True)
    variant = serializers.IntegerField(required=False, allow_null=True)
    quantity = serializers.IntegerField(default=1)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)
    description = serializers.CharField(required=False, allow_blank=True, default='')

class QuotationCreateUpdateSerializer(serializers.ModelSerializer):
    items = QuotationItemInputSerializer(many=True, required=False)

    class Meta:
        model = Quotation
        fields = [
            'id', 'customer', 'plan', 'validity_days', 'issue_date',
            'notes', 'terms_and_conditions', 'items'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        quotation = Quotation.objects.create(**validated_data)

        from apps.products.models import Product, ProductVariant
        for item_data in items_data:
            product = Product.objects.get(id=item_data['product'])
            variant = ProductVariant.objects.filter(id=item_data.get('variant')).first() if item_data.get('variant') else None
            unit_price = item_data.get('unit_price')
            if unit_price is None:
                unit_price = variant.final_unit_price if variant else product.sales_price

            QuotationItem.objects.create(
                quotation=quotation,
                product=product,
                variant=variant,
                quantity=item_data.get('quantity', 1),
                unit_price=unit_price,
                discount_amount=item_data.get('discount_amount', 0),
                tax_percentage=item_data.get('tax_percentage', 0),
                description=item_data.get('description', '')
            )

        quotation.recalculate_totals()
        return quotation

