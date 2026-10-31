from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
import datetime

from apps.accounts.permissions import CustomerAccessPolicyPermission, IsStaffOrAdmin
from apps.audit.models import AuditEvent
from apps.subscriptions.models import Subscription, SubscriptionItem, SubscriptionStatus
from .models import Quotation, QuotationItem, QuotationStatus
from .serializers import QuotationSerializer, QuotationCreateUpdateSerializer
from .pdf import generate_quotation_pdf

class QuotationViewSet(viewsets.ModelViewSet):
    """
    Quotation management, calculation, conversion, and PDF export.
    """
    queryset = Quotation.objects.all().select_related('customer', 'plan').prefetch_related(
        'items__product', 'items__variant'
    ).order_by('-created_at')
    permission_classes = [CustomerAccessPolicyPermission]

    # Customers may read their own records; creating, editing and deleting is staff work.
    STAFF_ONLY_ACTIONS = {'create', 'update', 'partial_update', 'destroy'}

    def get_permissions(self):
        if self.action in self.STAFF_ONLY_ACTIONS:
            return [IsStaffOrAdmin()]
        return super().get_permissions()
    filterset_fields = ['status', 'customer', 'plan']
    search_fields = ['quotation_number', 'customer__name', 'customer__company']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return QuotationCreateUpdateSerializer
        return QuotationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(QuotationSerializer(instance).data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Quotation.objects.none()
        if user.is_staff_user:
            return self.queryset
        return self.queryset.filter(customer__user=user)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        quotation = self.get_object()
        pdf_bytes = generate_quotation_pdf(quotation)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{quotation.quotation_number}.pdf"'
        return response

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def accept(self, request, pk=None):
        quote = self.get_object()
        quote.status = QuotationStatus.ACCEPTED
        quote.save(update_fields=['status', 'updated_at'])
        AuditEvent.log_event(
            action='QUOTATION_ACCEPTED',
            entity_type='Quotation',
            entity_id=quote.quotation_number,
            description="Quotation accepted.",
            user=request.user
        )
        return Response(QuotationSerializer(quote).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reject(self, request, pk=None):
        quote = self.get_object()
        quote.status = QuotationStatus.REJECTED
        quote.save(update_fields=['status', 'updated_at'])
        AuditEvent.log_event(
            action='QUOTATION_REJECTED',
            entity_type='Quotation',
            entity_id=quote.quotation_number,
            description="Quotation rejected.",
            user=request.user
        )
        return Response(QuotationSerializer(quote).data)

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin])
    def convert_to_subscription(self, request, pk=None):
        quote = self.get_object()
        if not quote.plan:
            return Response({'error': "Quotation must have an assigned Plan to be converted to a Subscription."}, status=status.HTTP_400_BAD_REQUEST)

        # Create Subscription
        today = datetime.date.today()
        subscription = Subscription.objects.create(
            customer=quote.customer,
            plan=quote.plan,
            status=SubscriptionStatus.ACTIVE,
            start_date=today,
            next_billing_date=today,
            notes=f"Converted from quotation {quote.quotation_number}."
        )

        for item in quote.items.all():
            SubscriptionItem.objects.create(
                subscription=subscription,
                product=item.product,
                variant=item.variant,
                quantity=item.quantity,
                unit_price=item.unit_price,
            )

        quote.status = QuotationStatus.CONVERTED
        quote.converted_subscription = subscription
        quote.save(update_fields=['status', 'converted_subscription', 'updated_at'])

        AuditEvent.log_event(
            action='QUOTATION_CONVERTED',
            entity_type='Quotation',
            entity_id=quote.quotation_number,
            description=f"Quotation converted to subscription {subscription.subscription_number}.",
            user=request.user
        )

        return Response({
            'message': 'Quotation converted successfully.',
            'subscription_id': subscription.id,
            'subscription_number': subscription.subscription_number
        })
