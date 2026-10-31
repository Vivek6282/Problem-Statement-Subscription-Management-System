from django.urls import path

from .views import SettingsView, StatusView

urlpatterns = [
    path('status/', StatusView.as_view(), name='assistant_status'),
    path('settings/', SettingsView.as_view(), name='assistant_settings'),
]
