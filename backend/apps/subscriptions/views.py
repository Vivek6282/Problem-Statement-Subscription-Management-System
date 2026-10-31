import datetime
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import CustomerAccessPolicyPermission, IsStaffOrAdmin
from apps.audit.models import AuditEvent
from apps.invoices.models import Invoice
from .models import Subscription, SubscriptionStatus
from .serializers import SubscriptionSerializer, SubscriptionWriteSerializer
from .billing import BillingEngine


class SubscriptionViewSet(viewsets.ModelViewSet):
    """
    Subscription lifecycle and management endpoint.

    Draft -> Quotation -> Confirmed -> Active -> Closed (Active <-> Paused, Closed -> Active on renewal).
    Strict tenant isolation: customers only ever see their own subscriptions, and may only pause,
    resume, close or renew them (subject to the plan's own settings). Everything else is staff work.
    """
    permission_classes = [CustomerAccessPolicyPermission]
    customer_actions = ('pause', 'resume', 'close', 'renew')
    http_method_names = ['get', 'post', 'patch', 'head', 'options']  # no PUT / DELETE: history is never destroyed
    filterset_fields = {
        'status': ['exact'], 'customer': ['exact'], 'plan': ['exact'], 'payment_terms': ['exact'],
        'start_date': ['gte', 'lte'], 'next_billing_date': ['gte', 'lte'],
    }
    search_fields = ['subscription_number', 'customer__name', 'customer__company', 'plan__name']
    ordering_fields = ['created_at', 'start_date', 'next_billing_date', 'subscription_number', 'status']

    def get_queryset(self):
        user = self.request.user
        qs = Subscription.objects.select_related('customer', 'plan', 'discount').prefetch_related(
            'items__product', 'items__variant', 'items__tax_rule', 'items__discount'
        ).order_by('-created_at')
        if not user.is_authenticated:
            return qs.none()
        if user.is_staff_user:
            return qs
        return qs.filter(customer__user=user)

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return SubscriptionWriteSerializer
        return SubscriptionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(SubscriptionSerializer(self._fresh(instance), context=self.get_serializer_context()).data,
                        status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(SubscriptionSerializer(self._fresh(instance), context=self.get_serializer_context()).data)

    def _fresh(self, instance):
        return self.get_queryset().get(pk=instance.pk) if self.request.user.is_staff_user else Subscription.objects.get(pk=instance.pk)

    # ------------------------------------------------------------------ helpers
    def _respond(self, sub):
        sub.refresh_from_db()
        return Response(SubscriptionSerializer(self._fresh(sub), context=self.get_serializer_context()).data)

    def _transition(self, sub, target, action_code, description):
        old = sub.status
        sub.status = target
        sub.save(update_fields=['status', 'updated_at'])
        AuditEvent.log_event(action_code, 'Subscription', sub.subscription_number,
                             f"{description} ({old} → {target}).", user=self.request.user)

    def _bill_outstanding(self, sub):
        """Before leaving ACTIVE (pause / close) bill every period already due, so no cycle is lost."""
        BillingEngine.bill_subscription(sub.id, datetime.date.today())
        sub.refresh_from_db()

    def _bad(self, message):
        return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

    # ------------------------------------------------------------------ lifecycle
    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin])
    def confirm(self, request, pk=None):
        with transaction.atomic():
            sub = Subscription.objects.select_for_update().get(pk=self.get_object().pk)
            if sub.status not in (SubscriptionStatus.DRAFT, SubscriptionStatus.QUOTATION):
                return self._bad(f"Only Draft or Quotation subscriptions can be confirmed (current: {sub.status}).")
            self._transition(sub, SubscriptionStatus.CONFIRMED, 'SUBSCRIPTION_CONFIRMED', "Subscription confirmed")
        return self._respond(sub)

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin])
    def activate(self, request, pk=None):
        with transaction.atomic():
            sub = Subscription.objects.select_for_update().select_related('plan').get(pk=self.get_object().pk)
            if sub.status != SubscriptionStatus.CONFIRMED:
                return self._bad(f"Only Confirmed subscriptions can be activated (current: {sub.status}).")
            today = datetime.date.today()
            # Billing starts on the start date; an activation after the start date does not back-bill
            sub.next_billing_date = max(sub.start_date, today)
            sub.save(update_fields=['next_billing_date', 'updated_at'])
            self._transition(sub, SubscriptionStatus.ACTIVE, 'SUBSCRIPTION_ACTIVATED', "Subscription activated")
        return self._respond(sub)

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        with transaction.atomic():
            sub = Subscription.objects.select_for_update().select_related('plan').get(pk=self.get_object().pk)
            if sub.status != SubscriptionStatus.ACTIVE:
                return self._bad(f"Only Active subscriptions can be paused (current: {sub.status}).")
            if not sub.plan.allow_pause:
                return self._bad("This plan does not permit pausing.")
            self._bill_outstanding(sub)
            self._transition(sub, SubscriptionStatus.PAUSED, 'SUBSCRIPTION_PAUSED', "Subscription paused")
        return self._respond(sub)

    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        with transaction.atomic():
            sub = Subscription.objects.select_for_update().get(pk=self.get_object().pk)
            if sub.status != SubscriptionStatus.PAUSED:
                return self._bad(f"Only Paused subscriptions can be resumed (current: {sub.status}).")
            today = datetime.date.today()
            if sub.next_billing_date < today:
                # The paused time is not billed: billing continues from the resume date
                sub.next_billing_date = today
                sub.save(update_fields=['next_billing_date', 'updated_at'])
            self._transition(sub, SubscriptionStatus.ACTIVE, 'SUBSCRIPTION_RESUMED', "Subscription resumed")
        return self._respond(sub)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        with transaction.atomic():
            sub = Subscription.objects.select_for_update().select_related('plan').get(pk=self.get_object().pk)
            if sub.status == SubscriptionStatus.CLOSED:
                return self._bad("Subscription is already closed.")
            is_early = sub.status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED) and (
                sub.expiry_date is None or sub.expiry_date > datetime.date.today()
            )
            if is_early and not request.user.is_staff_user and not sub.plan.allow_early_close:
                return self._bad("This plan does not permit closing early.")
            if sub.status == SubscriptionStatus.ACTIVE:
                self._bill_outstanding(sub)
            self._transition(sub, SubscriptionStatus.CLOSED, 'SUBSCRIPTION_CLOSED', "Subscription closed")
        return self._respond(sub)

    @action(detail=True, methods=['post'])
    def renew(self, request, pk=None):
        with transaction.atomic():
            sub = Subscription.objects.select_for_update().select_related('plan').get(pk=self.get_object().pk)
            if sub.status != SubscriptionStatus.CLOSED:
                return self._bad(f"Only Closed subscriptions can be renewed (current: {sub.status}).")
            if not sub.plan.allow_renewal:
                return self._bad("This plan does not permit renewal.")
            if not sub.plan.is_active:
                return self._bad("This plan is inactive and can no longer be renewed.")
            today = datetime.date.today()
            plan = sub.plan
            if plan.availability_end_date and today > plan.availability_end_date:
                return self._bad(f"Plan is no longer available after {plan.availability_end_date}.")
            term = (sub.expiry_date - sub.start_date) if (sub.expiry_date and sub.start_date and sub.expiry_date > sub.start_date) else None
            sub.start_date = today
            sub.expiry_date = (today + term) if term else None
            sub.next_billing_date = today
            sub.save(update_fields=['start_date', 'expiry_date', 'next_billing_date', 'updated_at'])
            self._transition(sub, SubscriptionStatus.ACTIVE, 'SUBSCRIPTION_RENEWED', "Subscription renewed")
        return self._respond(sub)

    # ------------------------------------------------------------------ history & billing
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        sub = self.get_object()
        events = AuditEvent.objects.filter(entity_type='Subscription', entity_id=sub.subscription_number).order_by('-created_at')[:100]
        invoices = Invoice.objects.filter(subscription=sub).order_by('-billing_period_start')[:100]
        return Response({
            'events': [{'id': e.id, 'action': e.action, 'description': e.description, 'user': e.user_email,
                        'created_at': e.created_at} for e in events],
            'invoices': [{'id': i.id, 'invoice_number': i.invoice_number, 'period_start': i.billing_period_start,
                          'period_end': i.billing_period_end, 'total_amount': i.total_amount,
                          'balance_due': i.balance_due, 'status': i.status} for i in invoices],
        })

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin])
    def trigger_billing(self, request, pk=None):
        """Bills every period of this subscription that is due up to today (catch-up, idempotent)."""
        sub = self.get_object()
        invoices, messages = BillingEngine.bill_subscription(sub.id, datetime.date.today())
        if invoices:
            last = invoices[-1]
            return Response({
                'message': f"{len(invoices)} invoice(s) generated; latest {last.invoice_number}.",
                'invoice_id': last.id,
                'total_amount': last.total_amount,
                'invoices_created': len(invoices),
            })
        return self._bad('; '.join(messages) or "Nothing to bill.")

    @action(detail=False, methods=['post'], permission_classes=[IsStaffOrAdmin], url_path='run-batch-billing')
    def run_batch_billing(self, request):
        """Runs the recurring billing cycle across every active subscription due on or before the date."""
        date_str = request.data.get('date')
        try:
            target_date = datetime.date.fromisoformat(date_str) if date_str else datetime.date.today()
        except ValueError:
            return self._bad("Invalid date, expected YYYY-MM-DD.")
        results = BillingEngine.run_all_due_billing(target_date=target_date)
        AuditEvent.log_event('BATCH_BILLING_RUN', 'Billing', str(target_date),
                             f"Batch billing for {target_date}: {results['invoices_created']} invoice(s) created.",
                             user=request.user)
        return Response(results)
