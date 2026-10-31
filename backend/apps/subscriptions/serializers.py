from rest_framework import serializers
from apps.customers.serializers import CustomerSerializer
from apps.plans.serializers import PlanSerializer
from apps.products.serializers import ProductSerializer, ProductVariantSerializer
from .models import Subscription, SubscriptionItem, SubscriptionStatus, PaymentTerms

class SubscriptionItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    variant_name = serializers.CharField(source='variant.name', read_only=True)
    line_subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = SubscriptionItem
        fields = [
            'id', 'product', 'product_name', 'product_sku', 'variant',
            'variant_name', 'quantity', 'unit_price', 'tax_rule',
            'discount', 'line_subtotal'
        ]
        read_only_fields = ['id', 'line_subtotal', 'product_name', 'product_sku', 'variant_name']

class SubscriptionSerializer(serializers.ModelSerializer):
    customer_details = CustomerSerializer(source='customer', read_only=True)
    plan_details = PlanSerializer(source='plan', read_only=True)
    items = SubscriptionItemSerializer(many=True, read_only=True)
    recurring_subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    normalized_mrr = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id', 'subscription_number', 'customer', 'customer_details',
            'plan', 'plan_details', 'status', 'start_date', 'expiry_date',
            'next_billing_date', 'last_billing_date', 'payment_terms',
            'auto_renew', 'notes', 'recurring_subtotal', 'normalized_mrr',
            'created_at', 'updated_at', 'items'
        ]
        read_only_fields = [
            'id', 'subscription_number', 'recurring_subtotal', 'normalized_mrr',
            'customer_details', 'plan_details', 'created_at', 'updated_at'
        ]

class SubscriptionItemInputSerializer(serializers.Serializer):
    product = serializers.IntegerField(required=True)
    variant = serializers.IntegerField(required=False, allow_null=True)
    quantity = serializers.IntegerField(default=1)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    tax_rule = serializers.IntegerField(required=False, allow_null=True)
    discount = serializers.IntegerField(required=False, allow_null=True)

class SubscriptionCreateSerializer(serializers.ModelSerializer):
    items = SubscriptionItemInputSerializer(many=True, required=False)

    class Meta:
        model = Subscription
        fields = [
            'id', 'customer', 'plan', 'status', 'start_date', 'expiry_date',
            'payment_terms', 'auto_renew', 'notes', 'items'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        subscription = Subscription.objects.create(**validated_data)

        from apps.products.models import Product, ProductVariant
        from apps.taxes.models import TaxRule
        from apps.discounts.models import Discount

        for item_data in items_data:
            product = Product.objects.get(id=item_data['product'])
            variant = ProductVariant.objects.filter(id=item_data.get('variant')).first() if item_data.get('variant') else None
            unit_price = item_data.get('unit_price')
            if unit_price is None:
                unit_price = variant.final_unit_price if variant else product.sales_price
            
            tax_rule = TaxRule.objects.filter(id=item_data.get('tax_rule')).first() if item_data.get('tax_rule') else None
            discount = Discount.objects.filter(id=item_data.get('discount')).first() if item_data.get('discount') else None

            SubscriptionItem.objects.create(
                subscription=subscription,
                product=product,
                variant=variant,
                quantity=item_data.get('quantity', 1),
                unit_price=unit_price,
                tax_rule=tax_rule,
                discount=discount
            )

        return subscription

