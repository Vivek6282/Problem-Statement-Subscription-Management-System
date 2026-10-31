# Authentication and roles

How sign-in, roles and access work in Brightloop, and how to use them when you build a screen. For components and colours, see [ui-foundation.md](ui-foundation.md).

## Roles

| Role | Who | How the account is made |
|---|---|---|
| `ADMIN` | Controls the whole system | Seed data, or another admin on **Team & Access** |
| `STAFF` | Internal team, day-to-day billing work | An admin on **Team & Access** (`/team`). Only admins can do this |
| `CUSTOMER` | Customer businesses | Public sign-up at `/register`, which also creates their `Customer` profile |

Staff accounts have `is_staff = true` as well as admins, so **always check `role`**, never `is_staff`, to tell an admin apart.

## Who can open which screen

The routes in `frontend/src/App.tsx` are grouped by `RoleRoute`. This table is about **screens**. The API has its own rule on each endpoint (for example, any signed-in user may read the product catalogue, but only admins may change it), and those API rules are what actually protect the data.

| Screen | Admin | Staff | Customer |
|---|---|---|---|
| Dashboard, Customers, Products, Plans, Tax Rules, Discounts, Reports, Audit Trail | ✅ | ✅ | Access denied |
| Team & Access (`/team`) | ✅ | Access denied | Access denied |
| Customer portal (`/portal`) | Sent to `/dashboard` | Sent to `/dashboard` | ✅ |
| Subscriptions, Quotations, Invoices, Payments | ✅ all records | ✅ all records | ✅ **own records only** |
| Profile (`/profile`) | ✅ | ✅ | ✅ |

Inside the staff screens, some actions are admin-only (creating discounts and tax rules, changing prices). Use `isAdmin` from `useAuth()` to hide them.

### Adding a new screen

```tsx
// App.tsx: put the route in the group for the roles that may use it
<Route element={<RoleRoute allow="staff" />}>
  <Route path="/my-new-screen" element={<MyNewScreen />} />
</Route>
```

Then add the matching permission class to the API view (`IsStaffOrAdmin`, `IsAdminUserOnly`, or `CustomerAccessPolicyPermission` for records customers may see), from `backend/apps/accounts/permissions.py`. If customers can list the records, filter `get_queryset()` to `customer__user=request.user` for them, as `InvoiceViewSet` does.

## Account rules

- **One account per email.** The check ignores capital letters, so `Alice@x.com` and `alice@x.com` are the same account, and emails are stored in lowercase.
- **Password:** at least 9 characters, with an uppercase letter, a lowercase letter and a special character (`backend/apps/accounts/validators.py`). The same rule applies to sign-up, staff accounts, password change and password reset. Use this wording in the UI: "At least 9 characters, with uppercase and lowercase letters and a special character."
- **Deactivated accounts** (Team & Access → deactivate) cannot sign in. Nothing is deleted.

## Password reset

1. `/forgot-password` → `POST /api/v1/auth/password-reset-request/`. The response is the same whether or not the email exists, so it can't be used to find out who has an account.
2. The email links to `/reset-password?uid=…&token=…`.
3. `/reset-password` → `POST /api/v1/auth/password-reset-confirm/`. A link works **once**, and stops working after the password changes.

**In local development** no email is sent. The email, including the link, is printed in the **backend terminal** (`EMAIL_BACKEND=console`). Copy the link from there.

## Running it locally on Windows

Django 5.2 needs **Python 3.10 or newer**. If `python --version` shows 3.8, use the `py` launcher:

```bash
cd backend
py -3.14 -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python manage.py migrate
.venv/Scripts/python manage.py seed_demo_data
.venv/Scripts/python manage.py runserver
```

Without a `DATABASE_URL`, the backend uses SQLite, so no Postgres is needed. The frontend (`cd frontend`, `npm install`, `npm run dev`) proxies `/api` to the backend on port 8000. The demo accounts are listed in the README, and the login page has quick-fill buttons for them.

## Tests

```bash
cd backend
.venv/Scripts/python manage.py test apps.accounts
```

`apps/accounts/test_access_and_reset.py` covers:

- **Staff management:** only admins can list users and create staff; the staff endpoint can't create customers and enforces the password rule; duplicate emails in any capitalisation are rejected; deactivated users can't sign in.
- **Sign-up:** a duplicate email in different capitals is rejected with a normal error, not a server error.
- **Password reset:** the email is sent with the link; unknown emails get the same answer and no email; the link resets the password once only; tampered tokens, weak passwords and mismatched passwords are rejected.
- **Customer isolation:** a customer lists only their own invoices and gets 404 for anyone else's; staff see all invoices; signed-out requests are rejected.

If you change anything in `apps/accounts`, run these before you push.
