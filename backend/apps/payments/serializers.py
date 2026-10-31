from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from .models import Payment
from .services import PaymentService


class PaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_company = serializers.CharField(source='customer.company', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'payment_number', 'invoice', 'invoice_number',
            'customer', 'customer_name', 'customer_company',
            'amount', 'payment_method', 'payment_date',
            'transaction_reference', 'notes', 'status', 'reversed_at', 'reversal_reason', 'created_at'
        ]
        read_only_fields = fields


class PaymentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'invoice', 'amount', 'payment_method',
            'payment_date', 'transaction_reference', 'notes'
        ]
        read_only_fields = ['id']
        extra_kwargs = {'transaction_reference': {'validators': []}}

    def create(self, validated_data):
        try:
            return PaymentService.record_payment(
                invoice_id=validated_data['invoice'].id,
                amount=validated_data['amount'],
                payment_method=validated_data['payment_method'],
                transaction_reference=validated_data.get('transaction_reference', ''),
                notes=validated_data.get('notes', ''),
                payment_date=validated_data.get('payment_date'),
                user=self.context['request'].user,
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'amount': exc.messages})

    def to_representation(self, instance):
        return PaymentSerializer(instance, context=self.context).data
