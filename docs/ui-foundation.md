# Brightloop UI foundation

One reference for everyone building screens. Reuse what is listed here before writing new styles. For roles, route guards and password reset, see [auth-and-roles.md](auth-and-roles.md).

## One palette: Brightloop green

The team agreed on **one palette**, the sage green from jestin's redesign. It is defined in [`frontend/tailwind.config.js`](../frontend/tailwind.config.js):

| Token | Main value | Use for |
|---|---|---|
| `primary-*` (`brand`) | `#305D42` (`primary` / `primary-600`), 50 → 950 scale | main actions, active nav, links, focus rings |
| `navy-*` | `#1F3327` / `#293F32` / `#18281F` | dark panels, secondary buttons |
| `slate-*`, `gray-*` (`neutral`) | warm neutrals `#F6F8F3` → `#142019` | text, borders, backgrounds |
| `background` / `surface` | `#F8F9F5` / `#FFFFFF` | page / cards and dialogs |
| `text` / `text-muted` | `#1F3327` / `#5F6B62` | body / secondary text |
| `green-*`, `emerald-*`, `success` (`positive`) | `#436C3B` | paid, active, done |
| `amber-*`, `yellow-*`, `orange-*`, `warning` (`caution`) | `#B8852F` | due soon, pending, partially paid |
| `red-*`, `rose-*`, `danger` (`negative`) | `#A14A33` | overdue, errors, destructive actions |

**How it stays one palette:** `indigo`, `blue`, `violet`, `purple`, `sky`, `teal` and `cyan` are all mapped to the brand green, so an old `bg-indigo-600` still comes out green. Even so:

- **Write `primary-*` for brand colour in new code.** It says what you mean.
- **Do not use hard-coded hex colours** like `bg-[#4F46E5]`. Those bypass the palette.
- Do not add a light/dark/system theme switcher or a stylesheet with its own colours.

The `.bl-*` classes in `styles/brightloop.css` (the workspace shell and portal) and the `.auth-*` classes in `features/auth/auth.css` (sign-in pages) use the same colours through CSS variables. If you change a colour, change it in both the Tailwind config and the CSS variables.

Font: **Inter** (`font-sans`).

## Layout

| Piece | Import | Notes |
|---|---|---|
| `AppLayout` | `@/components/layout/AppLayout` | Signed-in shell. Staff get `WorkspaceShell` with the nav from `navigation.ts`; customers get `CustomerLayout`. Add screens as routes inside it in `App.tsx` |
| `navigation.ts` | `@/components/layout/navigation` | The staff sidebar. Add an item to a group; `staffOnly: true` hides it from customers, `adminOnly: true` shows it to admins only |
| `WorkspaceShell` | `@/components/layout/WorkspaceShell` | Sidebar, header, mobile menu and sign-out, shared by staff and customers |
| `CustomerLayout` | `@/components/layout/CustomerLayout` | Customer portal shell (Overview, Subscriptions, Quotations, Invoices, Payments) |
| `RoleRoute` | `@/components/layout/RoleRoute` | Route guard in `App.tsx`: `allow="admin"`, `"staff"` or `"customer"`. A user with the wrong role sees `AccessDeniedPage`; staff opening the customer portal go to `/dashboard` |
| `AuthLayout` | `@/features/auth/AuthLayout` | Two-column shell for sign-in, sign-up and password pages. `mode`: login, register, reset. Inside it use `auth-eyebrow`, `auth-lede`, `auth-form`, `auth-hint`, `auth-notice`, `auth-success`, `auth-link`, `auth-submit` |
| `BrightloopBrand` | `@/components/layout/BrightloopBrand` | The logo. Use it instead of drawing a new one |

## Shared components

Import with the `@/` alias (it points to `frontend/src`).

| Component | Import | Notes |
|---|---|---|
| `Button` | `@/components/ui/Button` | `variant`: primary, secondary, outline, danger, success, ghost. `size`: sm, md, lg. `isLoading` shows a spinner and disables it |
| `Input` | `@/components/ui/Input` | `label`, `error`, `helperText`. The label, error and hint are linked to the field for screen readers |
| `Select` | `@/components/ui/Select` | Same props as `Input`, plus `options={[{ label, value }]}`. Also linked to its label |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | `@/components/ui/Card` | Content blocks |
| `Badge` | `@/components/ui/Badge` | `variant`: default, success, warning, danger, info, neutral. **Always include the text**, never colour alone |
| `StatusText` | `@/components/ui/StatusText` | Invoice or subscription status as a dot plus a plain-English label: `<StatusText kind="invoice" value={inv.status} />` |
| `getInvoiceStatus` | `@/features/invoices/invoiceStatus` | Label and `Badge` variant for an invoice status, including overdue |
| `Modal` | `@/components/ui/Modal` | `isOpen`, `onClose`, `title`, `description`, `maxWidth`. Announced as a dialog by its title, closes on Esc, and the close button is labelled |
| `EmptyState` | `@/components/ui/EmptyState` | `title`, `description`, optional `actionLabel` + `onAction`, `icon` |
| `Skeleton` | `@/components/ui/Skeleton` | Loading placeholder |
| `AccessDeniedPage` | `@/features/auth/AccessDeniedPage` | Shown by `RoleRoute`. Render it yourself only for a role check inside a page. `requiredRole` names who can use the screen |

Icons come from `lucide-react`. Give decorative icons `aria-hidden="true"`, and give icon-only buttons an `aria-label`.

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

Hiding a button is never the only protection. The API enforces every role rule (`backend/apps/accounts/permissions.py`). To add a screen, put its `<Route>` inside the matching `<RoleRoute>` group in `App.tsx`. Details are in [auth-and-roles.md](auth-and-roles.md).

## Page patterns

- **Page header:** `h1` `text-2xl font-semibold text-slate-900 tracking-tight`, a subtitle `text-xs text-slate-500 mt-1`, and the main action button on the right.
- **Filters:** a `Card` holding a search `Input` with a `Search` icon, plus a compact select.
- **Tables:** a `Card className="overflow-hidden"` wrapping `table.w-full.text-left.text-xs` inside `overflow-x-auto`, so wide tables scroll on phones.
- **Error alert:** `p-3 bg-red-50 border border-red-200 rounded-xl` with an `AlertCircle` icon and `role="alert"`.
- **States:** a `Skeleton` while loading, an `EmptyState` when there are no rows, and an error alert when the request fails.

## Password rules (keep the wording consistent)

"At least 9 characters, with uppercase and lowercase letters and a special character." This matches `backend/apps/accounts/validators.py`.
