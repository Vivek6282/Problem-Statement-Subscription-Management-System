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

    def get_is_valid_now(self, obj):
        import datetime
        today = datetime.date.today()
        if not obj.is_active:
            return False
        if obj.start_date and today < obj.start_date:
            return False
        if obj.end_date and today > obj.end_date:
            return False
        if obj.usage_limit and obj.times_redeemed >= obj.usage_limit:
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

