from rest_framework import viewsets, permissions, status
from apps.accounts.permissions import CustomerAccessPolicyPermission, IsStaffOrAdmin
from .models import Payment
from .serializers import PaymentSerializer, PaymentCreateSerializer

class PaymentViewSet(viewsets.ModelViewSet):
    """
    Management and recording of payments.
    Admins and Staff can log payments. Customers can inspect payments made against their account.
    """
    queryset = Payment.objects.all().select_related('customer', 'invoice').order_by('-payment_date', '-created_at')
    permission_classes = [CustomerAccessPolicyPermission]
    filterset_fields = ['payment_method', 'invoice', 'customer']
    search_fields = ['payment_number', 'transaction_reference', 'customer__name', 'invoice__invoice_number']

    def get_serializer_class(self):
        if self.action == 'create':
            return PaymentCreateSerializer
        return PaymentSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Payment.objects.none()
        if user.is_staff_user:
            return self.queryset
        return self.queryset.filter(customer__user=user)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsStaffOrAdmin()]
        return [permissions.IsAuthenticated()]

