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

    def validate_percentage(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Tax percentage must be between 0 and 100.")
        return value

    def validate(self, attrs):
        start = attrs.get('effective_from', self.instance.effective_from if self.instance else None)
        end = attrs.get('effective_to', self.instance.effective_to if self.instance else None)
        if start and end and end < start:
            raise serializers.ValidationError({'effective_to': "End date must be on or after the start date."})
        return attrs

