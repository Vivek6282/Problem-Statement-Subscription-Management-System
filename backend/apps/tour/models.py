from django.conf import settings
from django.db import models


class TourPreference(models.Model):
    """Whether a user finished the welcome tour or asked never to see it automatically again."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tour_preference')
    completed = models.BooleanField(default=False)
    never_show = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)
