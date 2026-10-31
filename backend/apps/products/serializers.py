from rest_framework import serializers
from decimal import Decimal
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
        if self.instance and 'price_adjustment' in attrs:
            if not (request and request.user.is_admin_user):
                raise serializers.ValidationError({"price_adjustment": "Only administrators may modify variant pricing."})
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
        # Enforce rule: Only admins may modify product pricing
        if self.instance:
            if ('sales_price' in attrs or 'cost_price' in attrs):
                if not (request and request.user.is_admin_user):
                    raise serializers.ValidationError({"sales_price": "Only administrators can alter product prices."})
        else:
            if ('sales_price' in attrs or 'cost_price' in attrs):
                if not (request and request.user.is_admin_user):
                    raise serializers.ValidationError({"sales_price": "Only administrators can set initial product prices."})
        return attrs

