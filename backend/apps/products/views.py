from rest_framework import viewsets, status
from rest_framework.response import Response
from apps.accounts.permissions import IsAdminOrReadOnly
from apps.audit.models import AuditEvent
from apps.subscriptions.models import SubscriptionItem
from apps.quotations.models import QuotationItem, QuotationTemplateItem
from .models import Product, ProductVariant
from .serializers import ProductSerializer, ProductVariantSerializer


def _product_in_use(product):
    return (SubscriptionItem.objects.filter(product=product).exists()
            or QuotationItem.objects.filter(product=product).exists()
            or QuotationTemplateItem.objects.filter(product=product).exists())


def _variant_in_use(variant):
    return (SubscriptionItem.objects.filter(variant=variant).exists()
            or QuotationItem.objects.filter(variant=variant).exists()
            or QuotationTemplateItem.objects.filter(variant=variant).exists())


class ProductViewSet(viewsets.ModelViewSet):
    """
    CRUD for Products. Admins create / edit / delete; Staff and Customers can read.
    A product that appears in subscriptions, quotations or templates is archived (deactivated) instead of
    deleted, so historical financial records stay intact.
    """
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ['product_type', 'is_active']
    search_fields = ['sku', 'name', 'description']
    ordering_fields = ['name', 'sku', 'sales_price', 'created_at']

    def get_queryset(self):
        qs = Product.objects.all().prefetch_related('variants').order_by('name')
        user = self.request.user
        if user.is_authenticated and user.is_staff_user:
            return qs
        return qs.filter(is_active=True)

    def perform_create(self, serializer):
        product = serializer.save()
        AuditEvent.log_event('PRODUCT_CREATED', 'Product', product.sku, f"Product {product.name} created.", user=self.request.user)

    def perform_update(self, serializer):
        product = serializer.save()
        AuditEvent.log_event('PRODUCT_UPDATED', 'Product', product.sku, f"Product {product.name} updated.", user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        if _product_in_use(product):
            product.is_active = False
            product.save(update_fields=['is_active', 'updated_at'])
            AuditEvent.log_event('PRODUCT_ARCHIVED', 'Product', product.sku,
                                 "Product is referenced by financial records; archived instead of deleted.", user=request.user)
            return Response({'message': 'This product is used by existing subscriptions or quotations, so it was archived (deactivated) instead of deleted.',
                             'archived': True}, status=status.HTTP_200_OK)
        AuditEvent.log_event('PRODUCT_DELETED', 'Product', product.sku, f"Product {product.name} deleted.", user=request.user)
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductVariantViewSet(viewsets.ModelViewSet):
    """Variants (e.g. brand) with a configurable price adjustment. Admin writes, everyone authenticated reads."""
    serializer_class = ProductVariantSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ['product', 'is_active']
    search_fields = ['name', 'sku_suffix', 'product__name']

    def get_queryset(self):
        qs = ProductVariant.objects.all().select_related('product')
        user = self.request.user
        if user.is_authenticated and user.is_staff_user:
            return qs
        return qs.filter(is_active=True)

    def destroy(self, request, *args, **kwargs):
        variant = self.get_object()
        if _variant_in_use(variant):
            variant.is_active = False
            variant.save(update_fields=['is_active', 'updated_at'])
            return Response({'message': 'This variant is used by existing records, so it was deactivated instead of deleted.',
                             'archived': True}, status=status.HTTP_200_OK)
        variant.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
