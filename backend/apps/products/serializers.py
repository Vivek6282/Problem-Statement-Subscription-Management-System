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

    def validate_sales_price(self, value):
        if value < Decimal('0.00'):
            raise serializers.ValidationError("Sales price cannot be negative.")
        return value

    def validate_cost_price(self, value):
        if value < Decimal('0.00'):
            raise serializers.ValidationError("Cost price cannot be negative.")
        return value
