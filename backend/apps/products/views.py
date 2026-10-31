from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import IsStaffOrAdmin, IsAdminUserOnly
from .models import Product, ProductVariant
from .serializers import ProductSerializer, ProductVariantSerializer

class ProductViewSet(viewsets.ModelViewSet):
    """
    CRUD for Products.
    Staff and Admins can create and edit. Pricing modifications are strictly limited to Admins.
    """
    queryset = Product.objects.all().prefetch_related('variants').order_by('name')
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['product_type', 'is_active']
    search_fields = ['sku', 'name', 'description']

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsStaffOrAdmin()]
        if self.action in ['update', 'partial_update']:
            return [IsStaffOrAdmin()]
        return [permissions.IsAuthenticated()]

class ProductVariantViewSet(viewsets.ModelViewSet):
    """
    Management of individual product variants.
    """
    queryset = ProductVariant.objects.all().select_related('product')
    serializer_class = ProductVariantSerializer
    permission_classes = [IsStaffOrAdmin]
    filterset_fields = ['product', 'is_active']
    search_fields = ['name', 'sku_suffix', 'product__name']

