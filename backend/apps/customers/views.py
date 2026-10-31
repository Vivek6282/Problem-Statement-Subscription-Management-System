from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import CustomerAccessPolicyPermission
from .models import Customer, CustomerStatus
from .serializers import CustomerSerializer, CustomerCreateUpdateSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    """
    CRUD management for Customers.
    Admins and Staff have full visibility. Customers can only view/update their own profile.
    """
    queryset = Customer.objects.all().order_by('-created_at')
    permission_classes = [CustomerAccessPolicyPermission]
    filterset_fields = ['status', 'country']
    search_fields = ['reference', 'name', 'company', 'email', 'phone']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CustomerCreateUpdateSerializer
        return CustomerSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Customer.objects.none()
        if user.is_staff_user:
            return Customer.objects.all().order_by('-created_at')
        # Customer role can only access their own profile
        return Customer.objects.filter(user=user)

    def perform_destroy(self, instance):
        # Soft-delete: Protect historical financial records from destructive deletion
        instance.status = CustomerStatus.ARCHIVED
        instance.save()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def archive(self, request, pk=None):
        customer = self.get_object()
        customer.status = CustomerStatus.ARCHIVED
        customer.save()
        return Response({'status': 'Customer archived successfully.'})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def restore(self, request, pk=None):
        customer = self.get_object()
        customer.status = CustomerStatus.ACTIVE
        customer.save()
        return Response({'status': 'Customer restored to active.'})

