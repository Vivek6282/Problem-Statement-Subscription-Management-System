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

## Currency and business timezone

- Status: default applied (assumption: USD, Asia/Kolkata), awaiting approval.
- `CURRENCY_CODE` (default `USD`) and `BUSINESS_TIMEZONE` (default `Asia/Kolkata`) come from the environment. Django `TIME_ZONE` stays UTC. No amounts are converted; the code is only a display label.
- `apps/reports/business_time.py` provides `business_today()`, `business_month_start()` and `business_month_end()`. All report views use them.
- `GET /api/v1/reports/config/` (authenticated) returns `currency_code`, `business_timezone` and `business_today`; the frontend reads it once after sign-in.

### Business timezone: Member 3 to adopt

These non-report modules still use server-local `datetime.date.today()` and were deliberately not edited by Member 1:
- `apps/taxes/models.py` line 44
- `apps/plans/views.py` line 41
- `apps/quotations/models.py` line 78
- `apps/quotations/views.py` line 95
- `apps/invoices/models.py` line 67
- `apps/invoices/models.py` line 76
- `apps/invoices/views.py` line 50
- `apps/discounts/serializers.py` line 64
- `apps/discounts/models.py` line 69
- `apps/payments/services.py` line 21
- `apps/payments/models.py` line 60
- `apps/accounts/management/commands/seed_demo_data.py` line 241
- `apps/accounts/test_access_and_reset.py` line 195
- `apps/subscriptions/management/commands/run_billing_cycle.py` line 24
- `apps/subscriptions/billing.py` line 51
- `apps/subscriptions/billing.py` line 217
- `apps/subscriptions/models.py` line 87
- `apps/subscriptions/views.py` line 136
- `apps/subscriptions/views.py` line 151
- `apps/subscriptions/tasks.py` line 10

## Metric definitions (overdue, billed, received, outstanding, churn)

- Status: default applied, awaiting approval from Member 3.
- **Business "today"** is the date in `BUSINESS_TIMEZONE` (see above).
- **Outstanding**: sum of `balance_due` on invoices with status CONFIRMED, PARTIALLY_PAID or OVERDUE and `balance_due > 0`.
- **Overdue**: an outstanding invoice with `due_date < business today`. A stored OVERDUE status with a due date of today or later is *not* overdue. DRAFT, PAID and CANCELLED are never overdue. The amount is the remaining balance, not the invoice total.
- **Due soon (next 30 days)**: outstanding invoices due from today to today + 30 days. Never merged into Overdue.
- **Billed**: `total_amount` of invoices with status CONFIRMED, PARTIALLY_PAID, PAID or OVERDUE, by `issue_date`.
- **Received**: recorded payments, by `payment_date`.
- **Churn (provisional)**: subscriptions CLOSED this month / (subscriptions started before the month, excluding DRAFT and QUOTATION, + subscriptions started this month). Close time uses `updated_at`, which also changes on unrelated edits, so the figure is approximate. The API returns `churn_provisional: true` until this is approved.
- Every card is computed by the same queryset helper as its drill-down (`get_*_queryset` and `drilldown_queryset` in `apps/reports/views.py`); the drill-down response returns `count` and `total` so the two can be compared.
- Dashboard, `mrr-breakdown` and `revenue-trends` responses carry `currency_code`, `generated_at` (UTC, ISO 8601) and `as_of_date`. `mrr-breakdown` and `revenue-trends` now return `{"results": [...], ...}` instead of a bare list.
