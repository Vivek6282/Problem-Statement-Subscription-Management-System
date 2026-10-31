from rest_framework import viewsets, permissions
from apps.accounts.permissions import IsAdminUserOnly
from .models import TaxRule
from .serializers import TaxRuleSerializer

class TaxRuleViewSet(viewsets.ModelViewSet):
    """
    Tax rules management.
    Only Admins can modify tax configurations; authenticated staff can view rules.
    """
    queryset = TaxRule.objects.all().order_by('name')
    serializer_class = TaxRuleSerializer
    filterset_fields = ['is_active']
    search_fields = ['name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUserOnly()]
        return [permissions.IsAuthenticated()]

