import datetime
from decimal import Decimal
from django.db import transaction
from rest_framework import serializers

from apps.customers.serializers import CustomerBriefSerializer
from apps.plans.serializers import PlanBriefSerializer
from apps.products.models import Product, ProductVariant
from apps.taxes.models import TaxRule
from apps.discounts.models import Discount
from apps.audit.models import AuditEvent
from .models import Subscription, SubscriptionItem, SubscriptionStatus
from .pricing import price_document, subscription_specs, product_unit_price, TaxResolver

EDITABLE_STATUSES = (SubscriptionStatus.DRAFT, SubscriptionStatus.QUOTATION)


class SubscriptionItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    variant_name = serializers.CharField(source='variant.name', read_only=True, default='')
    line_subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = SubscriptionItem
        fields = [
            'id', 'product', 'product_name', 'product_sku', 'variant',
            'variant_name', 'quantity', 'unit_price', 'tax_rule',
            'discount', 'line_subtotal'
        ]
        read_only_fields = fields


def pricing_payload(subscription, context=None):
    """Computed amounts for a subscription (what its next invoice will charge)."""
    on_date = max(subscription.next_billing_date, datetime.date.today()) if subscription.next_billing_date else None
    resolver = None
    if context is not None:
        cache = context.setdefault('_tax_resolvers', {})
        resolver = cache.setdefault(on_date, TaxResolver(on_date))
    priced = price_document(
        subscription_specs(subscription), on_date=on_date, plan=subscription.plan,
        document_discount=subscription.discount, resolver=resolver,
    )
    lines = []
    for line in priced.lines:
        lines.append({
            'item': getattr(line.spec.source, 'id', None),
            'name': line.spec.name,
            'variant': line.spec.variant_name,
            'quantity': line.spec.quantity,
            'unit_price': str(line.spec.unit_price),
            'discount': str(line.discount_total),
            'tax': str(line.tax),
            'tax_breakdown': line.tax_breakdown,
            'line_total': str(line.total),
        })
    return {
        'subtotal': str(priced.subtotal),
        'discount_total': str(priced.discount_total),
        'tax_total': str(priced.tax_total),
        'total': str(priced.total),
        'applied_discounts': priced.applied_discounts_summary(),
        'lines': lines,
    }


class SubscriptionSerializer(serializers.ModelSerializer):
    customer_details = CustomerBriefSerializer(source='customer', read_only=True)
    plan_details = PlanBriefSerializer(source='plan', read_only=True)
    items = SubscriptionItemSerializer(many=True, read_only=True)
    recurring_subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    normalized_mrr = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    discount_details = serializers.SerializerMethodField()
    pricing = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = [
            'id', 'subscription_number', 'customer', 'customer_details',
            'plan', 'plan_details', 'status', 'start_date', 'expiry_date',
            'next_billing_date', 'last_billing_date', 'payment_terms',
            'auto_renew', 'notes', 'discount', 'discount_details', 'recurring_subtotal',
            'normalized_mrr', 'pricing', 'created_at', 'updated_at', 'items'
        ]
        read_only_fields = fields

    def get_discount_details(self, obj):
        d = obj.discount
        if d is None:
            return None
        return {'id': d.id, 'code': d.code, 'name': d.name, 'discount_type': d.discount_type, 'value': str(d.value),
                'end_date': d.end_date}

    def get_pricing(self, obj):
        return pricing_payload(obj, self.context)


class SubscriptionItemInputSerializer(serializers.Serializer):
    product = serializers.IntegerField(required=True)
    variant = serializers.IntegerField(required=False, allow_null=True)
    quantity = serializers.IntegerField(default=1, min_value=1)
    tax_rule = serializers.IntegerField(required=False, allow_null=True)
    discount = serializers.IntegerField(required=False, allow_null=True)
    # Accepted for backwards compatibility but ignored: prices are always computed on the server.
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, write_only=True)


class SubscriptionWriteSerializer(serializers.ModelSerializer):
    """Create / edit. Status, billing dates and prices are never taken from the client."""
    items = SubscriptionItemInputSerializer(many=True, required=False)

    class Meta:
        model = Subscription
        fields = [
            'id', 'customer', 'plan', 'start_date', 'expiry_date',
            'payment_terms', 'auto_renew', 'notes', 'discount', 'items'
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        inst = self.instance
        if inst is not None:
            if inst.status not in EDITABLE_STATUSES:
                raise serializers.ValidationError(
                    f"Only Draft or Quotation subscriptions can be edited (this one is {inst.status})."
                )
            if 'customer' in attrs and attrs['customer'].pk != inst.customer_id:
                raise serializers.ValidationError({'customer': "The customer of an existing subscription cannot be changed."})

        plan = attrs.get('plan', inst.plan if inst else None)
        start = attrs.get('start_date', inst.start_date if inst else datetime.date.today())
        expiry = attrs.get('expiry_date', inst.expiry_date if inst else None)

        if plan is not None:
            if not plan.is_active:
                raise serializers.ValidationError({'plan': "This plan is inactive and cannot be subscribed to."})
            if plan.availability_start_date and start < plan.availability_start_date:
                raise serializers.ValidationError({'start_date': f"Plan is only available from {plan.availability_start_date}."})
            if plan.availability_end_date and start > plan.availability_end_date:
                raise serializers.ValidationError({'start_date': f"Plan is no longer available after {plan.availability_end_date}."})
        if expiry and expiry < start:
            raise serializers.ValidationError({'expiry_date': "Expiry date cannot be before the start date."})

        items = attrs.get('items')
        if items:
            total_qty = sum(i.get('quantity', 1) for i in items)
            if plan is not None and total_qty < plan.min_quantity:
                raise serializers.ValidationError(
                    {'items': f"This plan requires a minimum total quantity of {plan.min_quantity} (got {total_qty})."}
                )
        return attrs

    def _build_items(self, subscription, items_data):
        for data in items_data:
            product = Product.objects.filter(id=data['product'], is_active=True).first()
            if product is None:
                raise serializers.ValidationError({'items': f"Product {data['product']} does not exist or is inactive."})
            variant = None
            if data.get('variant'):
                variant = ProductVariant.objects.filter(id=data['variant'], product=product, is_active=True).first()
                if variant is None:
                    raise serializers.ValidationError({'items': "Variant does not belong to the selected product or is inactive."})
            tax_rule = TaxRule.objects.filter(id=data['tax_rule']).first() if data.get('tax_rule') else None
            discount = Discount.objects.filter(id=data['discount']).first() if data.get('discount') else None
            SubscriptionItem.objects.create(
                subscription=subscription, product=product, variant=variant,
                quantity=data.get('quantity', 1),
                unit_price=product_unit_price(product, variant),
                tax_rule=tax_rule, discount=discount,
            )

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        subscription = Subscription.objects.create(status=SubscriptionStatus.DRAFT, **validated_data)
        self._build_items(subscription, items_data)
        user = self.context['request'].user
        AuditEvent.log_event('SUBSCRIPTION_CREATED', 'Subscription', subscription.subscription_number,
                             "Subscription created in DRAFT.", user=user)
        return subscription

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if 'start_date' in validated_data:
            instance.next_billing_date = instance.start_date
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            self._build_items(instance, items_data)
        AuditEvent.log_event('SUBSCRIPTION_UPDATED', 'Subscription', instance.subscription_number,
                             "Subscription details edited.", user=self.context['request'].user)
        return instance
