from rest_framework import viewsets, permissions
from apps.accounts.permissions import IsStaffOrAdmin
from .models import Plan
from .serializers import PlanSerializer

class PlanViewSet(viewsets.ModelViewSet):
    """
    CRUD management for Subscription Plans.
    Read-only for customers; editable by Staff and Admins.
    """
    queryset = Plan.objects.all().order_by('price')
    serializer_class = PlanSerializer
    filterset_fields = ['billing_interval', 'is_active', 'allow_pause', 'allow_renewal']
    search_fields = ['name', 'code', 'description']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsStaffOrAdmin()]
        return [permissions.AllowAny()]

