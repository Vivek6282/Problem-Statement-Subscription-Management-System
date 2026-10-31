import datetime
from decimal import Decimal
from rest_framework import serializers
from .models import Discount, DiscountRedemption


class DiscountSerializer(serializers.ModelSerializer):
    times_redeemed = serializers.IntegerField(read_only=True)
    is_valid_now = serializers.SerializerMethodField()

    class Meta:
        model = Discount
        fields = [
            'id', 'code', 'name', 'discount_type', 'value',
            'min_purchase_amount', 'min_quantity', 'usage_limit',
            'times_redeemed', 'start_date', 'end_date',
            'applicable_products', 'applicable_plans', 'is_active',
            'is_valid_now', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'times_redeemed', 'is_valid_now', 'created_at', 'updated_at']

    def validate_code(self, value):
        val = value.strip().upper()
        if not val:
            raise serializers.ValidationError("Discount code cannot be blank.")
        qs = Discount.objects.filter(code__iexact=val)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A discount with this code already exists.")
        return val

    def validate(self, attrs):
        inst = self.instance
        dtype = attrs.get('discount_type', inst.discount_type if inst else 'PERCENTAGE')
        value = attrs.get('value', inst.value if inst else None)
        start = attrs.get('start_date', inst.start_date if inst else None)
        end = attrs.get('end_date', inst.end_date if inst else None)

        if value is not None:
            if value <= Decimal('0.00'):
                raise serializers.ValidationError({'value': "Discount value must be greater than zero."})
            if dtype == 'PERCENTAGE' and value > Decimal('100.00'):
                raise serializers.ValidationError({'value': "A percentage discount cannot exceed 100%."})

        if start and end and end < start:
            raise serializers.ValidationError({'end_date': "End date must be on or after start date."})

        min_purchase = attrs.get('min_purchase_amount')
        if min_purchase is not None and min_purchase < Decimal('0.00'):
            raise serializers.ValidationError({'min_purchase_amount': "Minimum purchase amount cannot be negative."})

        min_quantity = attrs.get('min_quantity')
        if min_quantity is not None and min_quantity < 1:
            raise serializers.ValidationError({'min_quantity': "Minimum quantity must be at least 1."})

        usage_limit = attrs.get('usage_limit')
        if usage_limit is not None and usage_limit < 1:
            raise serializers.ValidationError({'usage_limit': "Usage limit must be at least 1 (leave blank for unlimited)."})

        return attrs

    def get_is_valid_now(self, obj):
        today = datetime.date.today()
        if not obj.is_active:
            return False
        if obj.start_date and today < obj.start_date:
            return False
        if obj.end_date and today > obj.end_date:
            return False
        if obj.usage_limit is not None and obj.times_redeemed >= obj.usage_limit:
            return False
        return True


class DiscountValidateRequestSerializer(serializers.Serializer):
    code = serializers.CharField(required=True)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    quantity = serializers.IntegerField(default=1, required=False)
    product_id = serializers.IntegerField(required=False, allow_null=True)
    plan_id = serializers.IntegerField(required=False, allow_null=True)


class DiscountRedemptionSerializer(serializers.ModelSerializer):
    discount_code = serializers.CharField(source='discount.code', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = DiscountRedemption
        fields = [
            'id', 'discount', 'discount_code', 'customer', 'customer_name',
            'subscription', 'invoice', 'amount_discounted', 'redeemed_at'
        ]
        read_only_fields = ['id', 'redeemed_at']
