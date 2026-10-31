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

    def get_subscriptions_count(self, obj):
        return obj.subscriptions.count() if hasattr(obj, 'subscriptions') else 0

    def get_active_subscriptions_count(self, obj):
        return obj.subscriptions.filter(status='ACTIVE').count() if hasattr(obj, 'subscriptions') else 0

    def get_outstanding_balance(self, obj):
        if hasattr(obj, 'invoices'):
            return sum(inv.balance_due for inv in obj.invoices.filter(status__in=['CONFIRMED', 'PARTIALLY_PAID', 'OVERDUE']))
        return 0

class CustomerCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'company', 'email', 'phone',
            'address_line1', 'address_line2', 'city', 'state', 'postal_code',
            'country', 'status'
        ]
        read_only_fields = ['id']

