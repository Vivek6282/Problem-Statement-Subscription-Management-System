import datetime
from django.db import transaction
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import CustomerAccessPolicyPermission, IsStaffOrAdmin
from apps.audit.models import AuditEvent
from apps.subscriptions.models import SubscriptionStatus
from .models import Quotation, QuotationStatus, QuotationTemplate
from .serializers import (QuotationSerializer, QuotationWriteSerializer, QuotationTemplateSerializer)
from .services import sync_subscription
from .pdf import generate_quotation_pdf

# Quotation lifecycle (the linked subscription mirrors it: Draft -> Quotation -> Confirmed -> Active -> Closed)
CONFIRMABLE = (QuotationStatus.DRAFT, QuotationStatus.SENT, QuotationStatus.ACCEPTED)


class QuotationViewSet(viewsets.ModelViewSet):
    """
    Quotation management, calculation, confirmation and PDF export.
    Customers can only read their own quotations and accept / reject them.
    """
    permission_classes = [CustomerAccessPolicyPermission]
    customer_actions = ('accept', 'reject')
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
    filterset_fields = {
        'status': ['exact'], 'customer': ['exact'], 'plan': ['exact'], 'template': ['exact'],
        'issue_date': ['gte', 'lte'], 'expiry_date': ['gte', 'lte'],
    }
    search_fields = ['quotation_number', 'customer__name', 'customer__company']
    ordering_fields = ['created_at', 'issue_date', 'expiry_date', 'total_amount', 'quotation_number']

    def get_queryset(self):
        user = self.request.user
        qs = Quotation.objects.select_related('customer', 'plan', 'template', 'converted_subscription').prefetch_related(
            'items__product', 'items__variant'
        ).order_by('-created_at')
        if not user.is_authenticated:
            return qs.none()
        if user.is_staff_user:
            return qs
        return qs.filter(customer__user=user).exclude(status=QuotationStatus.DRAFT)

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return QuotationWriteSerializer
        return QuotationSerializer

    def _out(self, quote):
        quote = self.get_queryset().get(pk=quote.pk)
        return QuotationSerializer(quote, context=self.get_serializer_context()).data

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(self._out(serializer.save()), status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response(self._out(serializer.save()))

    def destroy(self, request, *args, **kwargs):
        quote = self.get_object()
        if quote.status != QuotationStatus.DRAFT:
            return Response({'error': "Only Draft quotations can be deleted."}, status=status.HTTP_400_BAD_REQUEST)
        AuditEvent.log_event('QUOTATION_DELETED', 'Quotation', quote.quotation_number, "Draft quotation deleted.", user=request.user)
        quote.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        quotation = self.get_object()
        pdf_bytes = generate_quotation_pdf(quotation)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{quotation.quotation_number}.pdf"'
        return response

    def _locked(self):
        return Quotation.objects.select_for_update().select_related('plan', 'customer', 'converted_subscription').get(pk=self.get_object().pk)

    def _bad(self, message):
        return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

    def _expire_if_needed(self, quote):
        if quote.is_expired() and quote.status in CONFIRMABLE:
            quote.status = QuotationStatus.EXPIRED
            quote.save(update_fields=['status', 'updated_at'])
            return True
        return False

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin])
    def send(self, request, pk=None):
        """Draft -> Sent. The linked subscription is opened in the 'Quotation' stage."""
        with transaction.atomic():
            quote = self._locked()
            if quote.status != QuotationStatus.DRAFT:
                return self._bad(f"Only Draft quotations can be sent (current: {quote.status}).")
            if not quote.plan:
                return self._bad("Assign a plan before sending the quotation.")
            if not quote.items.exists() and quote.plan.price <= 0:
                return self._bad("Add at least one product line before sending.")
            quote.status = QuotationStatus.SENT
            quote.save(update_fields=['status', 'updated_at'])
            sync_subscription(quote, SubscriptionStatus.QUOTATION, user=request.user)
            AuditEvent.log_event('QUOTATION_SENT', 'Quotation', quote.quotation_number, "Quotation sent to customer.", user=request.user)
        return Response(self._out(quote))

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        with transaction.atomic():
            quote = self._locked()
            if self._expire_if_needed(quote):
                return self._bad("This quotation has expired.")
            allowed = (QuotationStatus.SENT,) if not request.user.is_staff_user else (QuotationStatus.SENT, QuotationStatus.DRAFT)
            if quote.status not in allowed:
                return self._bad(f"This quotation cannot be accepted from status {quote.status}.")
            quote.status = QuotationStatus.ACCEPTED
            quote.save(update_fields=['status', 'updated_at'])
            AuditEvent.log_event('QUOTATION_ACCEPTED', 'Quotation', quote.quotation_number, "Quotation accepted.", user=request.user)
        return Response(self._out(quote))

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        with transaction.atomic():
            quote = self._locked()
            allowed = (QuotationStatus.SENT, QuotationStatus.ACCEPTED) if not request.user.is_staff_user else (
                QuotationStatus.DRAFT, QuotationStatus.SENT, QuotationStatus.ACCEPTED)
            if quote.status not in allowed:
                return self._bad(f"This quotation cannot be rejected from status {quote.status}.")
            quote.status = QuotationStatus.REJECTED
            quote.save(update_fields=['status', 'updated_at'])
            sub = quote.converted_subscription
            if sub and sub.status in (SubscriptionStatus.DRAFT, SubscriptionStatus.QUOTATION):
                sub.status = SubscriptionStatus.CLOSED
                sub.save(update_fields=['status', 'updated_at'])
            AuditEvent.log_event('QUOTATION_REJECTED', 'Quotation', quote.quotation_number, "Quotation rejected.", user=request.user)
        return Response(self._out(quote))

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin], url_path='confirm')
    def confirm(self, request, pk=None):
        return self._confirm(request)

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin])
    def convert_to_subscription(self, request, pk=None):
        return self._confirm(request)

    def _confirm(self, request):
        """
        Confirms the quotation: creates (or updates) its subscription in the Confirmed stage.
        Idempotent: confirming twice (double click, retry) returns the same subscription.
        """
        with transaction.atomic():
            quote = self._locked()
            if quote.status == QuotationStatus.CONVERTED and quote.converted_subscription:
                sub = quote.converted_subscription
                return Response({
                    'message': 'Quotation was already confirmed.', 'already_converted': True,
                    'subscription_id': sub.id, 'subscription_number': sub.subscription_number,
                })
            if self._expire_if_needed(quote):
                return self._bad("This quotation has expired and can no longer be confirmed.")
            if quote.status not in CONFIRMABLE:
                return self._bad(f"A {quote.status} quotation cannot be confirmed.")
            if not quote.plan:
                return self._bad("Quotation must have an assigned Plan to be converted to a Subscription.")
            plan, today = quote.plan, datetime.date.today()
            if not plan.is_active:
                return self._bad("The quoted plan is inactive.")
            if plan.availability_end_date and today > plan.availability_end_date:
                return self._bad(f"The quoted plan is no longer available after {plan.availability_end_date}.")
            if plan.availability_start_date and today < plan.availability_start_date:
                return self._bad(f"The quoted plan is only available from {plan.availability_start_date}.")

            sub, _ = sync_subscription(quote, SubscriptionStatus.CONFIRMED, user=request.user)
            quote.status = QuotationStatus.CONVERTED
            quote.save(update_fields=['status', 'updated_at'])
            AuditEvent.log_event(
                'QUOTATION_CONVERTED', 'Quotation', quote.quotation_number,
                f"Quotation confirmed; subscription {sub.subscription_number} is now Confirmed.", user=request.user)
        return Response({
            'message': 'Quotation confirmed and subscription created.', 'already_converted': False,
            'subscription_id': sub.id, 'subscription_number': sub.subscription_number,
        })


class QuotationTemplateViewSet(viewsets.ModelViewSet):
    """Reusable quotation templates (plan + product lines + validity + payment terms). Staff and Admin only."""
    queryset = QuotationTemplate.objects.select_related('plan').prefetch_related('items__product', 'items__variant').order_by('name')
    serializer_class = QuotationTemplateSerializer
    permission_classes = [IsStaffOrAdmin]
    filterset_fields = ['is_active', 'plan']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']

    def destroy(self, request, *args, **kwargs):
        template = self.get_object()
        if template.quotations.exists():
            template.is_active = False
            template.save(update_fields=['is_active', 'updated_at'])
            return Response({'message': 'Template is used by existing quotations, so it was deactivated instead of deleted.',
                             'archived': True})
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
