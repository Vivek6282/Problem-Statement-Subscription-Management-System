import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, LogOut, User as UserIcon, Bell, ChevronDown } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'

export const TopNav: React.FC = () => {
  const { user, logout, isStaff } = useAuth()
  const navigate = useNavigate()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isRunningBilling, setIsRunningBilling] = useState(false)
  const [billingToast, setBillingToast] = useState<string | null>(null)

  const handleRunBilling = async () => {
    try {
      setIsRunningBilling(true)
      const res = await api.post('/subscriptions/run-batch-billing/')
      setBillingToast(`Billing finished! Invoices Created: ${res.data.invoices_created}, Processed: ${res.data.found_due}`)
      setTimeout(() => setBillingToast(null), 6000)
    } catch (err: any) {
      setBillingToast(`Billing execution error: ${err?.response?.data?.error || err.message}`)
      setTimeout(() => setBillingToast(null), 6000)
    } finally {
      setIsRunningBilling(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Toast Notification Banner */}
      {billingToast && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 mt-2 px-4 py-2.5 bg-navy-950 text-white rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
          <Bell className="w-4 h-4 text-primary" />
          <span>{billingToast}</span>
        </div>
      )}

      {/* Title / Context */}
      <div className="flex items-center gap-3">
        <h2 className="text-base font-bold text-slate-800 tracking-tight">Enterprise Billing Operations</h2>
        <Badge variant={user?.role === 'ADMIN' ? 'danger' : user?.role === 'STAFF' ? 'info' : 'success'}>
          {user?.role}
        </Badge>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {isStaff && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRunBilling}
            isLoading={isRunningBilling}
            className="hidden sm:inline-flex border-primary-200 text-primary-700 hover:bg-primary-50"
          >
            <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
            Run Billing Engine
          </Button>
        )}

        {/* Profile Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-50 border border-primary-200 text-primary-700 flex items-center justify-center font-bold text-xs uppercase">
              {user?.first_name?.[0] || user?.email?.[0] || 'U'}
            </div>
            <div className="text-left hidden md:block">
              <span className="block text-xs font-semibold text-slate-800 leading-none">{user?.full_name || user?.email}</span>
              <span className="text-[10px] text-slate-400 font-medium">{user?.email}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">{user?.full_name || 'Signed In'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>

              <button
                onClick={() => {
                  setIsDropdownOpen(false)
                  navigate('/profile')
                }}
                className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <UserIcon className="w-4 h-4 text-slate-400" />
                Account Profile
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

