import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Repeat,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calendar,
  CreditCard,
  FileText,
  ArrowUpRight,
  RefreshCw,
  Plus,
  SlidersHorizontal,
  X,
  Receipt,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { api, fetchAll } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { DashboardMetrics, Customer } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'

const STATUS_COLORS = ['#16A34A', '#F59E0B', '#94A3B8', '#8B5CF6', '#2563EB', '#DC2626']

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const emptyFilters = { date_from: '', date_to: '', subscription_status: '', invoice_status: '', customer: '', payment_method: '' }
  const [filters, setFilters] = useState(emptyFilters)
  const [customers, setCustomers] = useState<Customer[]>([])
  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const fetchDashboardData = async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => v && params.append(k, v))
      const res = await api.get<DashboardMetrics>(`/reports/dashboard/${params.toString() ? '?' + params.toString() : ''}`)
      setData(res.data)
    } catch (err: any) {
      console.error('Failed to load dashboard metrics:', err)
      setLoadError(err?.response?.data?.error || 'Could not load dashboard metrics.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [filters])

  useEffect(() => {
    fetchAll<Customer>('/customers/').then(setCustomers).catch(() => setCustomers([]))
  }, [])

  const setFilter = (key: keyof typeof emptyFilters, value: string) => setFilters((f) => ({ ...f, [key]: value }))
  const filterField = 'text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary'

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  const { metrics, revenue_trend, subscription_distribution, recent_subscriptions, recent_invoices, recent_payments, overdue_invoices } = data

  const statCards = [
    {
      label: 'Monthly Recurring Revenue',
      value: formatCurrency(metrics.mrr),
      subtext: 'Normalized recurring charges',
      icon: DollarSign,
      color: 'text-primary',
      bg: 'bg-primary-50',
    },
    {
      label: 'Annual Run Rate (ARR)',
      value: formatCurrency(metrics.arr),
      subtext: 'Annualized recurring run rate',
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Active Subscriptions',
      value: metrics.active_subscriptions,
      subtext: 'Currently generating recurring revenue',
      icon: Repeat,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Total Customers',
      value: metrics.total_customers,
      subtext: 'Active enterprise clients',
      icon: Users,
      color: 'text-slate-700',
      bg: 'bg-slate-100',
    },
    {
      label: 'Revenue Received',
      value: formatCurrency(metrics.revenue_received ?? 0),
      subtext: activeFilterCount ? 'Cash received for the selected filters' : 'All cash received (reversed payments excluded)',
      icon: CreditCard,
      color: 'text-green-700',
      bg: 'bg-green-50',
    },
    {
      label: 'Total Invoices',
      value: metrics.total_invoices ?? 0,
      subtext: `Invoiced value ${formatCurrency(metrics.invoiced_total ?? 0)}`,
      icon: Receipt,
      color: 'text-slate-700',
      bg: 'bg-slate-100',
    },
    {
      label: 'Collected This Month',
      value: formatCurrency(metrics.revenue_this_month),
      subtext: 'Cash collections in current calendar month',
      icon: CreditCard,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Outstanding Balance',
      value: formatCurrency(metrics.outstanding_balance),
      subtext: 'Unpaid confirmed & due invoices',
      icon: FileText,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Overdue Invoices',
      value: metrics.overdue_count,
      subtext: `${formatCurrency(metrics.overdue_amount ?? 0)} past due and uncollected`,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Upcoming Renewals',
      value: metrics.upcoming_renewals_count,
      subtext: 'Cycles due within next 7 days',
      icon: Calendar,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
  ]

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Executive Billing Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">Live database-backed financial metrics and subscription health</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
          <Link to="/subscriptions">
            <Button size="sm">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Manage Subscriptions
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <SlidersHorizontal className="w-4 h-4 text-slate-400 mb-2" />
          <label className="text-[11px] font-semibold text-slate-500 flex flex-col gap-1">From
            <input type="date" value={filters.date_from} max={filters.date_to || undefined} onChange={(e) => setFilter('date_from', e.target.value)} className={filterField} />
          </label>
          <label className="text-[11px] font-semibold text-slate-500 flex flex-col gap-1">To
            <input type="date" value={filters.date_to} min={filters.date_from || undefined} onChange={(e) => setFilter('date_to', e.target.value)} className={filterField} />
          </label>
          <label className="text-[11px] font-semibold text-slate-500 flex flex-col gap-1">Subscription status
            <select value={filters.subscription_status} onChange={(e) => setFilter('subscription_status', e.target.value)} className={filterField}>
              <option value="">All</option>
              {['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED'].map((v) => <option key={v} value={v}>{v.charAt(0) + v.slice(1).toLowerCase()}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-semibold text-slate-500 flex flex-col gap-1">Invoice status
            <select value={filters.invoice_status} onChange={(e) => setFilter('invoice_status', e.target.value)} className={filterField}>
              <option value="">All</option>
              {[['DRAFT', 'Draft'], ['CONFIRMED', 'Due / Confirmed'], ['PARTIALLY_PAID', 'Partially paid'], ['PAID', 'Paid'], ['OVERDUE', 'Overdue'], ['CANCELLED', 'Cancelled']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-semibold text-slate-500 flex flex-col gap-1">Customer
            <select value={filters.customer} onChange={(e) => setFilter('customer', e.target.value)} className={`${filterField} max-w-48`}>
              <option value="">All customers</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-semibold text-slate-500 flex flex-col gap-1">Payment method
            <select value={filters.payment_method} onChange={(e) => setFilter('payment_method', e.target.value)} className={filterField}>
              <option value="">All</option>
              {[['BANK_TRANSFER', 'Bank transfer'], ['UPI', 'UPI'], ['CASH', 'Cash'], ['CARD', 'Card'], ['OTHER', 'Other']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setFilters(emptyFilters)}>
              <X className="w-3.5 h-3.5 mr-1" /> Clear ({activeFilterCount})
            </Button>
          )}
        </CardContent>
      </Card>
      {loadError && <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs" role="alert">{loadError}</div>}

      {/* Summary Stat Cards Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
        {statCards.map((card, idx) => {
          const Icon = card.icon
          return (
            <Card key={idx} className="relative overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">{card.label}</p>
                    <h3 className="text-xl font-black text-slate-900 mt-1 tracking-tight">{card.value}</h3>
                  </div>
                  <div className={`w-9 h-9 rounded-xl ${card.bg} ${card.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-medium">{card.subtext}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Billed Charges vs. Cash Collected</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Historical 6-month comparison of billed invoices against cash received</p>
            </div>
          </CardHeader>
          <CardContent className="h-72 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue_trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), '']}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="billed" name="Billed Amount" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Cash Collected" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subscription Status Distribution */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Subscription Status</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Distribution across lifecycle states</p>
            </div>
          </CardHeader>
          <CardContent className="h-72 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={subscription_distribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {subscription_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              {subscription_distribution.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[idx % STATUS_COLORS.length] }} />
                  <span>{entry.name}: <b>{entry.count}</b></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recents Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <Link to="/invoices" className="text-xs font-bold text-primary flex items-center hover:underline">
              View All <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </CardHeader>
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {recent_invoices.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">No invoices generated yet.</p>
            ) : (
              recent_invoices.map((inv) => (
                <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{inv.invoice_number}</p>
                    <p className="text-[11px] text-slate-500">{inv.customer__name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900">{formatCurrency(inv.total_amount)}</p>
                    <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'danger' : 'info'}>
                      {inv.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <Link to="/payments" className="text-xs font-bold text-primary flex items-center hover:underline">
              View All <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </CardHeader>
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {recent_payments.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">No payments recorded yet.</p>
            ) : (
              recent_payments.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{p.payment_number}</p>
                    <p className="text-[11px] text-slate-500">{p.customer__name} • {p.payment_method}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-green-700">{formatCurrency(p.amount)}</p>
                    <p className="text-[10px] text-slate-400">{formatDate(p.payment_date)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Overdue Invoices Alert Table */}
      {overdue_invoices.length > 0 && (
        <Card className="border-red-200 bg-red-50/20">
          <CardHeader className="bg-red-50/50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <CardTitle className="text-red-900">Overdue Invoices Action Required</CardTitle>
            </div>
            <Badge variant="danger">{overdue_invoices.length} Overdue</Badge>
          </CardHeader>
          <div className="divide-y divide-red-100 overflow-x-auto">
            {overdue_invoices.map((inv) => (
              <div key={inv.id} className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">{inv.invoice_number}</span>
                  <span className="text-xs text-slate-500 ml-2">({inv.customer__name})</span>
                  <p className="text-[11px] text-red-600 font-medium">Due Date: {formatDate(inv.due_date)}</p>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Balance: {formatCurrency(inv.balance_due)}</p>
                    <p className="text-[10px] text-slate-400">Total: {formatCurrency(inv.total_amount)}</p>
                  </div>
                  <Link to="/invoices">
                    <Button size="sm" variant="danger">
                      Resolve
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

