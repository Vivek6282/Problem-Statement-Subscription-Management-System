from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import IsAdminUserOnly
from apps.products.models import Product
from apps.plans.models import Plan
from .models import Discount, DiscountRedemption
from .serializers import DiscountSerializer, DiscountValidateRequestSerializer, DiscountRedemptionSerializer

class DiscountViewSet(viewsets.ModelViewSet):
    """
    Discount rules management.
    Only admins may create or alter discounts. All authenticated users can inspect and validate discount codes.
    """
    queryset = Discount.objects.all().order_by('-created_at')
    serializer_class = DiscountSerializer
    filterset_fields = ['discount_type', 'is_active']
    search_fields = ['code', 'name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUserOnly()]
        return [permissions.IsAuthenticated()]

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
    queryset = DiscountRedemption.objects.all().select_related('discount', 'customer').order_by('-redeemed_at')
    serializer_class = DiscountRedemptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['discount', 'customer']

