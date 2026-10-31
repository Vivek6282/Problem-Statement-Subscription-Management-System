from rest_framework import serializers
from .models import AuditEvent

class AuditEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditEvent
        fields = [
            'id', 'user', 'user_email', 'action', 'entity_type',
            'entity_id', 'description', 'metadata', 'ip_address', 'created_at'
        ]
        read_only_fields = fields

