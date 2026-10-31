from decimal import Decimal
from rest_framework import serializers
from .models import Plan, BillingInterval

class PlanSerializer(serializers.ModelSerializer):
    interval_display = serializers.CharField(source='get_billing_interval_display', read_only=True)
    active_subscriptions_count = serializers.SerializerMethodField()

    class Meta:
        model = Plan
        fields = [
            'id', 'name', 'code', 'description', 'price', 'billing_interval',
            'interval_display', 'min_quantity', 'availability_start_date',
            'availability_end_date', 'allow_pause', 'allow_early_close',
            'allow_renewal', 'auto_close_on_expiry', 'is_active',
            'created_at', 'updated_at', 'active_subscriptions_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'interval_display', 'active_subscriptions_count']

    def get_active_subscriptions_count(self, obj):
        value = getattr(obj, 'n_active_subscriptions', None)
        return value if value is not None else obj.subscriptions.filter(status='ACTIVE').count()

    def validate(self, attrs):
        start = attrs.get('availability_start_date', self.instance.availability_start_date if self.instance else None)
        end = attrs.get('availability_end_date', self.instance.availability_end_date if self.instance else None)
        if start and end and start > end:
            raise serializers.ValidationError({
                'availability_end_date': "Availability end date must be on or after start date."
            })
        
        price = attrs.get('price', self.instance.price if self.instance else Decimal('0.00'))
        if price < Decimal('0.00'):
            raise serializers.ValidationError({'price': "Plan price cannot be negative."})
        min_qty = attrs.get('min_quantity', self.instance.min_quantity if self.instance else 1)
        if min_qty < 1:
            raise serializers.ValidationError({'min_quantity': "Minimum quantity must be at least 1."})
        return attrs



class PlanBriefSerializer(PlanSerializer):
    """Nested representation inside subscriptions / quotations: same fields, no per-row count query."""
    active_subscriptions_count = None

    class Meta(PlanSerializer.Meta):
        fields = [f for f in PlanSerializer.Meta.fields if f != 'active_subscriptions_count']
        read_only_fields = fields
