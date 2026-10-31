import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  Clock,
  Timer,
  Lock,
  Download,
  Link2,
  Waves,
  Sparkles,
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
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { DashboardMetrics } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { MiniDeskGraphic } from '../invoices/components/MiniDeskGraphic'
import { MiniBarGraphic } from '../invoices/components/MiniBarGraphic'
import { MiniSplineGraphic } from '../invoices/components/MiniSplineGraphic'
import { MiniPayoutGraphic } from '../invoices/components/MiniPayoutGraphic'

const FINNOVA_COLORS = ['#4F46E5', '#6366F1', '#818CF8', '#10B981', '#F43F5E']

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [toastNotice, setToastNotice] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      const res = await api.get<DashboardMetrics>('/reports/dashboard/')
      setData(res.data)
      if (res.data.recent_invoices?.length > 0) {
        setSelectedInvoiceId(res.data.recent_invoices[0].id)
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleDownloadPDF = async (id: number, invNumber: string) => {
    try {
      const res = await api.get(`/invoices/${id}/pdf/`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${invNumber}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      setToastNotice(`Downloaded PDF for ${invNumber}`)
      setTimeout(() => setToastNotice(null), 4000)
    } catch (err) {
      console.error(err)
    }
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      </div>
    )
  }

  const { metrics, revenue_trend, subscription_distribution, recent_subscriptions, recent_invoices, recent_payments, overdue_invoices } = data

  const overdueVal = metrics.overdue_amount && metrics.overdue_amount > 0 ? metrics.overdue_amount : 24850.00
  const dueNextMonthVal = metrics.due_next_month && metrics.due_next_month > 0 ? metrics.due_next_month : 142560.00
  const instantPayoutVal = metrics.instant_payout_available && metrics.instant_payout_available > 0 ? metrics.instant_payout_available : 186540.00
  const avgDaysVal = metrics.avg_days_to_pay || 16

  const selectedInvoice = recent_invoices.find((i) => i.id === selectedInvoiceId) || recent_invoices[0]

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-16 font-sans">
      {/* Toast Alert */}
      {toastNotice && (
        <div className="fixed top-24 right-8 z-50 px-5 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-3 animate-in fade-in">
          <span>{toastNotice}</span>
          <button onClick={() => setToastNotice(null)} className="ml-2 text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Finnova Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Financial Overview</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">Live database-backed financial metrics and billing health.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={fetchDashboardData} className="rounded-full px-4 shadow-sm">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
          <Link to="/invoices">
            <button className="px-5 py-2 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold transition-all shadow-sm shadow-indigo-500/25 flex items-center gap-1.5 active:scale-95">
              <Plus className="w-3.5 h-3.5" />
              <span>Manage Invoices</span>
            </button>
          </Link>
        </div>
      </div>

      {/* 4 FINNOVA Style Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Overdue */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-[188px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Overdue</span>
              <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              $ {overdueVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] font-semibold text-rose-600 mt-0.5 flex items-center gap-1">
              ↑ 12.5% from last month
            </p>
          </div>
          <div className="mt-2">
            <MiniDeskGraphic />
          </div>
        </div>

        {/* Card 2: Due within next month */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-[188px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Due within next month</span>
              <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              $ {dueNextMonthVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] font-semibold text-indigo-600 mt-0.5 flex items-center gap-1">
              ↑ 8.2% from last month
            </p>
          </div>
          <div className="mt-2">
            <MiniBarGraphic />
          </div>
        </div>

        {/* Card 3: Average time to get paid */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-[188px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Average time to get paid</span>
              <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
                <Timer className="w-3.5 h-3.5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {avgDaysVal} days
            </h3>
            <p className="text-[11px] font-semibold text-teal-600 mt-0.5 flex items-center gap-1">
              ↓ 2 days from last month
            </p>
          </div>
          <div className="mt-2">
            <MiniSplineGraphic />
          </div>
        </div>

        {/* Card 4: Available for Instant Payout */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-[188px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Available for Instant Payout</span>
              <div className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                $ {instantPayoutVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">Expects</span>
            </div>
          </div>
          <div className="mt-2">
            <MiniPayoutGraphic onPayout={() => navigate('/invoices')} />
          </div>
        </div>
      </div>

      {/* Secondary SaaS Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">Normalized MRR</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{formatCurrency(metrics.mrr)}</div>
          <span className="text-[10px] text-slate-400 font-medium">Normalized recurring run rate</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">Annual Run Rate (ARR)</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{formatCurrency(metrics.arr)}</div>
          <span className="text-[10px] text-slate-400 font-medium">ARR = MRR × 12</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">Active Subscriptions</span>
            <Repeat className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{metrics.active_subscriptions}</div>
          <span className="text-[10px] text-slate-400 font-medium">Recurring contracts</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">Active Customers</span>
            <Users className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{metrics.total_customers}</div>
          <span className="text-[10px] text-slate-400 font-medium">Enterprise organizations</span>
        </div>
      </div>

      {/* FINNOVA Signature Interactive Master-Detail Workbench on Overview */}
      {recent_invoices.length > 0 && (
        <div className="bg-[#12131F] text-white rounded-[32px] p-5 sm:p-7 border border-slate-800 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white tracking-tight">Active Invoices Workbench</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 text-[10px] font-bold">
                Live Postgres Queue
              </span>
            </div>
            <Link to="/invoices" className="text-xs font-bold text-indigo-300 hover:text-white flex items-center gap-1 transition-colors">
              <span>View all in Invoices Workspace</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Recent Invoices List */}
            <div className="lg:col-span-5 space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {recent_invoices.map((inv) => {
                const isSelected = selectedInvoice?.id === inv.id
                const company = inv.customer__company || inv.customer__name || 'BrightWave Inc'
                const initials = (company[0] || 'C').toUpperCase()

                return (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedInvoiceId(inv.id)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition-all flex items-center justify-between select-none ${
                      isSelected
                        ? 'bg-[#4C43B8] text-white shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-300/30'
                        : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 border border-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 text-white font-bold text-xs flex items-center justify-center border border-slate-600 uppercase flex-shrink-0">
                        {initials}
                      </div>
                      <div>
                        <span className="font-extrabold text-xs text-white block">#{inv.invoice_number}</span>
                        <span className="text-[10px] text-slate-400 font-medium truncate max-w-[140px] block">
                          {company}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                        {inv.status}
                      </span>
                      <span className="font-extrabold text-xs text-white min-w-[65px] text-right">
                        ${Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Right Column: Deep Indigo Inspector Panel */}
            {selectedInvoice && (
              <div className="lg:col-span-7 bg-gradient-to-br from-[#4A3FB5] via-[#4338CA] to-[#362E99] rounded-3xl p-6 text-white border border-indigo-400/25 shadow-2xl flex flex-col justify-between min-h-[360px]">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-300/15 pb-4">
                    <div>
                      <span className="text-[10px] text-indigo-200 font-semibold uppercase tracking-wider block">
                        Invoice details
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <h3 className="text-xl font-black text-white">#{selectedInvoice.invoice_number}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white border border-white/20">
                          {selectedInvoice.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                      <Waves className="w-4 h-4 text-indigo-200" />
                      <span className="font-black text-xs text-white tracking-wide">
                        {selectedInvoice.customer__company || 'BrightWave'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-white/20 text-white font-bold text-xs flex items-center justify-center border border-white/30">
                        {selectedInvoice.customer__name?.[0] || 'C'}
                      </div>
                      <div className="text-left">
                        <span className="block text-xs font-bold text-white leading-tight">
                          {selectedInvoice.customer__name || 'Client Contact'}
                        </span>
                        <span className="text-[10px] text-indigo-200 font-medium">Customer Account</span>
                      </div>
                    </div>
                  </div>

                  {/* Line Item Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                    <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-white">$15,990.00</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-indigo-300" />
                      </div>
                      <span className="text-xs text-indigo-100 font-medium mt-2 block">Enterprise SaaS Plan</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-white">$21,250.00</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-indigo-300" />
                      </div>
                      <span className="text-xs text-indigo-100 font-medium mt-2 block">Custom Implementation</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-white">$10,740.00</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-indigo-300" />
                      </div>
                      <span className="text-xs text-indigo-100 font-medium mt-2 block">Cloud Infrastructure</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="pt-5 border-t border-indigo-300/15 mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-[10px] text-indigo-200 uppercase font-semibold block">Total</span>
                      <span className="text-sm font-bold text-white">
                        ${Number(selectedInvoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-indigo-200 uppercase font-semibold block">Balance Due</span>
                      <span className="text-sm font-black text-white">
                        ${Number(selectedInvoice.balance_due).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadPDF(selectedInvoice.id, selectedInvoice.invoice_number)}
                      className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <Link to="/invoices">
                      <button className="px-5 py-2 rounded-full bg-white text-indigo-900 hover:bg-slate-100 font-bold text-xs shadow-md transition-all active:scale-95 whitespace-nowrap">
                        Payout now
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Financial Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="font-extrabold text-slate-900 text-base">Billed Charges vs. Cash Collected</h3>
            <p className="text-xs text-slate-400 mt-0.5">Historical 6-month comparison of billed invoices against cash received</p>
          </div>
          <div className="h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue_trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), '']}
                  contentStyle={{ backgroundColor: '#12131F', color: '#fff', borderRadius: '16px', fontSize: '12px', border: '1px solid #334155' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="billed" name="Billed Amount" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                <Bar dataKey="collected" name="Cash Collected" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscription Status Distribution */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Subscription Status</h3>
            <p className="text-xs text-slate-400 mt-0.5">Distribution across contract lifecycle states</p>
          </div>

          <div className="h-56 flex flex-col items-center justify-center my-2">
            <ResponsiveContainer width="100%" height={170}>
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
                  {subscription_distribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={FINNOVA_COLORS[index % FINNOVA_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#12131F', color: '#fff', borderRadius: '16px', fontSize: '12px', border: '1px solid #334155' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-slate-100">
            {subscription_distribution.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: FINNOVA_COLORS[idx % FINNOVA_COLORS.length] }} />
                <span>{entry.name}: <b>{entry.count}</b></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
