from decimal import Decimal
from rest_framework import serializers
from .models import Product, ProductVariant

class ProductVariantSerializer(serializers.ModelSerializer):
    final_unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    effective_sku = serializers.CharField(read_only=True)

    class Meta:
        model = ProductVariant
        fields = [
            'id', 'product', 'name', 'sku_suffix', 'price_adjustment',
            'effective_sku', 'final_unit_price', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'effective_sku', 'final_unit_price']

    def validate(self, attrs):
        request = self.context.get('request')
        # Block non-admins on both create and update from setting or modifying price_adjustment
        price_adj = attrs.get('price_adjustment')
        if price_adj is not None and price_adj != Decimal('0.00'):
            if not (request and request.user and request.user.is_authenticated and request.user.is_admin_user):
                raise serializers.ValidationError({"price_adjustment": "Only administrators may set or modify variant pricing."})

        # Name uniqueness per product
        product = attrs.get('product', self.instance.product if self.instance else None)
        name = attrs.get('name', self.instance.name if self.instance else None)
        if product and name:
            qs = ProductVariant.objects.filter(product=product, name__iexact=name.strip())
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"name": f"A variant named '{name.strip()}' already exists for this product."})

        return attrs

class ProductSerializer(serializers.ModelSerializer):
    variants = ProductVariantSerializer(many=True, read_only=True)
    variants_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'name', 'product_type', 'sales_price', 'cost_price',
            'description', 'notes', 'is_active', 'created_at', 'updated_at',
            'variants', 'variants_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'variants', 'variants_count']

    def get_variants_count(self, obj):
        return obj.variants.count()

    def validate(self, attrs):
        request = self.context.get('request')
        # Enforce rule: Only admins may set or modify product pricing
        sales_price = attrs.get('sales_price')
        cost_price = attrs.get('cost_price')

        if sales_price is not None and sales_price < Decimal('0.00'):
            raise serializers.ValidationError({"sales_price": "Sales price cannot be negative."})
        if cost_price is not None and cost_price < Decimal('0.00'):
            raise serializers.ValidationError({"cost_price": "Cost price cannot be negative."})

        if self.instance:
            if sales_price is not None or cost_price is not None:
                if not (request and request.user and request.user.is_authenticated and request.user.is_admin_user):
                    raise serializers.ValidationError({"sales_price": "Only administrators can alter product prices."})
        else:
            if sales_price is not None or cost_price is not None:
                if not (request and request.user and request.user.is_authenticated and request.user.is_admin_user):
                    raise serializers.ValidationError({"sales_price": "Only administrators can set initial product prices."})

        sku = attrs.get('sku')
        if sku:
            attrs['sku'] = sku.strip()
            qs = Product.objects.filter(sku__iexact=attrs['sku'])
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"sku": "A product with this SKU already exists."})

        return attrs
