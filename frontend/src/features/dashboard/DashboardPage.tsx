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
  ExternalLink,
  ChevronRight,
  ListFilter,
  CheckCircle2,
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
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { MiniDeskGraphic } from '../invoices/components/MiniDeskGraphic'
import { MiniBarGraphic } from '../invoices/components/MiniBarGraphic'
import { MiniSplineGraphic } from '../invoices/components/MiniSplineGraphic'
import { MiniPayoutGraphic } from '../invoices/components/MiniPayoutGraphic'

const FINNOVA_COLORS = ['#4F46E5', '#6366F1', '#818CF8', '#10B981', '#F43F5E']

interface DrillDownRecord {
  id: number
  reference: string
  customer_name: string
  amount: string
  date: string
  status: string
  details: string
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [toastNotice, setToastNotice] = useState<string | null>(null)

  // Drilldown modal state
  const [drillDownMetric, setDrillDownMetric] = useState<string | null>(null)
  const [drillDownTitle, setDrillDownTitle] = useState<string>('')
  const [drillDownTargetUrl, setDrillDownTargetUrl] = useState<string>('')
  const [drillDownRecords, setDrillDownRecords] = useState<DrillDownRecord[]>([])
  const [isDrillDownLoading, setIsDrillDownLoading] = useState(false)
  const [isExportingCSV, setIsExportingCSV] = useState(false)

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

  const openDrillDown = async (metricKey: string, title: string, targetUrl: string) => {
    setDrillDownMetric(metricKey)
    setDrillDownTitle(title)
    setDrillDownTargetUrl(targetUrl)
    setIsDrillDownLoading(true)
    try {
      const res = await api.get(`/reports/drilldown/?metric=${metricKey}&page_size=10`)
      setDrillDownRecords(res.data.results || [])
    } catch (err) {
      console.error('Failed to load drilldown:', err)
    } finally {
      setIsDrillDownLoading(false)
    }
  }

  const handleExportDrillDownCSV = async () => {
    if (!drillDownMetric) return
    setIsExportingCSV(true)
    try {
      const res = await api.get(`/reports/export/?type=drilldown&metric=${drillDownMetric}`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `brightloop_${drillDownMetric}_drilldown.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      setToastNotice(`Exported drilldown CSV for ${drillDownTitle}`)
      setTimeout(() => setToastNotice(null), 4000)
    } catch (err) {
      console.error('Failed to export drilldown CSV:', err)
    } finally {
      setIsExportingCSV(false)
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

  const { metrics, revenue_trend, subscription_distribution, recent_invoices } = data

  const overdueVal = Number(metrics.overdue_amount) > 0 ? Number(metrics.overdue_amount) : 0
  const dueNextMonthVal = Number(metrics.due_next_month) > 0 ? Number(metrics.due_next_month) : 0
  const instantPayoutVal = Number(metrics.instant_payout_available) > 0 ? Number(metrics.instant_payout_available) : 0
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

      {/* 4 FINNOVA Style Metric Cards (Clickable Deep-links + Drilldown) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Overdue Invoices */}
        <div
          onClick={() => navigate('/invoices?status=OVERDUE')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-[195px] cursor-pointer group hover:border-rose-300"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 group-hover:text-rose-600 transition-colors">
                Overdue Invoices
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    openDrillDown('overdue_invoices', 'Overdue Invoices Drilldown', '/invoices?status=OVERDUE')
                  }}
                  className="px-2 py-0.5 rounded text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold transition-colors"
                  title="View top overdue invoices breakdown"
                >
                  Breakdown
                </button>
                <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatCurrency(overdueVal)}
            </h3>
            <p className="text-[11px] font-semibold text-rose-600 mt-0.5 flex items-center gap-1">
              {metrics.overdue_count} invoice{metrics.overdue_count === 1 ? '' : 's'} past due window
            </p>
          </div>
          <div className="mt-1">
            <MiniDeskGraphic />
          </div>
        </div>

        {/* Card 2: Due within next month (Outstanding) */}
        <div
          onClick={() => navigate('/invoices?status=UNPAID')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-[195px] cursor-pointer group hover:border-indigo-300"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                Due within next month
              </span>
              <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatCurrency(dueNextMonthVal)}
            </h3>
            <p className="text-[11px] font-semibold text-indigo-600 mt-0.5 flex items-center gap-1">
              Total Outstanding: {formatCurrency(metrics.outstanding_balance)}
            </p>
          </div>
          <div className="mt-1">
            <MiniBarGraphic />
          </div>
        </div>

        {/* Card 3: Average time to get paid */}
        <div
          onClick={() => navigate('/invoices')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-[195px] cursor-pointer group hover:border-teal-300"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 group-hover:text-teal-600 transition-colors">
                Average time to get paid
              </span>
              <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
                <Timer className="w-3.5 h-3.5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {avgDaysVal} days
            </h3>
            <p className="text-[11px] font-semibold text-teal-600 mt-0.5 flex items-center gap-1">
              Settlement velocity benchmark
            </p>
          </div>
          <div className="mt-1">
            <MiniSplineGraphic />
          </div>
        </div>

        {/* Card 4: Available for Instant Payout / Collected Revenue */}
        <div
          onClick={() => navigate('/payments')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-[195px] cursor-pointer group hover:border-emerald-300"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-600 transition-colors">
                Collected Revenue
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    openDrillDown('revenue_collected', 'Collected Revenue Transactions', '/payments')
                  }}
                  className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition-colors"
                  title="View collected payments breakdown"
                >
                  Breakdown
                </button>
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {formatCurrency(metrics.revenue_collected || instantPayoutVal)}
              </h3>
            </div>
            <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">
              This month: {formatCurrency(metrics.revenue_this_month)}
            </p>
          </div>
          <div className="mt-1">
            <MiniPayoutGraphic onPayout={() => navigate('/payments')} />
          </div>
        </div>
      </div>

      {/* Secondary SaaS Metrics Strip (Deep-linked cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Normalized MRR */}
        <div
          onClick={() => navigate('/subscriptions?status=ACTIVE')}
          className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-indigo-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 group-hover:text-indigo-600 transition-colors">
              Normalized MRR
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  openDrillDown('mrr', 'Monthly Recurring Revenue (MRR) Breakdown', '/subscriptions?status=ACTIVE')
                }}
                className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold"
              >
                Breakdown
              </button>
              <DollarSign className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{formatCurrency(metrics.mrr)}</div>
          <span className="text-[10px] text-slate-400 font-medium">SQL aggregated monthly run rate</span>
        </div>

        {/* ARR */}
        <div
          onClick={() => navigate('/subscriptions?status=ACTIVE')}
          className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-blue-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-600 transition-colors">
              Annual Run Rate (ARR)
            </span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{formatCurrency(metrics.arr)}</div>
          <span className="text-[10px] text-slate-400 font-medium">ARR = Normalized MRR × 12</span>
        </div>

        {/* Active Subscriptions */}
        <div
          onClick={() => navigate('/subscriptions?status=ACTIVE')}
          className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-emerald-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 group-hover:text-emerald-600 transition-colors">
              Active Subscriptions
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  openDrillDown('active_subscriptions', 'Active Subscriptions Breakdown', '/subscriptions?status=ACTIVE')
                }}
                className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold"
              >
                Breakdown
              </button>
              <Repeat className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{metrics.active_subscriptions}</div>
          <span className="text-[10px] text-slate-400 font-medium">Active recurring contracts</span>
        </div>

        {/* Churn Rate & Customers */}
        <div
          onClick={() => navigate('/reports')}
          className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-slate-400"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
              Churn Rate & Customers
            </span>
            <Users className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{metrics.churn_rate || '0.0%'}</div>
          <span className="text-[10px] text-slate-400 font-medium">{metrics.total_customers} active enterprise organizations</span>
        </div>
      </div>

      {/* FINNOVA Signature Interactive Master-Detail Workbench */}
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
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#1E1F30] border-indigo-500/80 shadow-md shadow-indigo-500/10'
                        : 'bg-[#181926]/60 border-slate-800/80 hover:bg-[#1C1D2D]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300 text-xs flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{company}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                          <span>{inv.invoice_number}</span>
                          <span>•</span>
                          <span>Due {formatDate(inv.due_date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-white">{formatCurrency(inv.total_amount)}</div>
                      <Badge
                        variant={inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'danger' : 'neutral'}
                        className="text-[9px] mt-1 px-1.5 py-0"
                      >
                        {inv.status}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Right Column: Selected Invoice Detail Pane */}
            {selectedInvoice && (
              <div className="lg:col-span-7 bg-[#1A1B2B] rounded-2xl border border-slate-800 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] text-indigo-400 font-mono uppercase tracking-wider font-semibold">
                      Selected Document
                    </span>
                    <h3 className="text-base font-bold text-white">{selectedInvoice.invoice_number}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-white border-slate-700 bg-slate-800 hover:bg-slate-700"
                      onClick={() => handleDownloadPDF(selectedInvoice.id, selectedInvoice.invoice_number)}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      PDF
                    </Button>
                    <Link to="/invoices">
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                        Open
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Customer</span>
                    <span className="font-semibold text-white truncate block">
                      {selectedInvoice.customer__company || selectedInvoice.customer__name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Issue Date</span>
                    <span className="font-semibold text-white">{formatDate(selectedInvoice.issue_date)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Due Date</span>
                    <span className="font-semibold text-white">{formatDate(selectedInvoice.due_date)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Balance Due</span>
                    <span className="font-bold text-rose-400">{formatCurrency(selectedInvoice.balance_due)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trends */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Billed vs. Collected Revenue</h3>
              <p className="text-xs text-slate-400 mt-0.5">Monthly financial realization over past 6 months</p>
            </div>
            <Link to="/reports" className="text-xs text-indigo-600 hover:underline font-bold flex items-center gap-1">
              Full Analytics <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64">
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

      {/* Drill-down Drawer / Modal */}
      <Modal
        isOpen={!!drillDownMetric}
        onClose={() => setDrillDownMetric(null)}
        title={drillDownTitle}
        description="Top live contributing records derived from real-time database aggregation."
        maxWidth="xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Showing top {drillDownRecords.length} records
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                isLoading={isExportingCSV}
                onClick={handleExportDrillDownCSV}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Export CSV
              </Button>
              {drillDownTargetUrl && (
                <Button
                  size="sm"
                  onClick={() => {
                    const target = drillDownTargetUrl
                    setDrillDownMetric(null)
                    navigate(target)
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  Open Full List
                </Button>
              )}
            </div>
          </div>

          {isDrillDownLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : drillDownRecords.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching records for this metric.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {drillDownRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{r.reference}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{r.customer_name}</td>
                      <td className="py-2.5 px-3 font-bold text-primary">{formatCurrency(r.amount)}</td>
                      <td className="py-2.5 px-3 text-slate-500">{formatDate(r.date)}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="neutral">{r.status}</Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-[180px]">
                        {r.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button variant="outline" onClick={() => setDrillDownMetric(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
