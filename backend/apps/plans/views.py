from django.db.models import Count, Q
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from apps.accounts.permissions import IsAdminUserOnly
from apps.audit.models import AuditEvent
from .models import Plan
from .serializers import PlanSerializer


class PlanViewSet(viewsets.ModelViewSet):
    """
    Subscription plans. Anyone can read the (active) catalogue; only Admins create / edit / deactivate plans.
    A plan that subscriptions or quotations refer to is deactivated instead of deleted.
    """
    serializer_class = PlanSerializer
    filterset_fields = ['billing_interval', 'is_active', 'allow_pause', 'allow_renewal']
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['price', 'name', 'created_at', 'billing_interval']

    def get_queryset(self):
        qs = Plan.objects.annotate(
            n_active_subscriptions=Count('subscriptions', filter=Q(subscriptions__status='ACTIVE'), distinct=True)
        ).order_by('price')
        user = self.request.user
        if user.is_authenticated and user.is_staff_user:
            return qs
        return qs.filter(is_active=True)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUserOnly()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        plan = serializer.save()
        AuditEvent.log_event('PLAN_CREATED', 'Plan', plan.code, f"Plan {plan.name} created.", user=self.request.user)

    def perform_update(self, serializer):
        plan = serializer.save()
        AuditEvent.log_event('PLAN_UPDATED', 'Plan', plan.code, f"Plan {plan.name} updated (active={plan.is_active}).", user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        plan = self.get_object()
        if plan.subscriptions.exists() or plan.quotations.exists() or plan.quotation_templates.exists():
            plan.is_active = False
            plan.save(update_fields=['is_active', 'updated_at'])
            AuditEvent.log_event('PLAN_DEACTIVATED', 'Plan', plan.code, "Plan in use; deactivated instead of deleted.", user=request.user)
            return Response({'message': 'This plan is used by existing subscriptions or quotations, so it was deactivated instead of deleted.',
                             'archived': True})
        plan.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
