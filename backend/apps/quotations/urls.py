from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QuotationViewSet

router = DefaultRouter()
router.register(r'', QuotationViewSet, basename='quotations')

urlpatterns = [
    path('', include(router.urls)),
]

