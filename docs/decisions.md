# Admin reporting decisions

Each entry is a default applied by Member 1. Status "awaiting approval" means Member 3 (billing) has not yet confirmed it.

## MRR definition

- Status: default applied, awaiting approval from Member 3.
- Monthly multipliers on a subscription's recurring amount: DAILY x30, WEEKLY x52/12, MONTHLY x1, YEARLY /12.
- Recurring amount = plan price + sum of line items (`unit_price x quantity`) of an ACTIVE subscription.
- Basis: **pre-tax and pre-discount**. Taxes and discounts are not applied to MRR.
- Only ACTIVE subscriptions count. ARR = MRR x 12 (from the rounded MRR).
- One source of truth: `MRR_FACTORS` in `apps/subscriptions/models.py`, used by `Subscription.normalized_mrr_exact` and the SQL aggregation (`mrr_case`) in `apps/reports/views.py`.
- Rounding: totals are summed unrounded and rounded once to 2 decimals. The per-subscription `normalized_mrr` is rounded for display only, so a list of rows can differ from the total by a few cents.
- Replaces the earlier flat 4.33 weekly factor, which was never approved.
