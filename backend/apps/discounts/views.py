from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import IsAdminUserOnly, IsStaffOrAdmin
from apps.audit.models import AuditEvent
from apps.products.models import Product
from apps.plans.models import Plan
from .models import Discount, DiscountRedemption
from .serializers import DiscountSerializer, DiscountValidateRequestSerializer, DiscountRedemptionSerializer


class DiscountViewSet(viewsets.ModelViewSet):
    """
    Discount rules. Only Admins create or change them. Staff can read all and test codes; a Customer only sees
    the discounts attached to their own subscriptions.
    """
    serializer_class = DiscountSerializer
    filterset_fields = ['discount_type', 'is_active']
    search_fields = ['code', 'name']
    ordering_fields = ['created_at', 'code', 'value', 'end_date']

    def get_queryset(self):
        qs = Discount.objects.all().prefetch_related('applicable_products', 'applicable_plans').order_by('-created_at')
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.is_staff_user:
            return qs
        return qs.filter(
            Q(subscriptions__customer__user=user) | Q(subscription_items__subscription__customer__user=user)
        ).distinct()

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUserOnly()]
        if self.action == 'validate_code':
            return [IsStaffOrAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        d = serializer.save()
        AuditEvent.log_event('DISCOUNT_CREATED', 'Discount', d.code, f"Discount {d.name} created.", user=self.request.user)

    def perform_update(self, serializer):
        d = serializer.save()
        AuditEvent.log_event('DISCOUNT_UPDATED', 'Discount', d.code, f"Discount {d.name} updated (active={d.is_active}).", user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        d = self.get_object()
        if d.redemptions.exists() or d.subscriptions.exists() or d.subscription_items.exists() or d.quotations.exists():
            d.is_active = False
            d.save(update_fields=['is_active', 'updated_at'])
            return Response({'message': 'Discount has been used or attached, so it was deactivated instead of deleted.', 'archived': True})
        AuditEvent.log_event('DISCOUNT_DELETED', 'Discount', d.code, "Discount deleted.", user=request.user)
        d.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='validate-code')
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
    serializer_class = DiscountRedemptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['discount', 'customer']
    ordering_fields = ['redeemed_at']

    def get_queryset(self):
        qs = DiscountRedemption.objects.select_related('discount', 'customer').order_by('-redeemed_at')
        user = self.request.user
        if user.is_staff_user:
            return qs
        return qs.filter(customer__user=user)
