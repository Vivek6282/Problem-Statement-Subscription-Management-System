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
        return obj.subscriptions.filter(status='ACTIVE').count() if hasattr(obj, 'subscriptions') else 0

    def validate(self, attrs):
        start = attrs.get('availability_start_date', self.instance.availability_start_date if self.instance else None)
        end = attrs.get('availability_end_date', self.instance.availability_end_date if self.instance else None)
        if start and end and start > end:
            raise serializers.ValidationError({
                'availability_end_date': "Availability end date must be on or after start date."
            })
        
        request = self.context.get('request')
        if 'price' in attrs and self.instance:
            if not (request and request.user.is_admin_user):
                raise serializers.ValidationError({"price": "Only administrators can modify plan pricing."})

        return attrs

