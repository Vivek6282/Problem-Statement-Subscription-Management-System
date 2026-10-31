from rest_framework import viewsets, status
from rest_framework.response import Response
from apps.accounts.permissions import IsAdminUserOnly, IsStaffOrAdmin
from apps.audit.models import AuditEvent
from apps.subscriptions.models import SubscriptionItem
from .models import TaxRule
from .serializers import TaxRuleSerializer


class TaxRuleViewSet(viewsets.ModelViewSet):
    """Tax rules. Only Admins can create or change them; Staff can view them. Customers have no access."""
    queryset = TaxRule.objects.all().prefetch_related('applicable_products').order_by('name')
    serializer_class = TaxRuleSerializer
    filterset_fields = ['is_active']
    search_fields = ['name']
    ordering_fields = ['name', 'percentage', 'effective_from']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUserOnly()]
        return [IsStaffOrAdmin()]

    def perform_create(self, serializer):
        rule = serializer.save()
        AuditEvent.log_event('TAX_RULE_CREATED', 'TaxRule', rule.id, f"Tax rule {rule.name} ({rule.percentage}%) created.", user=self.request.user)

    def perform_update(self, serializer):
        rule = serializer.save()
        AuditEvent.log_event('TAX_RULE_UPDATED', 'TaxRule', rule.id, f"Tax rule {rule.name} ({rule.percentage}%) updated.", user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        rule = self.get_object()
        if SubscriptionItem.objects.filter(tax_rule=rule).exists():
            rule.is_active = False
            rule.save(update_fields=['is_active', 'updated_at'])
            return Response({'message': 'Tax rule is attached to subscription lines, so it was deactivated instead of deleted.', 'archived': True})
        AuditEvent.log_event('TAX_RULE_DELETED', 'TaxRule', rule.id, f"Tax rule {rule.name} deleted.", user=request.user)
        rule.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
