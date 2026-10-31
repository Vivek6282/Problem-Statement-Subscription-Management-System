from django.urls import path

from .views import ProductDescriptionView, SettingsView, StatusView

urlpatterns = [
    path('status/', StatusView.as_view(), name='assistant_status'),
    path('settings/', SettingsView.as_view(), name='assistant_settings'),
    path('product-description/', ProductDescriptionView.as_view(), name='assistant_product_description'),
]
