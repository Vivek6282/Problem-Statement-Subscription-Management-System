import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Check, X, Zap } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { api } from '@/lib/api'
import { CustomerLayout } from './CustomerLayout'
import { WorkspaceShell } from './WorkspaceShell'
import { navGroups } from './navigation'

function RunBillingButton() {
  const [isRunning, setIsRunning] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const handleRunBilling = async () => {
    try {
      setIsRunning(true)
      const res = await api.post('/subscriptions/run-batch-billing/')
      setToast(`Billing completed: Created ${res.data.invoices_created} invoices, processed ${res.data.found_due} cycles.`)
    } catch (err: any) {
      setToast(`Execution notice: ${err?.response?.data?.error || err.message}`)
    } finally {
      setIsRunning(false)
      setTimeout(() => setToast(null), 5000)
    }
  }

  return (
    <>
      <button
        type="button"
        className="bl-refresh"
        onClick={handleRunBilling}
        disabled={isRunning}
        title="Run the billing cycle for all subscriptions that are due"
        aria-label="Run billing"
      >
        <Zap size={14} className={isRunning ? 'animate-pulse' : ''} />
        <span className="bl-hide-sm">{isRunning ? 'Running…' : 'Run billing'}</span>
      </button>
      {toast && (
        <div className="bl-notice bl-toast" role="status">
          <Check size={18} />
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification">
            <X size={17} />
          </button>
        </div>
      )}
    </>
  )
}

export const AppLayout: React.FC = () => {
  const { isAuthenticated, isLoading, user, isStaff } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4" role="status">
          <div className="h-8 w-8 rounded-full border-2 border-primary-200 border-t-primary animate-spin" />
          <p className="text-sm text-slate-500">Loading your workspace…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // If customer logs in, redirect to customer portal if at root/dashboard
  if (user?.role === 'CUSTOMER' && window.location.pathname === '/dashboard') {
    return <Navigate to="/portal" replace />
  }

  if (user?.role === 'CUSTOMER') return <CustomerLayout />

  const groups = navGroups
    .map((group) => ({
      label: group.label,
      items: group.items.filter((item) => !item.staffOnly || isStaff),
    }))
    .filter((group) => group.items.length > 0)

  const role = user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : 'Staff'

  return (
    <WorkspaceShell
      rootLabel="Staff workspace"
      intro={{ eyebrow: 'Staff workspace', text: 'Billing, kept in order.' }}
      groups={groups}
      accountNote={`${role} account`}
      headerActions={isStaff ? <RunBillingButton /> : undefined}
    />
  )
}
