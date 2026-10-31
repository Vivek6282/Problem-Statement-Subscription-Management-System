from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from apps.accounts.permissions import IsAdminUserOnly, IsStaffOrAdmin
from apps.audit.models import AuditEvent
from apps.subscriptions.models import SubscriptionItem
from .models import TaxRule
from .serializers import TaxRuleSerializer


class TaxRuleViewSet(viewsets.ModelViewSet):
    """
    Tax rules management.
    Writes are strictly admin-only.
    Reads are staff/admin only. Customers have no access (403).
    """
    queryset = TaxRule.objects.all().prefetch_related('applicable_products').order_by('name')
    serializer_class = TaxRuleSerializer
    filterset_fields = ['is_active']
    search_fields = ['name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUserOnly()]
        return [IsStaffOrAdmin()]

    def perform_create(self, serializer):
        rule = serializer.save()
        AuditEvent.log_event(
            action='TAX_RULE_CREATED',
            entity_type='TaxRule',
            entity_id=rule.id,
            description=f"Tax rule {rule.name} ({rule.percentage}%) created.",
            user=self.request.user,
            metadata={'percentage': str(rule.percentage)}
        )

    def perform_update(self, serializer):
        old_rule = self.get_object()
        old_pct = old_rule.percentage
        rule = serializer.save()
        meta = {}
        if rule.percentage != old_pct:
            meta = {
                'old_percentage': str(old_pct),
                'new_percentage': str(rule.percentage)
            }
        AuditEvent.log_event(
            action='TAX_RULE_UPDATED',
            entity_type='TaxRule',
            entity_id=rule.id,
            description=f"Tax rule {rule.name} ({rule.percentage}%) updated.",
            user=self.request.user,
            metadata=dict(meta)
        )

    def destroy(self, request, *args, **kwargs):
        rule = self.get_object()
        if SubscriptionItem.objects.filter(tax_rule=rule).exists():
            rule.is_active = False
            rule.save(update_fields=['is_active', 'updated_at'])
            AuditEvent.log_event(
                action='TAX_RULE_ARCHIVED',
                entity_type='TaxRule',
                entity_id=rule.id,
                description=f"Tax rule {rule.name} archived because it is referenced in subscription lines.",
                user=request.user
            )
            return Response(
                {
                    'message': 'This tax rule is referenced by subscription lines, so it was deactivated instead of deleted.',
                    'archived': True
                },
                status=status.HTTP_200_OK
            )

        AuditEvent.log_event(
            action='TAX_RULE_DELETED',
            entity_type='TaxRule',
            entity_id=rule.id,
            description=f"Tax rule {rule.name} deleted.",
            user=request.user
        )
        rule.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
