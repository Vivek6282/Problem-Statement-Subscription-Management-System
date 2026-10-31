from rest_framework import serializers
from .models import Customer, CustomerStatus

class CustomerSerializer(serializers.ModelSerializer):
    subscriptions_count = serializers.SerializerMethodField()
    active_subscriptions_count = serializers.SerializerMethodField()
    outstanding_balance = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id', 'reference', 'user', 'name', 'company', 'email', 'phone',
            'address_line1', 'address_line2', 'city', 'state', 'postal_code',
            'country', 'status', 'created_at', 'updated_at',
            'subscriptions_count', 'active_subscriptions_count', 'outstanding_balance'
        ]
        read_only_fields = ['id', 'reference', 'created_at', 'updated_at', 'subscriptions_count', 'active_subscriptions_count', 'outstanding_balance']

    # The viewset annotates these in a single query; the fallbacks keep the serializer usable on its own.
    def get_subscriptions_count(self, obj):
        value = getattr(obj, 'n_subscriptions', None)
        return value if value is not None else obj.subscriptions.count()

    def get_active_subscriptions_count(self, obj):
        value = getattr(obj, 'n_active_subscriptions', None)
        return value if value is not None else obj.subscriptions.filter(status='ACTIVE').count()

    def get_outstanding_balance(self, obj):
        value = getattr(obj, 'outstanding_total', None)
        if value is not None:
            return value
        from django.db.models import Sum
        return obj.invoices.filter(status__in=['CONFIRMED', 'PARTIALLY_PAID', 'OVERDUE']).aggregate(t=Sum('balance_due'))['t'] or 0


class CustomerBriefSerializer(serializers.ModelSerializer):
    """Light nested representation used inside subscriptions, quotations, invoices and payments (no per-row queries)."""
    class Meta:
        model = Customer
        fields = ['id', 'reference', 'name', 'company', 'email', 'phone', 'address_line1', 'address_line2',
                  'city', 'state', 'postal_code', 'country', 'status']
        read_only_fields = fields

class CustomerCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'company', 'email', 'phone',
            'address_line1', 'address_line2', 'city', 'state', 'postal_code',
            'country', 'status'
        ]
        read_only_fields = ['id']

