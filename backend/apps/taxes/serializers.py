from rest_framework import serializers
from .models import TaxRule

class TaxRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxRule
        fields = [
            'id', 'name', 'percentage', 'applicable_products',
            'effective_from', 'effective_to', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

