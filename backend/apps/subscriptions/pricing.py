"""
Single source of truth for money maths.

Quotations, subscriptions (estimated totals) and recurring invoices all price their lines
through `price_document`, so a quote, the subscription it becomes and the invoices it
bills can never disagree on discounts, taxes or rounding.

Rules
- Every amount is a Decimal rounded half-up to 2 places.
- Taxes come from admin-managed TaxRule rows (an explicit rule on a line wins; otherwise every
  active rule that covers the product on the pricing date applies; rules with no product list are global).
- A line discount applies to its own line. A document (subscription-level) discount applies to the
  whole net amount and is allocated proportionally across the lines so tax is computed on the discounted base.
- Discounts can never push a line or document below zero.
"""
import datetime
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from django.db.models import Q

from apps.taxes.models import TaxRule

ZERO = Decimal('0.00')


def money(value):
    return Decimal(value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


class TaxResolver:
    """Loads the tax rules effective on a date once, then answers per-product lookups from memory."""

    def __init__(self, on_date=None):
        self.on_date = on_date or datetime.date.today()
        self._rules = None

    def _load(self):
        qs = (
            TaxRule.objects.filter(is_active=True, effective_from__lte=self.on_date)
            .filter(Q(effective_to__isnull=True) | Q(effective_to__gte=self.on_date))
            .prefetch_related('applicable_products')
        )
        self._rules = [(rule, {p.id for p in rule.applicable_products.all()}) for rule in qs]

    def rules_for(self, product):
        if self._rules is None:
            self._load()
        matched = []
        for rule, restricted_ids in self._rules:
            if not restricted_ids or (product is not None and product.id in restricted_ids):
                matched.append(rule)
        return matched


@dataclass
class LineSpec:
    name: str
    quantity: int
    unit_price: Decimal
    product: object = None
    sku: str = ''
    variant_name: str = ''
    tax_rule: object = None
    discount: object = None
    description: str = ''
    source: object = None  # the originating SubscriptionItem / QuotationItem, if any


@dataclass
class PricedLine:
    spec: LineSpec
    gross: Decimal = ZERO
    line_discount: Decimal = ZERO
    document_discount: Decimal = ZERO
    taxable: Decimal = ZERO
    tax: Decimal = ZERO
    tax_breakdown: list = field(default_factory=list)
    total: Decimal = ZERO

    @property
    def discount_total(self):
        return self.line_discount + self.document_discount

    @property
    def tax_percentage(self):
        return sum((Decimal(t['rate']) for t in self.tax_breakdown), ZERO)


@dataclass
class PricedDocument:
    lines: list
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total: Decimal
    applied_discounts: list  # [{'discount': Discount, 'amount': Decimal}]

    def applied_discounts_summary(self):
        return [
            {'id': a['discount'].id, 'code': a['discount'].code, 'name': a['discount'].name, 'amount': str(a['amount'])}
            for a in self.applied_discounts
        ]

    def tax_summary(self):
        merged = {}
        for line in self.lines:
            for t in line.tax_breakdown:
                key = (t['name'], t['rate'])
                merged[key] = merged.get(key, ZERO) + Decimal(t['amount'])
        return [{'name': k[0], 'rate': k[1], 'amount': str(v)} for k, v in merged.items()]


def price_document(specs, on_date=None, plan=None, document_discount=None, resolver=None):
    on_date = on_date or datetime.date.today()
    resolver = resolver or TaxResolver(on_date)
    discount_totals = {}  # discount.id -> [discount, amount]

    def note(discount, amount):
        if amount > ZERO:
            entry = discount_totals.setdefault(discount.id, [discount, ZERO])
            entry[1] += amount

    lines = []
    for spec in specs:
        line = PricedLine(spec=spec)
        line.gross = money(Decimal(spec.unit_price) * spec.quantity)
        if spec.discount is not None:
            ok, _ = spec.discount.is_eligible(
                subtotal=line.gross, quantity=spec.quantity, product=spec.product, plan=plan, on_date=on_date
            )
            if ok:
                line.line_discount = min(spec.discount.calculate_discount(line.gross), line.gross)
                note(spec.discount, line.line_discount)
        lines.append(line)

    # Document-level (whole subscription) discount, allocated proportionally
    net_total = sum((l.gross - l.line_discount for l in lines), ZERO)
    if document_discount is not None and net_total > ZERO:
        qty = sum(l.spec.quantity for l in lines if l.spec.product is not None) or 1
        ok, _ = document_discount.is_eligible(subtotal=net_total, quantity=qty, plan=plan, on_date=on_date)
        if ok:
            doc_amount = min(document_discount.calculate_discount(net_total), net_total)
            payable = [l for l in lines if l.gross - l.line_discount > ZERO]
            allocated = ZERO
            for idx, line in enumerate(payable):
                net = line.gross - line.line_discount
                if idx == len(payable) - 1:
                    share = doc_amount - allocated
                else:
                    share = money(doc_amount * net / net_total)
                share = max(ZERO, min(share, net))
                line.document_discount = share
                allocated += share
            note(document_discount, allocated)

    tax_total = ZERO
    for line in lines:
        line.taxable = max(ZERO, line.gross - line.line_discount - line.document_discount)
        rules = [line.spec.tax_rule] if line.spec.tax_rule is not None else resolver.rules_for(line.spec.product)
        for rule in rules:
            amount = rule.calculate_tax(line.taxable)
            line.tax += amount
            line.tax_breakdown.append({'name': rule.name, 'rate': str(rule.percentage), 'amount': str(amount)})
        line.total = line.taxable + line.tax
        tax_total += line.tax

    subtotal = sum((l.gross for l in lines), ZERO)
    discount_total = sum((l.discount_total for l in lines), ZERO)
    return PricedDocument(
        lines=lines,
        subtotal=subtotal,
        discount_total=discount_total,
        tax_total=tax_total,
        total=sum((l.total for l in lines), ZERO),
        applied_discounts=[{'discount': d, 'amount': a} for d, a in discount_totals.values()],
    )


def plan_fee_spec(plan):
    if plan is None or plan.price <= ZERO:
        return None
    return LineSpec(name=f"Plan: {plan.name}", sku=plan.code, quantity=1, unit_price=plan.price)


def product_unit_price(product, variant=None):
    """Server-side price for a product line: base sales price + the variant's configured adjustment."""
    return variant.final_unit_price if variant is not None else product.sales_price


def subscription_specs(subscription):
    specs = []
    fee = plan_fee_spec(subscription.plan)
    if fee:
        specs.append(fee)
    for item in subscription.items.all():
        specs.append(LineSpec(
            name=item.product.name,
            sku=item.variant.effective_sku if item.variant else item.product.sku,
            variant_name=item.variant.name if item.variant else '',
            quantity=item.quantity,
            unit_price=item.unit_price,
            product=item.product,
            tax_rule=item.tax_rule,
            discount=item.discount,
            source=item,
        ))
    return specs


def quotation_specs(quotation):
    specs = []
    fee = plan_fee_spec(quotation.plan)
    if fee:
        specs.append(fee)
    for item in quotation.items.all():
        specs.append(LineSpec(
            name=item.product.name,
            sku=item.variant.effective_sku if item.variant else item.product.sku,
            variant_name=item.variant.name if item.variant else '',
            quantity=item.quantity,
            unit_price=item.unit_price,
            product=item.product,
            discount=item.discount,
            description=item.description,
            source=item,
        ))
    return specs
