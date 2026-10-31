from rest_framework import serializers
from apps.customers.serializers import CustomerSerializer
from apps.invoices.serializers import InvoiceSerializer
from .models import Payment, PaymentMethod
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
            'transaction_reference', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'payment_number', 'customer', 'customer_name', 'customer_company', 'created_at']

class PaymentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'invoice', 'amount', 'payment_method',
            'payment_date', 'transaction_reference', 'notes'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        invoice = validated_data['invoice']
        amount = validated_data['amount']
        payment_method = validated_data['payment_method']
        transaction_reference = validated_data.get('transaction_reference', '')
        notes = validated_data.get('notes', '')
        payment_date = validated_data.get('payment_date')
        user = self.context['request'].user

        return PaymentService.record_payment(
            invoice_id=invoice.id,
            amount=amount,
            payment_method=payment_method,
            transaction_reference=transaction_reference,
            notes=notes,
            payment_date=payment_date,
            user=user
        )

