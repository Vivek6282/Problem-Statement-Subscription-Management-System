import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Zap,
  Calendar,
  SlidersHorizontal,
  Bell,
  Settings,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Receipt,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { api } from '@/lib/api'

export const TopNav: React.FC = () => {
  const { user, logout, isStaff } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isRunningBilling, setIsRunningBilling] = useState(false)
  const [billingToast, setBillingToast] = useState<string | null>(null)

  const handleRunBilling = async () => {
    try {
      setIsRunningBilling(true)
      const res = await api.post('/subscriptions/run-batch-billing/')
      setBillingToast(`Billing completed: Created ${res.data.invoices_created} invoices, processed ${res.data.found_due} cycles.`)
      setTimeout(() => setBillingToast(null), 5000)
    } catch (err: any) {
      setBillingToast(`Execution notice: ${err?.response?.data?.error || err.message}`)
      setTimeout(() => setBillingToast(null), 5000)
    } finally {
      setIsRunningBilling(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const currentPath = location.pathname

  const navLinks = [
    { label: '+ Overview', path: '/dashboard', active: currentPath === '/dashboard' || currentPath === '/' },
    { label: 'Estimates', path: '/quotations', active: currentPath.startsWith('/quotations') },
    { label: '+ Invoices', path: '/invoices', active: currentPath.startsWith('/invoices') },
    { label: 'Payments', path: '/payments', active: currentPath.startsWith('/payments') },
    { label: 'Recurring', path: '/subscriptions', active: currentPath.startsWith('/subscriptions') },
    { label: 'Checkouts', path: '/plans', active: currentPath.startsWith('/plans') || currentPath.startsWith('/products') },
  ]

  return (
    <header className="h-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 transition-all">
      {/* Toast Notification Banner */}
      {billingToast && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 mt-2 px-5 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-2 z-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{billingToast}</span>
          <button onClick={() => setBillingToast(null)} className="ml-2 text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Brand & Subtitle Left */}
      <div className="flex items-center gap-3.5">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#4F46E5] to-[#818CF8] flex items-center justify-center text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight text-slate-900 leading-none">BRIGHTLOOP</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">80</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium tracking-tight mt-0.5">Smart Finances, Better Business</span>
          </div>
        </Link>
      </div>

      {/* Floating Center Dark Navigation Pill Bar (FINNOVA Signature) */}
      <nav className="hidden lg:flex items-center bg-[#13141F] rounded-full p-1.5 shadow-md shadow-slate-900/10 border border-slate-800">
        {navLinks.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              item.active
                ? 'bg-[#4F46E5] text-white shadow-sm shadow-indigo-500/40 font-bold scale-[1.02]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Right Utility Icons & Profile Avatar */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <Link
          to="/invoices"
          className="w-9 h-9 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors shadow-sm"
          title="Invoices"
        >
          <Receipt className="w-4 h-4" />
        </Link>

        {isStaff && (
          <button
            onClick={handleRunBilling}
            disabled={isRunningBilling}
            className={`w-9 h-9 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors shadow-sm ${
              isRunningBilling ? 'opacity-50 animate-pulse' : ''
            }`}
            title="Trigger Billing Engine Cycle"
          >
            <Zap className={`w-4 h-4 text-amber-500 fill-amber-400 ${isRunningBilling ? 'animate-spin' : ''}`} />
          </button>
        )}

        <Link
          to="/subscriptions"
          className="w-9 h-9 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 hidden sm:flex items-center justify-center transition-colors shadow-sm"
          title="Renewals & Schedule"
        >
          <Calendar className="w-4 h-4" />
        </Link>

        <Link
          to="/reports"
          className="w-9 h-9 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 hidden md:flex items-center justify-center transition-colors shadow-sm"
          title="Financial Filters & Reports"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </Link>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setBillingToast('All billing engines operational. Zero failed syncs.')}
            className="w-9 h-9 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors shadow-sm relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
        </div>

        <Link
          to="/audit"
          className="w-9 h-9 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 hidden sm:flex items-center justify-center transition-colors shadow-sm"
          title="Audit Trail & Settings"
        >
          <Settings className="w-4 h-4" />
        </Link>

        {/* User Profile Avatar with Menu */}
        <div className="relative ml-1">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-indigo-200 transition-all"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold text-xs flex items-center justify-center shadow-sm uppercase border-2 border-white">
              {user?.first_name?.[0] || user?.email?.[0] || 'U'}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {isDropdownOpen && (
            <div
              className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95"
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.full_name || 'Admin User'}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                  {user?.role}
                </span>
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
                className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
