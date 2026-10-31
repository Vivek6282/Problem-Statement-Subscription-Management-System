# Brightloop — Admin Module Implementation Status & Handoff

**Branch:** `feat/admin-followups` (from `origin/main` at `33f7666`)
**Scope:** Member 1 (Admin module): catalog, staff access, reporting, optional AI assistant.

Nothing here is "complete" in a blanket sense; each row below says what was run and what it showed.

---

## 1. Follow-up prompts

| Prompt | Status | Evidence |
|---|---|---|
| P1 Close the public data leak | verified | `PublicSummaryView` returns only `{"status": "HEALTHY"}`; test `PublicSummaryPrivacyTestCase` passes. No frontend caller existed. Commit `fix(reports): remove private data from public summary endpoint` |
| P2 Missing dependencies | verified | Fresh venv: `pip install -r backend/requirements.txt` then `manage.py check` -> no issues. Added `python-dateutil`, `dj-database-url` |
| P3 Weekly MRR definition | verified | Weekly = x52/12 in model and SQL (`MRR_FACTORS`); model and SQL totals equal in `MRRDefinitionTestCase`. Awaiting Member 3 approval (`docs/decisions.md`) |
| P4 Decimal strings in revenue trend | verified | No `float(` left in `reports/views.py`; test `RevenueTrendWireFormatTestCase`; `tsc -b` clean |
| P5 Overdue rule and metric contract | verified | `tests_reports_contract.py` (10 tests): overdue rule, cards equal drill-down `count`/`total`. Churn labelled `churn_provisional`. Definitions await Member 3 approval |
| P6 Currency and business timezone | verified | `CURRENCY_CODE`, `BUSINESS_TIMEZONE`, `business_today()`, `/reports/config/`; tests incl. Kolkata near-midnight. Defaults (USD, Asia/Kolkata) are assumptions. Other modules still use `date.today()` (listed in `docs/decisions.md`) |
| P7 URL filters, labels, states (frontend) | verified | `tsc -b`, build pass. Manually checked in a browser against seeded data: URL restores the drill-down after reload, Back closes it, card count equals drill-down count. Not covered by automated UI tests |
| P8 Streamed, safe exports | verified | `tests_reports_exports.py` (10 tests). Leading-comma values are not prefixed (a comma is only a CSV delimiter and is quoted by the writer) |
| P9 Staff account safety | verified | `apps/accounts/tests_staff_safety.py` (11 tests), see "For Member 4 review" |
| P10 Remove duplicate staff screen, fix docs | implemented | `StaffPage.tsx` deleted; role select added to `TeamPage` (checked via `tsc`/build only, not exercised in a browser) |
| A1 AI adapter and switches | verified | `apps/assistant` (14 tests with `FakeProvider`). Anthropic path tested against a mocked SDK client only |
| A2 Product description drafts | verified | 12 backend tests; browser check with `AI_PROVIDER=fake`: draft appears, "Use this draft" fills the form field |
| A3 Report summaries | verified | 10 backend tests; browser check with the fake provider. |

Not run: the AI features against the real Anthropic API (no key in this environment). With a real key, `AI_MAX_OUTPUT_TOKENS=400` may be too low for models that think before answering; raise it if drafts come back empty.

## 2. Baseline checks on the final branch

| Command | Result |
|---|---|
| `USE_SQLITE=True python manage.py check` | System check identified no issues |
| `USE_SQLITE=True python manage.py makemigrations --check --dry-run` | No changes detected |
| `USE_SQLITE=True python manage.py test` | Ran 163 tests, OK (main had 90) |
| `npx tsc -b` (frontend) | no errors |
| `npm run build` (frontend) | built successfully |
| `npm run lint` (frontend) | exit 0, warnings only (unused imports and `set-state-in-effect`, mostly pre-existing) |

## 3. Component status

| Area | State |
|---|---|
| Catalog (products, plans, taxes, discounts) | Admin-write, staff read-only, archive instead of delete when referenced. Unchanged by this branch except where noted |
| Staff & access (`/team`, `TeamPage`) | Admin only. Create, activate/deactivate, ADMIN/STAFF role change (self-demotion, self-deactivation and last-admin guards on the server) |
| Reporting (`apps/reports`) | Definitions in `docs/decisions.md`. Cards and drill-downs share one queryset helper. Exports stream and are formula-safe |
| Dashboard / Reports pages | Filters, drill-down and page in the URL; exact metric labels; loading, empty, error and stale states |
| AI assistant (`apps/assistant`) | Off by default (`AI_ENABLED` plus an admin switch). Admin-only drafts. Nothing is saved automatically. Provider: `anthropic` or `fake` |

## 4. Performance

The earlier benchmark numbers (single-digit to tens of milliseconds per endpoint) came from `benchmark_performance.py` on a small seed dataset, calling view functions directly, with no HTTP stack. They do not show behaviour at 10,000 subscriptions / 100,000 invoices and are not a performance claim. Exports now stream and use `.iterator()`; the per-subscription drill-down still computes MRR in Python for the visible page only.

## 5. Handoff notes

- **Member 2 / 3 (coupons):** `POST /api/v1/discounts/validate-code/` is Staff/Admin only, so a customer gets 403. Customer checkout must use its own authorized flow owned by Members 2 and 3; Member 1 does not widen `validate-code`.
- **Member 3 (billing):** Approve or change the MRR, overdue, billed, received, outstanding and churn definitions and the business timezone in `docs/decisions.md`. `normalized_mrr` (rounded) and `normalized_mrr_exact` (unrounded) are on `Subscription`.
- **API shape change:** `/reports/mrr-breakdown/` and `/reports/revenue-trends/` now return `{"results": [...], "currency_code", "generated_at", "as_of_date"}` instead of a bare list.
- **AI configuration:** see `.env.example` (`AI_ENABLED`, `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `AI_MODEL`, limits). Keep keys in the backend `.env` only.

## For Member 4 review

Member 1 touched these files in your area (`apps/accounts`) with minimal diffs:

- `backend/apps/accounts/serializers.py` — `StaffCreateSerializer.create` no longer sets `is_superuser` from the role. New ADMIN accounts are `is_staff=True`, `is_superuser=False`. Email was already case-insensitively unique and lowercased; a test now covers it.
- `backend/apps/accounts/views.py`
  - Role change: promoting to ADMIN leaves `is_superuser` unchanged; demoting to STAFF sets it to `False` (otherwise a demoted superuser still passes `User.is_admin_user`).
  - `PATCH`/`PUT` on `/api/v1/auth/users/<id>/` already ran the self-demotion, self-deactivation and last-admin checks (same code path as the `deactivate` action); no path skipped them. Added: a CUSTOMER target returns 400 instead of 404, and `role=CUSTOMER` is rejected (it already was, by the serializer).
  - `_invalidate_user_sessions` only ever deleted the target's sessions, but it scanned every session (including expired) and hid all errors. It now scans unexpired sessions, skips undecodable ones with a log line, and deletes only sessions whose `_auth_user_id` equals the target.
  - DELETE is still disabled (405).
- Tests: `backend/apps/accounts/tests_staff_safety.py` (new) and one assertion changed in `tests_staff_admin.py` (promotion no longer makes a superuser).
