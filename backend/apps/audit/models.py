from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class AuditEvent(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_events'
    )
    user_email = models.CharField(max_length=255, blank=True)
    action = models.CharField(_('action'), max_length=100, db_index=True)
    entity_type = models.CharField(_('entity type'), max_length=100, db_index=True)
    entity_id = models.CharField(_('entity ID / reference'), max_length=100, db_index=True)
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = _('audit event')
        verbose_name_plural = _('audit events')
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {self.user_email or 'System'}: {self.action} on {self.entity_type} {self.entity_id}"

    @classmethod
    def log_event(cls, action, entity_type, entity_id, description='', user=None, metadata=None, ip_address=None):
        safe_meta = metadata or {}
        # Ensure passwords or tokens are never logged
        for sensitive_key in ['password', 'token', 'secret', 'key']:
            if sensitive_key in safe_meta:
                safe_meta[sensitive_key] = '[REDACTED]'
        
        user_email = user.email if (user and user.is_authenticated) else 'System'
        return cls.objects.create(
            user=user if (user and user.is_authenticated) else None,
            user_email=user_email,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            description=description,
            metadata=safe_meta,
            ip_address=ip_address
        )

