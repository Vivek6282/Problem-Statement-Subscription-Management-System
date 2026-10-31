# Spec Compliance Plan — Brightloop Subscription Management System

Source of truth: `Subscription_Management_System.pdf` (the 8 "scenes") + the build brief.
Rule followed: build on the existing UI and code; no redesign. Status: **all phases done** (see `SPEC_COMPLIANCE_REPORT.md` for evidence and the short list of known limits).

## 1. Spec scene → what the system now does

| Spec scene | Behaviour (where it lives) | Verified by |
|---|---|---|
| **New customer signs up** — unique email, password >8 chars with upper/lower/special, reset link by email | `accounts/` — case-insensitive unique email, `ComplexPasswordValidator`, 1-hour single-use reset link built from `FRONTEND_URL` (not the request header), new `/reset-password` page, auth throttle | `Workflow1Auth` (9 tests) + live browser run |
| **Roles** — admin everything, staff limited, customer own data only, only admin adds staff | `CustomerAccessPolicyPermission` (customers read-only on own records + explicit own actions), `IsAdminOrReadOnly` for catalogue, `RoleRoute` on the frontend | `Workflow7Permissions` (9 tests) + live HTTP checks |
| **Launching a plan** — product (name, type, sales/cost price, notes), variants (+560), plan (price, daily/weekly/monthly/yearly, min qty, availability, pause/early-close/renew/auto-close per plan) | `products/`, `plans/`; availability window and min quantity enforced on quotes and subscriptions; archive instead of delete when referenced | `Workflow2Catalog` (9 tests) |
| **Quote → subscription** — templates, validity, Draft→Quotation→Confirmed→Active→Closed, anyone can see where it stands | `quotations/` (templates, send / accept / reject / confirm, idempotent under row lock), `subscriptions/` (confirm / activate / pause / resume / renew / close, status history) | `Workflow3Quotations` (14 tests) + live browser run |
| **Billing day** — invoices created from subscriptions, taxes automatic, confirm / cancel / send / print, Draft→Confirmed→Paid, nothing billed twice or skipped | `subscriptions/billing.py` (catch-up of missed cycles, unique constraint per period, expiry handled per plan), Celery beat schedule, `pricing.py` (single source of money maths), invoice PDF with tax breakdown | `Workflow4Billing` (12 tests), `Workflow5TaxDiscount` |
| **Discount request** — admin-only rules, fixed/percentage, min purchase/qty, dates, usage limit, per product or whole subscription, appears on next invoice on its own, stops at expiry/limit | `discounts/` + `Subscription.discount` + line discounts; usage consumed under lock; never negative totals | `Workflow5TaxDiscount` (10 tests) |
| **Money comes in** — method, amount, date, note, against the right invoice; paid vs outstanding | `payments/services.py` (partial payments, overpayment blocked, duplicate guard, admin reversal), derived invoice status incl. Overdue | `Workflow6Payments` (10 tests) + live browser run |
| **Finance lead** — active subscriptions, revenue, owed, overdue, filters, <2 s with thousands of rows | `reports/views.py` (filters, aggregate queries), indexes, server-side pagination + sort + date filters in every list | `Workflow8Dashboard` (6 tests), `PerformanceBudget` (3 tests) |

## 2. Workflow used (phases)

1. **Inspect** — read the PDF and every module; wrote the gap analysis below. ✅
2. **Infra** — missing `dj-database-url`, Celery beat schedule, secrets / reset-link settings, env template. ✅
3. **Security** — role-aware permissions, admin-only configuration, immutable payments and invoice status, throttling. ✅
4. **Pricing core** — one service used by quotations, subscriptions and invoices. ✅
5. **Catalogue** — admin-only writes, archive-on-delete, plan availability and min-quantity enforcement. ✅
6. **Quotations & subscriptions** — templates, lifecycle, history, edit, renew. ✅
7. **Billing** — catch-up, uniqueness, discount redemption, tax breakdown, housekeeping. ✅
8. **Invoices & payments** — draft edit, real email result, reversal, duplicate guard. ✅
9. **Reports** — filters, aggregates, reversed payments excluded. ✅
10. **Frontend** — reset page, pagination/sort/date filters, templates, confirm/history/edit/renew, payment reversal, dashboard filters, route guards, admin gating. ✅
11. **Verification** — 91 backend tests + live browser/HTTP run + production build. ✅
12. **Report** — `SPEC_COMPLIANCE_REPORT.md`. ✅

## 3. Gap analysis that drove the work (existing code vs. spec)

| # | Finding in the existing code | Resolution |
|---|---|---|
| S1 | A customer could `PATCH` their own invoice to `PAID`, create `ACTIVE` subscriptions for other customers, archive customers | Customers are read-only except explicit own-record actions; status fields are no longer writable |
| S1 | Duplicate email differing only by case crashed registration with a 500 | Case-insensitive validation → 400 |
| S1 | Reset email link built from the request `Origin` header; no `/reset-password` page; mail errors swallowed | `FRONTEND_URL`, 1 h expiry, new page, failures logged |
| S2 | Staff could create/edit products, plans, variants; deleting a used product returned a 500 | Admin-only; archive when referenced |
| S2/S3 | Plan availability dates, min quantity, active flag were stored but never enforced | Enforced on quotation and subscription create/edit |
| S3 | **No quotation templates**; no payment terms on quotes; no Quotation/Confirmed steps; double-click could create duplicate subscriptions | Templates, payment terms, send/accept/confirm, idempotent confirm |
| S3 | Browser-supplied unit price, tax % and discount amount were trusted | Computed on the server; client values ignored |
| S4 | Billing did one cycle per run (a missed day was skipped); no DB uniqueness; no scheduler; silent expired-but-not-closed billing | Catch-up loop, unique constraint, beat schedule, explicit expiry rules per plan |
| S4 | Tax only when a rule was attached by hand; plan fee untaxed; no breakdown | Rule resolution by product/date, breakdown stored on invoice + PDF |
| S4 | Invoice "send" reported success even if email failed; `PATCH` could edit status; `DELETE` allowed | Real delivery result, immutable status, no delete |
| S5 | Discount usage counter never incremented; no subscription-level discounts; eligibility used "today" | Redemptions under lock, `Subscription.discount`, eligibility on the billing date |
| S6 | Payments could be edited/deleted (corrupting balances); no duplicate guard or reversal | Immutable, duplicate guard, admin reversal |
| S7 | Dashboard had no filters, counted any payment, looped in Python for MRR | Filters + aggregate queries; reversed payments excluded |
| NF | Every list silently showed only the first 20 rows | `Pagination` + server-side sort/date filters; dropdowns load all pages |
| Ops | `dj_database_url` missing from `requirements.txt` (Docker backend could not start) | Added |
