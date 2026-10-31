# Merge Notes

## Merge: origin/main into feat/admin-module (Prompt M1)
- `frontend/src/components/layout/Sidebar.tsx`: Accepted deletion from main (WorkspaceShell and navigation.ts replace it).
- `frontend/src/App.tsx`: Main's route structure preserved (RoleRoute allow="staff" / "admin" / "customer", /team -> TeamPage). Admin's /staff route removed. `StaffPage.tsx` was unrouted and has since been deleted (feat/admin-followups); `TeamPage` at /team is the only staff screen and now has the ADMIN/STAFF role select.
- `frontend/src/features/auth/AuthContext.tsx`: Main's version taken with consistent role-based checks.
- `frontend/src/features/dashboard/DashboardPage.tsx`: Main's layout and styling retained.
- `frontend/src/features/reports/ReportsPage.tsx`: Retained admin's reporting logic and charts.
- `frontend/src/features/invoices/InvoicesPage.tsx`: Re-applied admin's query param handling for status / overdue filtering.
- `backend/apps/accounts/serializers.py`: Auto-merged, preserved admin's fields (is_superuser and last_login) and role validation.

## Merge: feat/admin-module into jestin / main
- Follows the notes above: `/staff` stays unrouted, `TeamPage` at `/team` is the staff screen, `AuthContext` keeps main's role-based checks.
- `DashboardPage.tsx`: main's minimal layout, plus the admin module's drilldowns (MRR, active subscriptions, overdue invoices, collected revenue), CSV export, churn rate and all-time collected.
- `ReportsPage.tsx`: admin module's reports on the Brightloop chart palette.
- User accounts API (`/api/v1/users/` and `/api/v1/auth/users/`) is admin-only; staff no longer read the account list. `tests_staff_admin.py` updated to match.
- `StaffPage.tsx` was kept unrouted for a while and removed in `feat/admin-followups`.
