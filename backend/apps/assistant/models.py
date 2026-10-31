from django.db import models


class AssistantSettings(models.Model):
    """Single-row admin switch. The assistant needs this AND settings.AI_ENABLED."""
    ai_enabled = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'assistant settings'

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
