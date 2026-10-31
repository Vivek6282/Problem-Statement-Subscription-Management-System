from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaxRuleViewSet

router = DefaultRouter()
router.register(r'', TaxRuleViewSet, basename='taxes')

urlpatterns = [
    path('', include(router.urls)),
]

