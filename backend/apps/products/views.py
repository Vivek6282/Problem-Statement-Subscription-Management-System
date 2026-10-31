from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from apps.accounts.permissions import IsStaffOrAdmin, IsAdminUserOnly
from apps.audit.models import AuditEvent
from .models import Product, ProductVariant
from .serializers import ProductSerializer, ProductVariantSerializer


def _product_in_use(product):
    from apps.subscriptions.models import SubscriptionItem
    from apps.quotations.models import QuotationItem
    if SubscriptionItem.objects.filter(product=product).exists():
        return True
    if QuotationItem.objects.filter(product=product).exists():
        return True
    for v in product.variants.all():
        if SubscriptionItem.objects.filter(variant=v).exists() or QuotationItem.objects.filter(variant=v).exists():
            return True
    return False


def _variant_in_use(variant):
    from apps.subscriptions.models import SubscriptionItem
    from apps.quotations.models import QuotationItem
    return (
        SubscriptionItem.objects.filter(variant=variant).exists() or
        QuotationItem.objects.filter(variant=variant).exists()
    )


class ProductViewSet(viewsets.ModelViewSet):
    """
    CRUD for Products.
    Create, update, and destroy are strictly admin-only.
    Staff and authenticated users can read; non-staff only see active records.
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['product_type', 'is_active']
    search_fields = ['sku', 'name', 'description']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUserOnly()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = Product.objects.all().prefetch_related('variants').order_by('name')
        user = self.request.user
        if user.is_authenticated and user.is_staff_user:
            return qs
        return qs.filter(is_active=True)

    def perform_create(self, serializer):
        product = serializer.save()
        AuditEvent.log_event(
            action='PRODUCT_CREATED',
            entity_type='Product',
            entity_id=product.id,
            description=f"Product {product.name} ({product.sku}) created.",
            user=self.request.user,
            metadata={'sales_price': str(product.sales_price), 'cost_price': str(product.cost_price)}
        )

    def perform_update(self, serializer):
        old_product = self.get_object()
        old_price = old_product.sales_price
        product = serializer.save()
        meta = {}
        if product.sales_price != old_price:
            meta = {
                'old_sales_price': str(old_price),
                'new_sales_price': str(product.sales_price)
            }
        AuditEvent.log_event(
            action='PRODUCT_UPDATED',
            entity_type='Product',
            entity_id=product.id,
            description=f"Product {product.name} ({product.sku}) updated.",
            user=self.request.user,
            metadata=dict(meta)
        )

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        if _product_in_use(product):
            product.is_active = False
            product.save(update_fields=['is_active', 'updated_at'])
            AuditEvent.log_event(
                action='PRODUCT_ARCHIVED',
                entity_type='Product',
                entity_id=product.id,
                description=f"Product {product.name} archived because it is referenced in existing records.",
                user=request.user
            )
            return Response(
                {
                    'message': 'This product is referenced by existing records, so it was deactivated instead of deleted.',
                    'archived': True
                },
                status=status.HTTP_200_OK
            )
        AuditEvent.log_event(
            action='PRODUCT_DELETED',
            entity_type='Product',
            entity_id=product.id,
            description=f"Product {product.name} deleted.",
            user=request.user
        )
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductVariantViewSet(viewsets.ModelViewSet):
    """
    Management of individual product variants.
    Writes are strictly admin-only.
    """
    serializer_class = ProductVariantSerializer
    filterset_fields = ['product', 'is_active']
    search_fields = ['name', 'sku_suffix', 'product__name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUserOnly()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = ProductVariant.objects.all().select_related('product')
        user = self.request.user
        if user.is_authenticated and user.is_staff_user:
            return qs
        return qs.filter(is_active=True)

    def perform_create(self, serializer):
        variant = serializer.save()
        AuditEvent.log_event(
            action='PRODUCT_VARIANT_CREATED',
            entity_type='ProductVariant',
            entity_id=variant.id,
            description=f"Variant {variant.name} created for product {variant.product.name}.",
            user=self.request.user,
            metadata={'price_adjustment': str(variant.price_adjustment)}
        )

    def perform_update(self, serializer):
        old_variant = self.get_object()
        old_adj = old_variant.price_adjustment
        variant = serializer.save()
        meta = {}
        if variant.price_adjustment != old_adj:
            meta = {
                'old_price_adjustment': str(old_adj),
                'new_price_adjustment': str(variant.price_adjustment)
            }
        AuditEvent.log_event(
            action='PRODUCT_VARIANT_UPDATED',
            entity_type='ProductVariant',
            entity_id=variant.id,
            description=f"Variant {variant.name} updated for product {variant.product.name}.",
            user=self.request.user,
            metadata=dict(meta)
        )

    def destroy(self, request, *args, **kwargs):
        variant = self.get_object()
        if _variant_in_use(variant):
            variant.is_active = False
            variant.save(update_fields=['is_active', 'updated_at'])
            AuditEvent.log_event(
                action='PRODUCT_VARIANT_ARCHIVED',
                entity_type='ProductVariant',
                entity_id=variant.id,
                description=f"Variant {variant.name} archived because it is referenced in existing records.",
                user=request.user
            )
            return Response(
                {
                    'message': 'This variant is referenced by existing records, so it was deactivated instead of deleted.',
                    'archived': True
                },
                status=status.HTTP_200_OK
            )
        AuditEvent.log_event(
            action='PRODUCT_VARIANT_DELETED',
            entity_type='ProductVariant',
            entity_id=variant.id,
            description=f"Variant {variant.name} deleted.",
            user=request.user
        )
        variant.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
