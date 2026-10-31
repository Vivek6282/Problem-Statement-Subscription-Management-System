import React, { useState, useEffect } from 'react'
import {
  BarChart3,
  Download,
  Calendar,
  Layers,
  Package,
  CreditCard,
  DollarSign,
  TrendingUp,
  Filter,
  RefreshCw,
  Repeat,
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
  LineChart,
  Line,
} from 'recharts'
import { api } from '@/lib/api'
import { formatCompactCurrency, formatCurrency, formatDate, mapTrendForChart } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'

const CHART_COLORS = ['#305D42', '#A8C09B', '#CC9D45', '#7D9E72', '#1F3327', '#CDD5C8', '#8A9585']

type DatePreset = 'ALL_TIME' | 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_QUARTER' | 'YEAR_TO_DATE' | 'CUSTOM'

export const ReportsPage: React.FC = () => {
  const [mrrGroupBy, setMrrGroupBy] = useState<'plan' | 'product'>('plan')
  const [mrrBreakdown, setMrrBreakdown] = useState<any[]>([])
  const [revenueTrends, setRevenueTrends] = useState<any[]>([])
  const [subscriptionsByStatus, setSubscriptionsByStatus] = useState<any[]>([])
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Date filter state
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL_TIME')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Export state
  const [exportingType, setExportingType] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset)
    const today = new Date()
    const y = today.getFullYear()
    const m = today.getMonth()

    if (preset === 'THIS_MONTH') {
      const first = new Date(y, m, 1).toISOString().split('T')[0]
      const last = today.toISOString().split('T')[0]
      setStartDate(first)
      setEndDate(last)
    } else if (preset === 'LAST_MONTH') {
      const first = new Date(y, m - 1, 1).toISOString().split('T')[0]
      const last = new Date(y, m, 0).toISOString().split('T')[0]
      setStartDate(first)
      setEndDate(last)
    } else if (preset === 'LAST_QUARTER') {
      const qStart = new Date(y, m - 3, 1).toISOString().split('T')[0]
      const qEnd = today.toISOString().split('T')[0]
      setStartDate(qStart)
      setEndDate(qEnd)
    } else if (preset === 'YEAR_TO_DATE') {
      const yStart = new Date(y, 0, 1).toISOString().split('T')[0]
      setStartDate(yStart)
      setEndDate(today.toISOString().split('T')[0])
    } else if (preset === 'ALL_TIME') {
      setStartDate('')
      setEndDate('')
    }
  }

  const fetchReports = async () => {
    setIsLoading(true)
    // Load each report independently so one failing endpoint can't blank the whole page.
    const [mrrRes, trendsRes, statusRes, payRes] = await Promise.allSettled([
      api.get(`/reports/mrr-breakdown/?group_by=${mrrGroupBy}`),
      api.get('/reports/revenue-trends/?months=12'),
      api.get('/reports/subscriptions-by-status/'),
      api.get('/reports/payment-methods/'),
    ])
    if (mrrRes.status === 'fulfilled') setMrrBreakdown(mrrRes.value.data)
    if (trendsRes.status === 'fulfilled') setRevenueTrends(trendsRes.value.data)
    if (statusRes.status === 'fulfilled') setSubscriptionsByStatus(statusRes.value.data)
    if (payRes.status === 'fulfilled') setPaymentMethods(payRes.value.data)
    const failed = [mrrRes, trendsRes, statusRes, payRes].filter((r) => r.status === 'rejected')
    if (failed.length) console.error('Some reports failed to load:', failed)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchReports()
  }, [mrrGroupBy])

  const handleExportCSV = async (type: string, filename: string) => {
    setExportingType(type)
    try {
      let url = `/reports/export/?type=${type}`
      if (startDate) url += `&start_date=${startDate}`
      if (endDate) url += `&end_date=${endDate}`

      const res = await api.get(url, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'text/csv' })
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', `${filename}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      setToastMessage(`Downloaded ${filename}.csv`)
      setTimeout(() => setToastMessage(null), 3000)
    } catch (err) {
      console.error('Export CSV error:', err)
    } finally {
      setExportingType(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-64 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-8 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-white shadow-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Global Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Financial Reports & Aggregations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time recurring run rate, revenue realizations, contract lifecycles, and collections
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Presets */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-medium">
            <button
              onClick={() => handlePresetChange('ALL_TIME')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                datePreset === 'ALL_TIME' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => handlePresetChange('THIS_MONTH')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                datePreset === 'THIS_MONTH' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => handlePresetChange('LAST_MONTH')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                datePreset === 'LAST_MONTH' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => handlePresetChange('YEAR_TO_DATE')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                datePreset === 'YEAR_TO_DATE' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              YTD
            </button>
          </div>

          <Button size="sm" variant="outline" onClick={fetchReports} className="rounded-xl">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Grid 1: Revenue Realization & MRR Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 12-Month Revenue Trends Chart */}
        <Card className="rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-slate-900 text-sm">Revenue Realization (Last 12 Months)</h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Billed invoices vs. collected cash settlement amounts</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              isLoading={exportingType === 'invoices'}
              onClick={() => handleExportCSV('invoices', 'brightloop_billed_invoices')}
              className="text-xs h-8"
            >
              <Download className="w-3 h-3 mr-1" /> Export Invoices
            </Button>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mapTrendForChart(revenueTrends)} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#8A9585" fontSize={10} tickLine={false} />
                <YAxis stroke="#8A9585" fontSize={10} tickLine={false} tickFormatter={(v) => formatCompactCurrency(v)} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(val), '']}
                  contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #DFE4DC', borderRadius: '12px', color: '#1F3327', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="billed" name="Billed Amount" fill="#305D42" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Collected Cash" fill="#A8C09B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Contract Lifecycle Distribution Chart */}
        <Card className="rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Subscription Lifecycle Distribution</h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Active contracts vs. paused, draft, and closed accounts</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              isLoading={exportingType === 'subscriptions'}
              onClick={() => handleExportCSV('subscriptions', 'brightloop_subscriptions')}
              className="text-xs h-8"
            >
              <Download className="w-3 h-3 mr-1" /> Export Subscriptions
            </Button>
          </div>

          <div className="h-64 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie
                  data={subscriptionsByStatus}
                  dataKey="count"
                  nameKey="status_label"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {subscriptionsByStatus.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #DFE4DC', borderRadius: '12px', color: '#1F3327', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2">
              {subscriptionsByStatus.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                  <span className="font-medium">{item.status_label}:</span>
                  <span className="font-bold">{item.count}</span>
                  <span className="text-slate-400 font-mono">({formatCurrency(item.total_value)})</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Grid 2: MRR Breakdown by Plan / Product */}
      <Card className="rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-slate-900 text-sm">Monthly Recurring Run Rate (MRR) Breakdown</h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Exact SQL-aggregated monthly yield grouped by {mrrGroupBy === 'plan' ? 'Subscription Plans' : 'Catalog Products'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => setMrrGroupBy('plan')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  mrrGroupBy === 'plan' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                By Plan
              </button>
              <button
                onClick={() => setMrrGroupBy('product')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  mrrGroupBy === 'product' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                By Product
              </button>
            </div>

            <Button
              size="sm"
              variant="outline"
              isLoading={exportingType === 'drilldown'}
              onClick={() => handleExportCSV('drilldown&metric=mrr', 'brightloop_mrr_drilldown')}
              className="text-xs h-8"
            >
              <Download className="w-3 h-3 mr-1" /> Export MRR CSV
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">{mrrGroupBy === 'plan' ? 'Plan Tier' : 'Product Line'}</th>
                {mrrGroupBy === 'plan' && <th className="py-3 px-4">Billing Interval</th>}
                {mrrGroupBy === 'plan' && <th className="py-3 px-4">Base Plan Rate</th>}
                <th className="py-3 px-4">{mrrGroupBy === 'plan' ? 'Active Subscriptions' : 'Active Units'}</th>
                <th className="py-3 px-4 text-right">Normalized MRR Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mrrBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                    No active subscriptions contributing to MRR yet.
                  </td>
                </tr>
              ) : (
                mrrBreakdown.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {mrrGroupBy === 'plan' ? item.plan_name : item.product_name}
                    </td>
                    {mrrGroupBy === 'plan' && (
                      <td className="py-3 px-4">
                        <Badge variant="neutral">{item.billing_interval}</Badge>
                      </td>
                    )}
                    {mrrGroupBy === 'plan' && (
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {formatCurrency(item.price)}
                      </td>
                    )}
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {mrrGroupBy === 'plan' ? item.active_subscriptions : item.active_units}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-primary text-sm">
                      {formatCurrency(item.mrr)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Grid 3: Payment Method Settlements */}
      <Card className="rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-slate-900 text-sm">Payment Methods & Settlement Velocity</h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Total collected cash settlements grouped by payment gateway and channel</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            isLoading={exportingType === 'payments'}
            onClick={() => handleExportCSV('payments', 'brightloop_payments')}
            className="text-xs h-8"
          >
            <Download className="w-3 h-3 mr-1" /> Export Payments
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {paymentMethods.map((m, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Gateway / Method</span>
                <span className="text-base font-bold text-slate-900 mt-1 block">
                  {String(m.method).charAt(0) + String(m.method).slice(1).toLowerCase().replaceAll('_', ' ')}
                </span>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-baseline justify-between">
                <span className="text-xs font-extrabold text-primary">{formatCurrency(m.total_amount)}</span>
                <span className="text-[10px] text-slate-500">{m.count} txns</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
