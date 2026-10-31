from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import CustomerAccessPolicyPermission, IsAdminUserOnly
from .models import Payment
from .serializers import PaymentSerializer, PaymentCreateSerializer
from .services import PaymentService


class PaymentViewSet(viewsets.ModelViewSet):
    """
    Recording and tracking of payments.
    Admins and Staff record payments; customers can only read payments made against their own invoices.
    Payments are immutable (no edit / delete): a mistaken payment is reversed by an Admin, keeping the history.
    """
    permission_classes = [CustomerAccessPolicyPermission]
    customer_actions = ()
    http_method_names = ['get', 'post', 'head', 'options']
    filterset_fields = {
        'payment_method': ['exact'], 'status': ['exact'], 'invoice': ['exact'], 'customer': ['exact'],
        'payment_date': ['gte', 'lte'],
    }
    search_fields = ['payment_number', 'transaction_reference', 'customer__name', 'invoice__invoice_number']
    ordering_fields = ['payment_date', 'created_at', 'amount', 'payment_number']

    def get_queryset(self):
        user = self.request.user
        qs = Payment.objects.select_related('customer', 'invoice').order_by('-payment_date', '-created_at')
        if not user.is_authenticated:
            return qs.none()
        if user.is_staff_user:
            return qs
        return qs.filter(customer__user=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return PaymentCreateSerializer
        return PaymentSerializer

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUserOnly])
    def reverse(self, request, pk=None):
        payment = self.get_object()
        try:
            payment = PaymentService.reverse_payment(payment.id, reason=request.data.get('reason', ''), user=request.user)
        except DjangoValidationError as exc:
            return Response({'error': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PaymentSerializer(payment, context=self.get_serializer_context()).data)
