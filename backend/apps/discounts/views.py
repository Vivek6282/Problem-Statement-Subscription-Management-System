from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import IsAdminUserOnly, IsStaffOrAdmin
from apps.audit.models import AuditEvent
from apps.products.models import Product
from apps.plans.models import Plan
from apps.subscriptions.models import SubscriptionItem
from .models import Discount, DiscountRedemption
from .serializers import DiscountSerializer, DiscountValidateRequestSerializer, DiscountRedemptionSerializer


def _discount_in_use(discount):
    if discount.redemptions.exists():
        return True
    if SubscriptionItem.objects.filter(discount=discount).exists():
        return True
    return False


class DiscountViewSet(viewsets.ModelViewSet):
    """
    Discount rules management.
    Writes are strictly admin-only.
    Staff can view all discounts and validate codes; customers only see discounts attached to their own records.
    """
    serializer_class = DiscountSerializer
    filterset_fields = ['discount_type', 'is_active']
    search_fields = ['code', 'name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUserOnly()]
        if self.action == 'validate_code':
            return [IsStaffOrAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Discount.objects.none()
        if user.is_staff_user:
            return Discount.objects.all().prefetch_related('applicable_products', 'applicable_plans').order_by('-created_at')
        return Discount.objects.filter(redemptions__customer__user=user).prefetch_related('applicable_products', 'applicable_plans').distinct().order_by('-created_at')

    def perform_create(self, serializer):
        discount = serializer.save()
        AuditEvent.log_event(
            action='DISCOUNT_CREATED',
            entity_type='Discount',
            entity_id=discount.id,
            description=f"Discount {discount.code} ({discount.name}) created.",
            user=self.request.user,
            metadata={'discount_type': discount.discount_type, 'value': str(discount.value)}
        )

    def perform_update(self, serializer):
        old_discount = self.get_object()
        old_val = old_discount.value
        discount = serializer.save()
        meta = {}
        if discount.value != old_val:
            meta = {
                'old_value': str(old_val),
                'new_value': str(discount.value)
            }
        AuditEvent.log_event(
            action='DISCOUNT_UPDATED',
            entity_type='Discount',
            entity_id=discount.id,
            description=f"Discount {discount.code} ({discount.name}) updated.",
            user=self.request.user,
            metadata=dict(meta)
        )

    def destroy(self, request, *args, **kwargs):
        discount = self.get_object()
        if _discount_in_use(discount):
            discount.is_active = False
            discount.save(update_fields=['is_active', 'updated_at'])
            AuditEvent.log_event(
                action='DISCOUNT_ARCHIVED',
                entity_type='Discount',
                entity_id=discount.id,
                description=f"Discount {discount.code} archived because it is referenced in existing records.",
                user=request.user
            )
            return Response(
                {
                    'message': 'This discount is referenced by existing redemptions or subscription lines, so it was deactivated instead of deleted.',
                    'archived': True
                },
                status=status.HTTP_200_OK
            )

        AuditEvent.log_event(
            action='DISCOUNT_DELETED',
            entity_type='Discount',
            entity_id=discount.id,
            description=f"Discount {discount.code} deleted.",
            user=request.user
        )
        discount.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='validate-code', permission_classes=[IsStaffOrAdmin])
    def validate_code(self, request):
        serializer = DiscountValidateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data['code'].strip().upper()
        subtotal = serializer.validated_data['subtotal']
        quantity = serializer.validated_data.get('quantity', 1)
        product_id = serializer.validated_data.get('product_id')
        plan_id = serializer.validated_data.get('plan_id')

        product = Product.objects.filter(id=product_id).first() if product_id else None
        plan = Plan.objects.filter(id=plan_id).first() if plan_id else None

        discount = Discount.objects.filter(code__iexact=code).first()
        if not discount:
            return Response({'valid': False, 'message': 'Coupon code does not exist.'}, status=status.HTTP_404_NOT_FOUND)

        is_eligible, reason = discount.is_eligible(subtotal=subtotal, quantity=quantity, product=product, plan=plan)
        if not is_eligible:
            return Response({'valid': False, 'message': reason}, status=status.HTTP_400_BAD_REQUEST)

        calculated_discount = discount.calculate_discount(subtotal)
        return Response({
            'valid': True,
            'discount_id': discount.id,
            'code': discount.code,
            'discount_amount': calculated_discount,
            'new_subtotal': max(0, subtotal - calculated_discount)
        })


class DiscountRedemptionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Discount redemption history.
    Staff and admins see all redemptions; customers only see their own.
    """
    serializer_class = DiscountRedemptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['discount', 'customer']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return DiscountRedemption.objects.none()
        if user.is_staff_user:
            return DiscountRedemption.objects.all().select_related('discount', 'customer').order_by('-redeemed_at')
        return DiscountRedemption.objects.filter(customer__user=user).select_related('discount', 'customer').order_by('-redeemed_at')
