import datetime
from django.db import transaction
from rest_framework import serializers

from apps.customers.serializers import CustomerBriefSerializer
from apps.plans.serializers import PlanBriefSerializer
from apps.products.models import Product, ProductVariant
from apps.discounts.models import Discount
from apps.audit.models import AuditEvent
from apps.subscriptions.pricing import product_unit_price
from .models import Quotation, QuotationItem, QuotationStatus, QuotationTemplate, QuotationTemplateItem


class QuotationItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    variant_name = serializers.CharField(source='variant.name', read_only=True, default='')

    class Meta:
        model = QuotationItem
        fields = [
            'id', 'product', 'product_name', 'product_sku', 'variant',
            'variant_name', 'description', 'quantity', 'unit_price', 'discount',
            'discount_amount', 'tax_percentage', 'tax_amount', 'line_total'
        ]
        read_only_fields = fields


class QuotationSerializer(serializers.ModelSerializer):
    customer_details = CustomerBriefSerializer(source='customer', read_only=True)
    plan_details = PlanBriefSerializer(source='plan', read_only=True)
    items = QuotationItemSerializer(many=True, read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True, default='')
    subscription_number = serializers.CharField(source='converted_subscription.subscription_number', read_only=True, default='')
    subscription_status = serializers.CharField(source='converted_subscription.status', read_only=True, default='')

    class Meta:
        model = Quotation
        fields = [
            'id', 'quotation_number', 'customer', 'customer_details',
            'plan', 'plan_details', 'template', 'template_name', 'payment_terms', 'discount',
            'validity_days', 'issue_date', 'expiry_date', 'status', 'subtotal', 'discount_amount',
            'tax_amount', 'total_amount', 'converted_subscription', 'subscription_number',
            'subscription_status', 'notes', 'terms_and_conditions', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = fields


class QuotationItemInputSerializer(serializers.Serializer):
    product = serializers.IntegerField(required=True)
    variant = serializers.IntegerField(required=False, allow_null=True)
    quantity = serializers.IntegerField(default=1, min_value=1)
    discount = serializers.IntegerField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True, default='', max_length=255)
    # Accepted for backwards compatibility but IGNORED: price, discount and tax are computed on the server.
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, write_only=True)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, write_only=True)
    tax_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, write_only=True)


class QuotationWriteSerializer(serializers.ModelSerializer):
    items = QuotationItemInputSerializer(many=True, required=False)
    template = serializers.PrimaryKeyRelatedField(queryset=QuotationTemplate.objects.filter(is_active=True), required=False, allow_null=True)

    class Meta:
        model = Quotation
        fields = [
            'id', 'customer', 'plan', 'template', 'payment_terms', 'discount', 'validity_days',
            'issue_date', 'notes', 'terms_and_conditions', 'items'
        ]
        read_only_fields = ['id']
        extra_kwargs = {'plan': {'required': False}, 'payment_terms': {'required': False}, 'validity_days': {'required': False}}

    def validate(self, attrs):
        inst = self.instance
        if inst is not None and inst.status != QuotationStatus.DRAFT:
            raise serializers.ValidationError(f"Only Draft quotations can be edited (this one is {inst.status}).")

        template = attrs.get('template')
        if template is not None:  # a template only fills what the caller did not specify
            attrs.setdefault('plan', template.plan)
            attrs.setdefault('validity_days', template.validity_days)
            attrs.setdefault('payment_terms', template.payment_terms)
            if template.discount_id:
                attrs.setdefault('discount', template.discount)
            if 'items' not in attrs:
                attrs['items'] = [
                    {'product': i.product_id, 'variant': i.variant_id, 'quantity': i.quantity,
                     'description': i.description, 'discount': None}
                    for i in template.items.all()
                ]

        plan = attrs.get('plan', inst.plan if inst else None)
        issue = attrs.get('issue_date', inst.issue_date if inst else datetime.date.today())
        if plan is not None:
            if not plan.is_active:
                raise serializers.ValidationError({'plan': "This plan is inactive and cannot be quoted."})
            if plan.availability_start_date and issue < plan.availability_start_date:
                raise serializers.ValidationError({'plan': f"Plan is only available from {plan.availability_start_date}."})
            if plan.availability_end_date and issue > plan.availability_end_date:
                raise serializers.ValidationError({'plan': f"Plan is no longer available after {plan.availability_end_date}."})
        items = attrs.get('items')
        if items and plan is not None:
            total_qty = sum(i.get('quantity', 1) for i in items)
            if total_qty < plan.min_quantity:
                raise serializers.ValidationError(
                    {'items': f"This plan requires a minimum total quantity of {plan.min_quantity} (got {total_qty})."}
                )
        return attrs

    def _build_items(self, quotation, items_data):
        for data in items_data:
            product = Product.objects.filter(id=data['product'], is_active=True).first()
            if product is None:
                raise serializers.ValidationError({'items': f"Product {data['product']} does not exist or is inactive."})
            variant = None
            if data.get('variant'):
                variant = ProductVariant.objects.filter(id=data['variant'], product=product, is_active=True).first()
                if variant is None:
                    raise serializers.ValidationError({'items': "Variant does not belong to the selected product or is inactive."})
            discount = Discount.objects.filter(id=data['discount']).first() if data.get('discount') else None
            QuotationItem.objects.create(
                quotation=quotation, product=product, variant=variant,
                quantity=data.get('quantity', 1),
                unit_price=product_unit_price(product, variant),
                discount=discount,
                description=data.get('description', ''),
            )

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        quotation = Quotation.objects.create(**validated_data)
        self._build_items(quotation, items_data)
        quotation.recalculate_totals()
        AuditEvent.log_event('QUOTATION_CREATED', 'Quotation', quotation.quotation_number,
                             "Quotation created in DRAFT.", user=self.context['request'].user)
        return quotation

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        validated_data.pop('template', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if 'validity_days' in validated_data or 'issue_date' in validated_data:
            instance.expiry_date = instance.issue_date + datetime.timedelta(days=instance.validity_days)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            self._build_items(instance, items_data)
        instance.recalculate_totals()
        AuditEvent.log_event('QUOTATION_UPDATED', 'Quotation', instance.quotation_number,
                             "Quotation edited.", user=self.context['request'].user)
        return instance


# ---------------------------------------------------------------- templates
class QuotationTemplateItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    variant_name = serializers.CharField(source='variant.name', read_only=True, default='')

    class Meta:
        model = QuotationTemplateItem
        fields = ['id', 'product', 'product_name', 'variant', 'variant_name', 'quantity', 'description']
        read_only_fields = ['id', 'product_name', 'variant_name']


class QuotationTemplateSerializer(serializers.ModelSerializer):
    items = QuotationTemplateItemSerializer(many=True, required=False)
    plan_name = serializers.CharField(source='plan.name', read_only=True, default='')

    class Meta:
        model = QuotationTemplate
        fields = ['id', 'name', 'description', 'plan', 'plan_name', 'validity_days', 'payment_terms',
                  'discount', 'is_active', 'items', 'created_at', 'updated_at']
        read_only_fields = ['id', 'plan_name', 'created_at', 'updated_at']

    def validate_validity_days(self, value):
        if value < 1:
            raise serializers.ValidationError("Validity must be at least 1 day.")
        return value

    def validate_items(self, items):
        for i in items:
            variant = i.get('variant')
            if variant is not None and variant.product_id != i['product'].id:
                raise serializers.ValidationError("Variant does not belong to the selected product.")
        return items

    def _save_items(self, template, items):
        template.items.all().delete()
        for i in items:
            QuotationTemplateItem.objects.create(template=template, **i)

    @transaction.atomic
    def create(self, validated_data):
        items = validated_data.pop('items', [])
        template = QuotationTemplate.objects.create(created_by=self.context['request'].user, **validated_data)
        self._save_items(template, items)
        return template

    @transaction.atomic
    def update(self, instance, validated_data):
        items = validated_data.pop('items', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if items is not None:
            self._save_items(instance, items)
        return instance
