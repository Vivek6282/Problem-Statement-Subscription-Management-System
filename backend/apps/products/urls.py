from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, ProductVariantViewSet

router = DefaultRouter()
router.register(r'variants', ProductVariantViewSet, basename='product-variants')
router.register(r'', ProductViewSet, basename='products')

urlpatterns = [
    path('', include(router.urls)),
]

