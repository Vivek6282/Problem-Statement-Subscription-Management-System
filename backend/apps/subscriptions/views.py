from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
import datetime

from apps.accounts.permissions import CustomerAccessPolicyPermission, IsStaffOrAdmin
from apps.audit.models import AuditEvent
from .models import Subscription, SubscriptionStatus
from .serializers import SubscriptionSerializer, SubscriptionCreateSerializer
from .billing import BillingEngine

class SubscriptionViewSet(viewsets.ModelViewSet):
    """
    Subscription lifecycle and management endpoint.
    Strict tenant isolation applied: customers can only view their own subscriptions.
    """
    queryset = Subscription.objects.all().select_related('customer', 'plan').prefetch_related(
        'items__product', 'items__variant', 'items__tax_rule', 'items__discount'
    ).order_by('-created_at')
    permission_classes = [CustomerAccessPolicyPermission]
    filterset_fields = ['status', 'customer', 'plan', 'payment_terms']
    search_fields = ['subscription_number', 'customer__name', 'customer__company', 'plan__name']

    def get_serializer_class(self):
        if self.action == 'create':
            return SubscriptionCreateSerializer
        return SubscriptionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(SubscriptionSerializer(instance).data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Subscription.objects.none()
        if user.is_staff_user:
            return self.queryset
        # Customer isolation
        return self.queryset.filter(customer__user=user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def activate(self, request, pk=None):
        sub = self.get_object()
        if not sub.can_transition_to(SubscriptionStatus.ACTIVE):
            return Response({'error': f"Cannot activate from current status: {sub.status}"}, status=status.HTTP_400_BAD_REQUEST)
        
        old_status = sub.status
        sub.status = SubscriptionStatus.ACTIVE
        sub.save()

        AuditEvent.log_event(
            action='SUBSCRIPTION_ACTIVATED',
            entity_type='Subscription',
            entity_id=sub.subscription_number,
            description=f"Subscription changed from {old_status} to ACTIVE.",
            user=request.user
        )
        return Response(SubscriptionSerializer(sub).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def pause(self, request, pk=None):
        sub = self.get_object()
        if not sub.plan.allow_pause:
            return Response({'error': "This plan does not permit pausing."}, status=status.HTTP_400_BAD_REQUEST)
        if not sub.can_transition_to(SubscriptionStatus.PAUSED):
            return Response({'error': f"Cannot pause subscription from status: {sub.status}"}, status=status.HTTP_400_BAD_REQUEST)

        sub.status = SubscriptionStatus.PAUSED
        sub.save()

        AuditEvent.log_event(
            action='SUBSCRIPTION_PAUSED',
            entity_type='Subscription',
            entity_id=sub.subscription_number,
            description="Subscription paused.",
            user=request.user
        )
        return Response(SubscriptionSerializer(sub).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def resume(self, request, pk=None):
        sub = self.get_object()
        if not sub.can_transition_to(SubscriptionStatus.ACTIVE):
            return Response({'error': f"Cannot resume subscription from status: {sub.status}"}, status=status.HTTP_400_BAD_REQUEST)

        sub.status = SubscriptionStatus.ACTIVE
        sub.save()

        AuditEvent.log_event(
            action='SUBSCRIPTION_RESUMED',
            entity_type='Subscription',
            entity_id=sub.subscription_number,
            description="Subscription resumed to ACTIVE.",
            user=request.user
        )
        return Response(SubscriptionSerializer(sub).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def close(self, request, pk=None):
        sub = self.get_object()
        if not sub.can_transition_to(SubscriptionStatus.CLOSED):
            return Response({'error': f"Cannot close subscription from status: {sub.status}"}, status=status.HTTP_400_BAD_REQUEST)

        sub.status = SubscriptionStatus.CLOSED
        sub.save()

        AuditEvent.log_event(
            action='SUBSCRIPTION_CLOSED',
            entity_type='Subscription',
            entity_id=sub.subscription_number,
            description="Subscription closed.",
            user=request.user
        )
        return Response(SubscriptionSerializer(sub).data)

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin])
    def trigger_billing(self, request, pk=None):
        """
        Manually forces recurring billing calculation & invoice generation for this subscription.
        """
        sub = self.get_object()
        success, res = BillingEngine.process_subscription_billing(sub.id, target_date=datetime.date.today())
        if success:
            return Response({
                'message': f"Invoice {res.invoice_number} generated successfully.",
                'invoice_id': res.id,
                'total_amount': res.total_amount
            })
        return Response({'error': str(res)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[IsStaffOrAdmin], url_path='run-batch-billing')
    def run_batch_billing(self, request):
        """
        Triggers execution of recurring billing cycle across all active subscriptions due today.
        """
        date_str = request.data.get('date')
        target_date = datetime.date.fromisoformat(date_str) if date_str else datetime.date.today()
        results = BillingEngine.run_all_due_billing(target_date=target_date)
        return Response(results)
