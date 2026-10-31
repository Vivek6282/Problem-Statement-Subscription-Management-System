import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/features/auth/AuthContext'

// Layouts
import { AppLayout } from '@/components/layout/AppLayout'

// Pages
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { ProfilePage } from '@/features/auth/ProfilePage'

import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { CustomersPage } from '@/features/customers/CustomersPage'
import { ProductsPage } from '@/features/products/ProductsPage'
import { PlansPage } from '@/features/plans/PlansPage'
import { SubscriptionsPage } from '@/features/subscriptions/SubscriptionsPage'
import { QuotationsPage } from '@/features/quotations/QuotationsPage'
import { InvoicesPage } from '@/features/invoices/InvoicesPage'
import { PaymentsPage } from '@/features/payments/PaymentsPage'
import { TaxesPage } from '@/features/taxes/TaxesPage'
import { DiscountsPage } from '@/features/discounts/DiscountsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { AuditPage } from '@/features/audit/AuditPage'
import { CustomerPortalPage } from '@/features/portal/CustomerPortalPage'
import { LandingPage } from '@/features/landing/LandingPage'
import { TeamPage } from '@/features/team/TeamPage'
import { AccessDeniedPage } from '@/features/auth/AccessDeniedPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Landing & Auth Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected App Routes */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              <Route path="/quotations" element={<QuotationsPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/taxes" element={<TaxesPage />} />
              <Route path="/discounts" element={<DiscountsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/audit" element={<AuditPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/portal" element={<CustomerPortalPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/access-denied" element={<AccessDeniedPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
