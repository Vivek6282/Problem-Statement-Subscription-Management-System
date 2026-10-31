# Brightloop UI foundation

One reference for everyone building screens. Reuse what is listed here before writing new styles.

## One palette

The app uses a **single palette**, defined in [`frontend/tailwind.config.js`](../frontend/tailwind.config.js). Every screen (admin, staff, customer portal, and auth) uses these tokens. Do not add a second palette, a separate stylesheet with its own colours, or a light/dark/system theme switcher.

| Token | Value | Use for |
|---|---|---|
| `primary` / `primary-600` | `#2563EB` | main actions, active nav item, links |
| `primary-50`, `-100`, `-500`, `-700`, `-800` | blue scale | tints, hover, focus rings |
| `navy-950` / `navy-900` / `navy-800` | `#020617` / `#0F172A` / `#1E293B` | sidebar, auth page backdrop, secondary buttons |
| `background` | `#F8FAFC` | page background |
| `surface` | `#FFFFFF` | cards, modals |
| `text` / `text-muted` | `#1E293B` / `#64748B` | body text / secondary text |
| `success` | `#16A34A` | paid, active, confirmed |
| `warning` | `#F59E0B` | due soon, pending |
| `danger` | `#DC2626` | overdue, errors, destructive actions |

Neutrals use Tailwind's built-in `slate` scale. Font: **Inter** (`font-sans`).

## Shared components

Import with the `@/` alias (it points to `frontend/src`).

| Component | Import | Notes |
|---|---|---|
| `Button` | `@/components/ui/Button` | `variant`: primary, secondary, outline, danger, success, ghost. `size`: sm, md, lg. `isLoading` shows a spinner and disables it |
| `Input` | `@/components/ui/Input` | `label`, `error`, `helperText`. A `required` field gets a red `*` |
| `Select` | `@/components/ui/Select` | Same props as `Input`, plus `options={[{ label, value }]}` |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | `@/components/ui/Card` | Every content block sits in a card |
| `Badge` | `@/components/ui/Badge` | `variant`: default, success, warning, danger, info, neutral. **Always include the status text**, not colour alone |
| `Modal` | `@/components/ui/Modal` | `isOpen`, `onClose`, `title`, `description`, `maxWidth`. Closes on Esc |
| `EmptyState` | `@/components/ui/EmptyState` | `title`, `description`, optional `actionLabel` + `onAction`, `icon` |
| `Skeleton` | `@/components/ui/Skeleton` | Loading placeholder. Use `h-16 w-full rounded-xl` rows for tables |
| `AppLayout`, `Sidebar`, `TopNav` | `@/components/layout/*` | The signed-in shell. Add new screens as routes inside `<Route element={<AppLayout />}>` in `App.tsx` |
| `AccessDeniedPage` | `@/features/auth/AccessDeniedPage` | Render it when the user's role cannot use a screen. `requiredRole="administrators"` names who can |

Icons come from `lucide-react`, at `w-4 h-4` in buttons and tables and `w-5 h-5` in nav.

Helpers in `@/lib/utils`: `cn()` (merges class names), `formatCurrency()`, `formatDate()`, `formatDateTime()`.
Error text in `@/lib/apiErrors`: `formatApiError(err, fallback)` turns any API error into one readable sentence.

## Auth and roles

`useAuth()` from `@/features/auth/AuthContext` gives you `user`, `isAuthenticated`, `isLoading`, and the role flags:

| Flag | True for |
|---|---|
| `isAdmin` | `role === 'ADMIN'` only |
| `isStaff` | `ADMIN` or `STAFF` (any internal user) |
| `isCustomer` | `CUSTOMER` |

Use `isAdmin` for admin-only actions (pricing, tax rules, discounts, creating staff). Do not check `user.is_staff`: staff accounts have it set too.

Hiding a button is never the only protection. The API enforces every role rule (`backend/apps/accounts/permissions.py`). The UI flags only stop people from seeing actions that would fail.

## Page patterns

Copy these from an existing page such as `features/customers/CustomersPage.tsx`:

- **Page header:** `h1` `text-2xl font-black text-slate-900 tracking-tight`, a subtitle `text-xs text-slate-500 mt-1`, and the primary action button on the right.
- **Filters:** a `Card` holding a search `Input` with a `Search` icon, plus a compact `select`.
- **Tables:** a `Card className="overflow-hidden"` wrapping `table.w-full.text-left.text-xs`. The header row is `bg-slate-50/80`, uppercase and bold, and body rows have `divide-y divide-slate-100`.
- **Error alert:** `p-3 bg-red-50 border border-red-200 rounded-xl` with an `AlertCircle` icon and `role="alert"`.
- **States:** a `Skeleton` while loading, an `EmptyState` when there are no rows, and an error alert when the request fails.

## Password rules (keep the wording consistent)

"At least 9 characters, with uppercase and lowercase letters and a special character." This matches `backend/apps/accounts/validators.py`.
