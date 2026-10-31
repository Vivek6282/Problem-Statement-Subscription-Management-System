from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DiscountViewSet, DiscountRedemptionViewSet

router = DefaultRouter()
router.register(r'redemptions', DiscountRedemptionViewSet, basename='discount-redemptions')
router.register(r'', DiscountViewSet, basename='discounts')

urlpatterns = [
    path('', include(router.urls)),
]

