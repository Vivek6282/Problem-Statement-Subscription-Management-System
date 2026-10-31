import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Repeat,
  FileText,
  CreditCard,
  Package,
  Layers,
  FileCheck,
  Percent,
  Receipt,
  BarChart3,
  ShieldCheck,
  UserCog,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthContext'

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const { isStaff, isAdmin } = useAuth()

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', show: isStaff },
    { label: 'Customers', icon: Users, path: '/customers', show: isStaff },
    { label: 'Subscriptions', icon: Repeat, path: '/subscriptions', show: true },
    { label: 'Quotations', icon: FileCheck, path: '/quotations', show: true },
    { label: 'Invoices', icon: FileText, path: '/invoices', show: true },
    { label: 'Payments', icon: CreditCard, path: '/payments', show: true },
    { label: 'Products', icon: Package, path: '/products', show: isStaff },
    { label: 'Plans', icon: Layers, path: '/plans', show: isStaff },
    { label: 'Tax Rules', icon: Receipt, path: '/taxes', show: isStaff },
    { label: 'Discounts', icon: Percent, path: '/discounts', show: isStaff },
    { label: 'Reports', icon: BarChart3, path: '/reports', show: isStaff },
    { label: 'Audit Trail', icon: ShieldCheck, path: '/audit', show: isStaff },
    { label: 'Staff & Roles', icon: UserCog, path: '/staff', show: isAdmin },
  ]

  return (
    <aside
      className={cn(
        'bg-navy-950 text-slate-300 border-r border-slate-800 transition-all duration-300 flex flex-col z-30 select-none min-h-screen',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-white shadow-md shadow-primary/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white tracking-tight text-base leading-tight">Brightloop</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Billing Core</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                    isActive
                      ? 'bg-primary text-white shadow-sm shadow-primary/30 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  )
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            )
          })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80">
        <div
          className={cn(
            'flex items-center gap-3 px-2 py-2 rounded-xl bg-slate-900/60 border border-slate-800/60',
            collapsed && 'justify-center p-2'
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-semibold text-xs border border-slate-700">
            BL
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate">Brightloop ERP</span>
              <span className="text-[10px] text-slate-400 font-mono">v1.2.0 • Pro</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
export default Sidebar
