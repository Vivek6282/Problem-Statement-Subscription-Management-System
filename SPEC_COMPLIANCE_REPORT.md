# Final Report — Spec Compliance Pass

Branch: `feature/spec-compliance` (nothing committed yet). Spec: `Subscription_Management_System.pdf`. See `SPEC_COMPLIANCE_PLAN.md` for the gap analysis and workflow.

## 1. Already implemented before this pass (kept)
Custom user model with session auth and password policy; customer / product / variant / plan / tax / discount / quotation / subscription / invoice / payment CRUD; ReportLab PDFs; billing engine skeleton with row locking; dashboard cards and charts; audit log; Docker Compose stack; the whole UI (kept as is — no redesign).

## 2. New or fixed in this pass
**Security (confirmed holes, now closed and tested):** customers could mark their own invoice paid, create active subscriptions for other customers and archive customers; staff could edit catalogue pricing; payments and invoice status were editable; case-variant duplicate email caused a 500; reset link was built from a spoofable header and led to a page that did not exist.

**Spec features that were missing:** quotation templates and "start from template"; quotation payment terms; quotation send / accept / reject / confirm and subscription confirm / renew / history / edit; idempotent confirmation (no duplicate subscriptions); plan availability + minimum quantity enforcement; subscription-level discounts with real usage counting; automatic tax rules with breakdown on invoices; payment reversal and duplicate protection; draft invoice editing; real email result on "send"; dashboard filters; catch-up billing; scheduled billing + housekeeping; server-side pagination, sorting and date filters.

**Server-side money:** unit price (variant adjustment included), tax and discount are always calculated by the backend from the catalogue, tax rules and discount rules; values sent by the browser are ignored. One `pricing.py` is used by quotes, subscription estimates and invoices so they cannot disagree.

## 3. Existing files modified
Backend: `config/settings.py`, `accounts/{permissions,serializers,views}.py`, `customers/{serializers,views}.py`, `products/{serializers,views}.py`, `plans/{serializers,views}.py`, `taxes/{models,serializers,views}.py`, `discounts/{models,serializers,views}.py`, `quotations/{models,serializers,views,urls,pdf}.py`, `subscriptions/{models,serializers,views,billing,tasks}.py` and the `run_billing_cycle` command, `invoices/{models,serializers,views,pdf}.py`, `payments/{models,serializers,services,views}.py`, `reports/{views,tests}.py`, seed command, `requirements.txt`.
Frontend: `App.tsx`, `Sidebar.tsx`, `AuthContext.tsx`, `lib/api.ts`, `types/index.ts`, and the pages Dashboard, Customers, Products, Plans, Subscriptions, Quotations, Invoices, Payments, Taxes, Discounts, Audit, Portal.
Other: `docker-compose.yml`, `.env.example`.

## 4. New files
Backend: `subscriptions/pricing.py`, `subscriptions/maintenance.py`, `quotations/services.py`, `config/pagination.py`, `subscriptions/test_spec_workflows.py`, migrations `invoices/0002`, `payments/0002`, `quotations/0002`, `subscriptions/0002`.
Frontend: `features/auth/ResetPasswordPage.tsx`, `components/layout/RoleRoute.tsx`, `components/ui/{Pagination,TableControls,MultiSelect}.tsx`.
Docs: `SPEC_COMPLIANCE_PLAN.md`, this report.

## 5. Database changes (4 migrations, verified forward/backward with data present)
- `Invoice`: `applied_discounts`, `sent_at`; **unique** (subscription, period start, period end); indexes on (status, due_date), (customer, status), issue_date. `InvoiceItem.tax_breakdown`.
- `Payment`: `status` (completed/reversed), `reversed_at`, `reversal_reason`; **unique** (invoice, transaction reference) when set; indexes on date and (status, date).
- `Subscription`: `discount`; indexes (status, next_billing_date), (customer, status), created_at.
- `Quotation`: `payment_terms`, `discount`, `template`; `QuotationItem`: `discount`, `tax_amount`; new `QuotationTemplate` and `QuotationTemplateItem`.

## 6. Dependencies
Added to `requirements.txt`: `dj-database-url`, `python-dateutil` (both were already imported by the code). Frontend: none added.

## 7. Tests performed
| What | Result |
|---|---|
| Backend suite (SQLite): 9 original + 82 new covering all 8 workflows, security regressions, tenant isolation, billing edge cases (month ends, leap years, catch-up, expiry, pause/resume), discounts, payments, dashboard filters, performance budgets | **91 / 91 pass** |
| `makemigrations --check`, `manage.py check` | clean |
| Migrations on a fresh DB and reversed/re-applied with seeded data | OK; existing payments default to *Completed* |
| Seeder run twice | repeatable |
| Frontend `tsc` type-check and `npm run build` | pass (oxlint: warnings only, 0 errors) |
| Celery beat schedule resolves to registered tasks; both tasks run through Celery (eager) | OK |
| **Live browser run** (Vite + Django): admin login; dashboard filters; new quotation from a template (total 4,671.62 = 499 + 2,560 + 2×450 + 18% GST); send → confirm → activate; subscription detail with history and billing history; force billing (invoice 8,919.62 incl. tax, next date a year ahead); server error shown for overpayment; partial payment → *Partially Paid*; payment reversal; password-reset request → emailed link → reset page → single-use; customer portal; customer redirected away from staff pages; edit of a draft quotation | all behaved as intended |
| Live HTTP security checks (staff and customer sessions): config writes 403, staff creation 403, other customer's records 404, forged status 403, reset link reuse 400 | OK |

## 8. Fully functional (tested)
Everything in the spec's 8 scenes, as mapped in `SPEC_COMPLIANCE_PLAN.md`.

## 9. Known limits (honest list)
- **PostgreSQL / Docker not exercised here.** Tests and the live run used SQLite; the Postgres path was reviewed (row locks use `of=('self',)`, conditional unique constraints are standard) but `docker-compose up` was not run. Please run it once.
- **Real email not sent.** With the default console backend the message is printed to the server log, and the API says so. The failure path is tested with a deliberately broken backend. SMTP credentials are needed (below).
- **Celery worker/beat were not run as separate processes**; schedule and tasks were verified through the Celery app.
- **Performance** was measured on SQLite with 2,000 subscriptions/invoices (all list pages and the dashboard under the 2 s budget, no per-row queries). Postgres timings were not measured.
- Billing decisions worth knowing: activating a subscription after its start date does **not** back-bill; pausing bills any already-due periods first and resuming does not bill the paused time; an expired subscription whose plan does not auto-close and which is not set to auto-renew is *not billed and is reported*, not silently skipped; one discount "use" is consumed per invoice it is applied to; the plan availability window is checked against the subscription start date (quotes: issue date).
- Editing a subscription/draft quotation in the UI supports one product line (several-line records keep their lines unless one is chosen); the API accepts any number.
- Currency is shown as `$` throughout (existing behaviour; the spec gives no currency).
- Rapid identical manual payments within 15 seconds (same invoice, amount, method, date, no reference) are treated as duplicates by design.

## 10. Environment variables / credentials needed
See `.env.example`. New ones: `FRONTEND_URL` (used in reset links), `PASSWORD_RESET_TIMEOUT_SECONDS`, `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` / `EMAIL_USE_TLS` with `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend` for real delivery, `BILLING_CRON_HOUR` / `BILLING_CRON_MINUTE`, `AUTH_THROTTLE_RATE`, `AUTO_CONFIRM_INVOICES`. With `DEBUG=False` the app now refuses to start without a real `SECRET_KEY`.

## 11. Run it
```bash
# Backend (SQLite quick start)
cd backend && python -m pip install -r requirements.txt
USE_SQLITE=True python manage.py migrate
USE_SQLITE=True python manage.py seed_demo_data
USE_SQLITE=True python manage.py runserver            # http://localhost:8000

# Frontend
cd frontend && npm install && npm run dev               # http://localhost:5173

# Recurring billing (also scheduled daily by Celery beat)
USE_SQLITE=True python manage.py run_billing_cycle [--date YYYY-MM-DD]

# Tests
USE_SQLITE=True python manage.py test

# Everything (Postgres, Redis, API, worker, beat, frontend)
docker-compose up --build
```
Demo logins are in the README (admin / staff / customer).
