import datetime
from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from apps.accounts.permissions import IsStaffOrAdmin, IsAdminUserOnly
from apps.audit.models import AuditEvent
from .models import Plan
from .serializers import PlanSerializer


def _plan_in_use(plan):
    from apps.subscriptions.models import Subscription
    from apps.quotations.models import Quotation
    return (
        Subscription.objects.filter(plan=plan).exists() or
        Quotation.objects.filter(plan=plan).exists()
    )


class PlanViewSet(viewsets.ModelViewSet):
    """
    CRUD management for Subscription Plans.
    Writes are strictly admin-only.
    Staff can view all plans; customers only see active, currently available plans.
    """
    serializer_class = PlanSerializer
    filterset_fields = ['billing_interval', 'is_active', 'allow_pause', 'allow_renewal']
    search_fields = ['name', 'code', 'description']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUserOnly()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = Plan.objects.all().order_by('price')
        user = self.request.user
        if user.is_authenticated and user.is_staff_user:
            return qs

        today = datetime.date.today()
        return qs.filter(
            is_active=True
        ).filter(
            Q(availability_start_date__isnull=True) | Q(availability_start_date__lte=today)
        ).filter(
            Q(availability_end_date__isnull=True) | Q(availability_end_date__gte=today)
        )

    def perform_create(self, serializer):
        plan = serializer.save()
        AuditEvent.log_event(
            action='PLAN_CREATED',
            entity_type='Plan',
            entity_id=plan.id,
            description=f"Plan {plan.name} ({plan.code}) created.",
            user=self.request.user,
            metadata={'price': str(plan.price), 'billing_interval': plan.billing_interval}
        )

    def perform_update(self, serializer):
        old_plan = self.get_object()
        old_price = old_plan.price
        plan = serializer.save()
        meta = {}
        if plan.price != old_price:
            meta = {
                'old_price': str(old_price),
                'new_price': str(plan.price)
            }
        AuditEvent.log_event(
            action='PLAN_UPDATED',
            entity_type='Plan',
            entity_id=plan.id,
            description=f"Plan {plan.name} ({plan.code}) updated.",
            user=self.request.user,
            metadata=dict(meta)
        )

    def destroy(self, request, *args, **kwargs):
        plan = self.get_object()
        if _plan_in_use(plan):
            plan.is_active = False
            plan.save(update_fields=['is_active', 'updated_at'])
            AuditEvent.log_event(
                action='PLAN_ARCHIVED',
                entity_type='Plan',
                entity_id=plan.id,
                description=f"Plan {plan.name} archived because it is referenced in existing records.",
                user=request.user
            )
            return Response(
                {
                    'message': 'This plan is referenced by existing subscriptions or quotations, so it was deactivated instead of deleted.',
                    'archived': True
                },
                status=status.HTTP_200_OK
            )
        AuditEvent.log_event(
            action='PLAN_DELETED',
            entity_type='Plan',
            entity_id=plan.id,
            description=f"Plan {plan.name} deleted.",
            user=request.user
        )
        plan.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
