# Merge Notes

## Merge: origin/main into feat/admin-module (Prompt M1)
- `frontend/src/components/layout/Sidebar.tsx`: Accepted deletion from main (WorkspaceShell and navigation.ts replace it).
- `frontend/src/App.tsx`: Main's route structure preserved (RoleRoute allow="staff" / "admin" / "customer", /team -> TeamPage). Admin's /staff route removed. StaffPage.tsx is unrouted; main's TeamPage at /team is the staff screen until the team decides otherwise.
- `frontend/src/features/auth/AuthContext.tsx`: Main's version taken with consistent role-based checks.
- `frontend/src/features/dashboard/DashboardPage.tsx`: Main's layout and styling retained.
- `frontend/src/features/reports/ReportsPage.tsx`: Retained admin's reporting logic and charts.
- `frontend/src/features/invoices/InvoicesPage.tsx`: Re-applied admin's query param handling for status / overdue filtering.
- `backend/apps/accounts/serializers.py`: Auto-merged, preserved admin's fields (is_superuser and last_login) and role validation.
