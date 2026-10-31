from django.db.models import Count, Q, Sum, Subquery, OuterRef, DecimalField
from django.db.models.functions import Coalesce
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import CustomerAccessPolicyPermission, IsStaffOrAdmin
from apps.audit.models import AuditEvent
from apps.invoices.models import Invoice, InvoiceStatus
from .models import Customer, CustomerStatus
from .serializers import CustomerSerializer, CustomerCreateUpdateSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    """
    CRUD management for Customers.
    Admins and Staff have full visibility and write access. Customers can only read their own profile
    (they edit their personal details through /auth/me/).
    """
    permission_classes = [CustomerAccessPolicyPermission]
    filterset_fields = {'status': ['exact'], 'country': ['exact'], 'created_at': ['date__gte', 'date__lte']}
    search_fields = ['reference', 'name', 'company', 'email', 'phone']
    ordering_fields = ['created_at', 'name', 'company', 'email', 'reference']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Customer.objects.none()
        open_statuses = [InvoiceStatus.CONFIRMED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]
        outstanding = (
            Invoice.objects.filter(customer=OuterRef('pk'), status__in=open_statuses)
            .values('customer').annotate(total=Sum('balance_due')).values('total')
        )
        qs = Customer.objects.annotate(
            n_subscriptions=Count('subscriptions', distinct=True),
            n_active_subscriptions=Count('subscriptions', filter=Q(subscriptions__status='ACTIVE'), distinct=True),
            outstanding_total=Coalesce(Subquery(outstanding, output_field=DecimalField(max_digits=14, decimal_places=2)), 0,
                                       output_field=DecimalField(max_digits=14, decimal_places=2)),
        ).order_by('-created_at')
        if user.is_staff_user:
            return qs
        # Customer role can only access their own profile
        return qs.filter(user=user)

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CustomerCreateUpdateSerializer
        return CustomerSerializer

    def perform_create(self, serializer):
        customer = serializer.save()
        AuditEvent.log_event('CUSTOMER_CREATED', 'Customer', customer.reference,
                             f"Customer {customer.name} created.", user=self.request.user)

    def perform_update(self, serializer):
        customer = serializer.save()
        AuditEvent.log_event('CUSTOMER_UPDATED', 'Customer', customer.reference,
                             f"Customer {customer.name} updated.", user=self.request.user)

    def perform_destroy(self, instance):
        # Soft-delete: protect historical financial records from destructive deletion
        instance.status = CustomerStatus.ARCHIVED
        instance.save(update_fields=['status', 'updated_at'])
        AuditEvent.log_event('CUSTOMER_ARCHIVED', 'Customer', instance.reference,
                             "Customer archived (soft delete).", user=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin])
    def archive(self, request, pk=None):
        customer = self.get_object()
        customer.status = CustomerStatus.ARCHIVED
        customer.save(update_fields=['status', 'updated_at'])
        AuditEvent.log_event('CUSTOMER_ARCHIVED', 'Customer', customer.reference, "Customer archived.", user=request.user)
        return Response({'status': 'Customer archived successfully.'})

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin])
    def restore(self, request, pk=None):
        customer = self.get_object()
        customer.status = CustomerStatus.ACTIVE
        customer.save(update_fields=['status', 'updated_at'])
        AuditEvent.log_event('CUSTOMER_RESTORED', 'Customer', customer.reference, "Customer restored.", user=request.user)
        return Response({'status': 'Customer restored to active.'})
