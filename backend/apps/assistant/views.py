from rest_framework import serializers, status, views
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminUserOnly, IsStaffOrAdmin
from apps.audit.models import AuditEvent

from . import provider
from .models import AssistantSettings


class StatusView(views.APIView):
    """Whether AI features can be used. Never returns keys or model names."""
    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        available, reason = provider.availability()
        return Response({'available': available, 'reason': reason})


class SettingsSerializer(serializers.Serializer):
    ai_enabled = serializers.BooleanField()


class SettingsView(views.APIView):
    permission_classes = [IsAdminUserOnly]

    def get(self, request):
        return Response({'ai_enabled': AssistantSettings.load().ai_enabled})

    def patch(self, request):
        serializer = SettingsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        row = AssistantSettings.load()
        old = row.ai_enabled
        row.ai_enabled = serializer.validated_data['ai_enabled']
        row.save()
        AuditEvent.log_event(
            action='AI_SETTINGS_CHANGED',
            entity_type='AssistantSettings',
            entity_id=row.pk,
            description=f'AI assistant switch changed from {old} to {row.ai_enabled}.',
            user=request.user,
            metadata={'old': old, 'new': row.ai_enabled},
        )
        return Response({'ai_enabled': row.ai_enabled}, status=status.HTTP_200_OK)
