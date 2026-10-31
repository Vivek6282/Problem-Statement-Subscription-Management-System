from rest_framework import viewsets, permissions
from apps.accounts.permissions import IsStaffOrAdmin
from .models import AuditEvent
from .serializers import AuditEventSerializer

class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only audit event log for Staff and Admin.
    """
    queryset = AuditEvent.objects.all().order_by('-created_at')
    serializer_class = AuditEventSerializer
    permission_classes = [IsStaffOrAdmin]
    filterset_fields = ['action', 'entity_type', 'entity_id']
    search_fields = ['action', 'entity_type', 'entity_id', 'user_email', 'description']

