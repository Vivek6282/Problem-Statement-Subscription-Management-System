import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  Download,
  FileText,
  RefreshCw,
  Repeat,
  Wallet,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, mapTrendForChart } from '@/lib/utils'
import type { DashboardMetrics } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { StatusText } from '@/components/ui/StatusText'
import { Modal } from '@/components/ui/Modal'
import '@/styles/brightloop.css'

const STATUS_COLORS: Record<string, string> = {
  Active: '#305D42',
  Confirmed: '#7D9E72',
  Paused: '#CC9D45',
  Draft: '#CDD5C8',
  Closed: '#8A9585',
}

const CHART_TOOLTIP = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #DFE4DC',
  borderRadius: 12,
  boxShadow: '0 8px 24px -12px rgba(31, 51, 39, 0.25)',
  color: '#1F3327',
  fontSize: 12,
}

const humanize = (value?: string) =>
  value ? value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ') : '—'

const daysOverdue = (dueDate: string) => {
  const due = new Date(dueDate)
  const today = new Date()
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((today.getTime() - due.getTime()) / 86_400_000))
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

interface DrillDownRecord {
  id: number
  reference: string
  customer_name: string
  amount: string
  date: string
  status: string
  details: string
}

interface DrillDownTarget {
  metric: 'mrr' | 'active_subscriptions' | 'overdue_invoices' | 'revenue_collected'
  title: string
  listUrl: string
}

function SectionHeading({
  index,
  eyebrow,
  title,
  id,
  aside,
}: {
  index: string
  eyebrow: string
  title: string
  id: string
  aside?: React.ReactNode
}) {
  return (
    <div className="bl-section-heading">
      <div>
        <span className="bl-eyebrow">
          {index} / {eyebrow}
        </span>
        <h2 id={id}>{title}</h2>
      </div>
      {aside}
    </div>
  )
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // Drilldown: the records behind a key figure, with CSV export.
  const [drill, setDrill] = useState<DrillDownTarget | null>(null)
  const [drillRecords, setDrillRecords] = useState<DrillDownRecord[]>([])
  const [isDrillLoading, setIsDrillLoading] = useState(false)
  const [drillError, setDrillError] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const openDrillDown = async (target: DrillDownTarget) => {
    setDrill(target)
    setDrillRecords([])
    setDrillError(false)
    setIsDrillLoading(true)
    try {
      const res = await api.get(`/reports/drilldown/?metric=${target.metric}&page_size=10`)
      setDrillRecords(res.data.results || [])
    } catch (err) {
      console.error('Failed to load drilldown:', err)
      setDrillError(true)
    } finally {
      setIsDrillLoading(false)
    }
  }

  const exportDrillDown = async () => {
    if (!drill) return
    setIsExporting(true)
    try {
      const res = await api.get(`/reports/export/?type=drilldown&metric=${drill.metric}`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `brightloop_${drill.metric}_drilldown.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      console.error('Failed to export drilldown CSV:', err)
      setDrillError(true)
    } finally {
      setIsExporting(false)
    }
  }

  const fetchDashboardData = async () => {
    setIsLoading(true)
    setLoadError(false)
    try {
      const res = await api.get<DashboardMetrics>('/reports/dashboard/')
      setData(res.data)
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err)
      setLoadError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const name = user?.first_name || user?.full_name || 'there'

  if (!data && isLoading) {
    return (
      <div className="bl-portal-loading" role="status">
        <span className="bl-eyebrow">Operations overview</span>
        <h1>Getting things in order.</h1>
        <p>Loading revenue, receivables and recent activity…</p>
        <div className="bl-loading-line" />
        <div className="bl-loading-line" />
        <div className="bl-loading-line" />
      </div>
    )
  }

  const heading = (
    <div className="bl-portal-heading">
      <div>
        <span className="bl-eyebrow">Operations overview</span>
        <h1>
          Hello, {name}
          <span>.</span>
        </h1>
        <p>Recurring revenue and receivables, straight from your billing records.</p>
      </div>
      <div className="bl-heading-actions">
        <button
          type="button"
          className="bl-refresh"
          onClick={fetchDashboardData}
          disabled={isLoading}
          aria-label="Refresh dashboard"
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </button>
        <Link to="/invoices" className="bl-refresh is-primary">
          Open invoices
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )

  if (!data) {
    return (
      <div className="bl-portal">
        {heading}
        <div className="bl-notice bl-notice-error" role="alert">
          <AlertCircle size={18} />
          <span>We couldn’t load the dashboard. Check that the API is running, then refresh.</span>
        </div>
      </div>
    )
  }

  const {
    metrics,
    revenue_trend,
    subscription_distribution,
    recent_subscriptions,
    recent_invoices,
    recent_payments,
    overdue_invoices,
  } = data
  const totalSubscriptions = subscription_distribution.reduce((sum, s) => sum + s.count, 0)
  const overdueAmount = metrics.overdue_amount ?? 0

  return (
    <div className="bl-portal">
      {heading}

      {loadError && (
        <div className="bl-notice bl-notice-error" role="alert">
          <AlertCircle size={18} />
          <span>We couldn’t refresh the dashboard. Showing the last figures that loaded.</span>
        </div>
      )}

      <section className="bl-overview-stats is-four" aria-label="Key figures">
        <div>
          <span>
            <Repeat size={16} /> Monthly recurring revenue
          </span>
          <strong>{formatCurrency(metrics.mrr)}</strong>
          <small>{formatCurrency(metrics.arr)} annual run rate</small>
          <button type="button" className="bl-stat-link" onClick={() => openDrillDown({ metric: 'mrr', title: 'Monthly recurring revenue', listUrl: '/subscriptions?status=ACTIVE' })}>
            View details <ArrowRight size={13} />
          </button>
        </div>
        <div>
          <span>
            <CalendarClock size={16} /> Active subscriptions
          </span>
          <strong>{metrics.active_subscriptions}</strong>
          <small>
            {plural(metrics.total_customers, 'customer')} ·{' '}
            {metrics.upcoming_renewals_count} renewing this week
            {metrics.churn_rate !== undefined && metrics.churn_rate !== null && ` · ${metrics.churn_rate} churn`}
          </small>
          <button type="button" className="bl-stat-link" onClick={() => openDrillDown({ metric: 'active_subscriptions', title: 'Active subscriptions', listUrl: '/subscriptions?status=ACTIVE' })}>
            View details <ArrowRight size={13} />
          </button>
        </div>
        <div>
          <span>
            <Wallet size={16} /> Outstanding balance
          </span>
          <strong className={metrics.overdue_count > 0 ? 'bl-amount-due' : ''}>
            {formatCurrency(metrics.outstanding_balance)}
          </strong>
          <small>
            {metrics.overdue_count > 0
              ? `${formatCurrency(overdueAmount)} overdue across ${plural(metrics.overdue_count, 'invoice')}`
              : 'Nothing overdue'}
          </small>
          <button type="button" className="bl-stat-link" onClick={() => openDrillDown({ metric: 'overdue_invoices', title: 'Overdue invoices', listUrl: '/invoices?status=OVERDUE' })}>
            View details <ArrowRight size={13} />
          </button>
        </div>
        <div>
          <span>
            <CircleDollarSign size={16} /> Collected this month
          </span>
          <strong>{formatCurrency(metrics.revenue_this_month)}</strong>
          <small>
            {metrics.revenue_collected !== undefined
              ? `${formatCurrency(metrics.revenue_collected)} collected all time`
              : `${formatCurrency(metrics.due_next_month ?? 0)} due in the next 30 days`}
          </small>
          <button type="button" className="bl-stat-link" onClick={() => openDrillDown({ metric: 'revenue_collected', title: 'Collected payments', listUrl: '/payments' })}>
            View details <ArrowRight size={13} />
          </button>
        </div>
      </section>

      <nav className="bl-section-links" aria-label="Jump to section">
        <a href="#revenue">
          Revenue <ArrowRight size={14} />
        </a>
        <a href="#attention">
          Needs attention <ArrowRight size={14} />
        </a>
        <a href="#invoices">
          Invoices <ArrowRight size={14} />
        </a>
        <a href="#activity">
          Activity <ArrowRight size={14} />
        </a>
      </nav>

      {/* 01 Revenue */}
      <section className="bl-portal-section" id="revenue" aria-labelledby="revenue-heading">
        <SectionHeading
          index="01"
          eyebrow="Revenue"
          title="Billed and collected."
          id="revenue-heading"
          aside={
            <div className="bl-chart-legend" aria-hidden="true">
              <span>
                <i style={{ background: '#305D42' }} /> Billed
              </span>
              <span>
                <i style={{ background: '#A8C09B' }} /> Collected
              </span>
            </div>
          }
        />
        <div className="bl-chart-grid">
          <div className="h-72" role="img" aria-label="Billed versus collected over the last six months">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mapTrendForChart(revenue_trend)} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid vertical={false} stroke="#E8ECE3" />
                <XAxis dataKey="month" stroke="#8A9585" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#8A9585"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v) => `$${Number(v).toLocaleString('en-US', { notation: 'compact' })}`}
                />
                <Tooltip
                  cursor={{ fill: '#F2F5EE' }}
                  formatter={(val: any, label: any) => [formatCurrency(Number(val)), label]}
                  contentStyle={CHART_TOOLTIP}
                />
                <Bar dataKey="billed" name="Billed" fill="#305D42" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar dataKey="collected" name="Collected" fill="#A8C09B" radius={[4, 4, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="text-[13px] text-[#5f6b62]">
              Subscriptions by status · <span className="text-[#1f3327]">{totalSubscriptions} total</span>
            </p>
            {totalSubscriptions > 0 && (
              <div className="mt-2 h-36" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subscription_distribution}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={44}
                      outerRadius={64}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {subscription_distribution.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#CDD5C8'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <ul className="bl-breakdown">
              {subscription_distribution.map((entry) => (
                <li key={entry.name}>
                  <span>
                    <i style={{ background: STATUS_COLORS[entry.name] ?? '#CDD5C8' }} />
                    {entry.name}
                  </span>
                  <strong>{entry.count}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 02 Needs attention */}
      <section className="bl-portal-section" id="attention" aria-labelledby="attention-heading">
        <SectionHeading
          index="02"
          eyebrow="Needs attention"
          title="Overdue, oldest first."
          id="attention-heading"
          aside={<span className="bl-section-count">{plural(overdue_invoices.length, 'invoice')}</span>}
        />
        {overdue_invoices.length === 0 ? (
          <div className="bl-empty">
            <FileText size={24} strokeWidth={1.4} />
            <h3>All caught up.</h3>
            <p>No invoices are past their due date.</p>
          </div>
        ) : (
          <div className="bl-table-scroll" role="region" aria-label="Overdue invoices" tabIndex={0}>
            <table className="bl-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Due date</th>
                  <th>Overdue by</th>
                  <th className="bl-align-right">Balance due</th>
                </tr>
              </thead>
              <tbody>
                {overdue_invoices.map((inv) => {
                  const days = daysOverdue(inv.due_date)
                  return (
                    <tr key={inv.id}>
                      <th scope="row">{inv.invoice_number}</th>
                      <td>{inv.customer__company || inv.customer__name || '—'}</td>
                      <td>{formatDate(inv.due_date)}</td>
                      <td className="bl-amount-due">{days === 0 ? 'Due today' : plural(days, 'day')}</td>
                      <td className="bl-align-right bl-amount-due">{formatCurrency(inv.balance_due)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 03 Invoices */}
      <section className="bl-portal-section" id="invoices" aria-labelledby="invoices-heading">
        <SectionHeading
          index="03"
          eyebrow="Billing"
          title="Latest invoices."
          id="invoices-heading"
          aside={
            <Link to="/invoices" className="bl-text-link">
              View invoices <ArrowUpRight size={15} />
            </Link>
          }
        />
        {recent_invoices.length === 0 ? (
          <div className="bl-empty">
            <FileText size={24} strokeWidth={1.4} />
            <h3>A clean slate.</h3>
            <p>Invoices will appear here once billing runs or one is created.</p>
          </div>
        ) : (
          <div className="bl-table-scroll" role="region" aria-label="Latest invoices" tabIndex={0}>
            <table className="bl-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Issued</th>
                  <th>Due date</th>
                  <th className="bl-align-right">Total</th>
                  <th className="bl-align-right">Balance due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent_invoices.map((inv) => (
                  <tr key={inv.id}>
                    <th scope="row">{inv.invoice_number}</th>
                    <td>{inv.customer__company || inv.customer__name || '—'}</td>
                    <td className="bl-muted">{formatDate(inv.issue_date)}</td>
                    <td className="bl-muted">{formatDate(inv.due_date)}</td>
                    <td className="bl-align-right">{formatCurrency(inv.total_amount)}</td>
                    <td className={`bl-align-right ${Number(inv.balance_due) > 0 ? 'bl-amount-due' : ''}`}>
                      {formatCurrency(inv.balance_due)}
                    </td>
                    <td>
                      <StatusText kind="invoice" value={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 04 Activity */}
      <section className="bl-portal-section" id="activity" aria-labelledby="activity-heading">
        <SectionHeading index="04" eyebrow="Activity" title="What’s been happening." id="activity-heading" />
        <div className="bl-split">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-medium text-[#1f3327]">Recent payments</h3>
              <Link to="/payments" className="bl-text-link">
                View all <ArrowUpRight size={15} />
              </Link>
            </div>
            {recent_payments.length === 0 ? (
              <div className="bl-empty">
                <CreditCard size={24} strokeWidth={1.4} />
                <p>No payments recorded yet.</p>
              </div>
            ) : (
              <div className="bl-table-scroll" role="region" aria-label="Recent payments" tabIndex={0}>
                <table className="bl-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Method</th>
                      <th>Date</th>
                      <th className="bl-align-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent_payments.map((p) => (
                      <tr key={p.id}>
                        <th scope="row">
                          {p.customer__name || '—'}
                          {p.invoice__invoice_number && (
                            <span className="block text-xs font-normal text-[#6b776d]">{p.invoice__invoice_number}</span>
                          )}
                        </th>
                        <td className="bl-muted">{humanize(p.payment_method)}</td>
                        <td className="bl-muted">{formatDate(p.payment_date)}</td>
                        <td className="bl-align-right bl-paid-amount">{formatCurrency(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-medium text-[#1f3327]">New subscriptions</h3>
              <Link to="/subscriptions" className="bl-text-link">
                View all <ArrowUpRight size={15} />
              </Link>
            </div>
            {recent_subscriptions.length === 0 ? (
              <div className="bl-empty">
                <Repeat size={24} strokeWidth={1.4} />
                <p>No subscriptions yet.</p>
              </div>
            ) : (
              <div className="bl-table-scroll" role="region" aria-label="New subscriptions" tabIndex={0}>
                <table className="bl-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Plan</th>
                      <th>Created</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent_subscriptions.map((s) => (
                      <tr key={s.id}>
                        <th scope="row">
                          {s.customer__name || '—'}
                          <span className="block text-xs font-normal text-[#6b776d]">{s.subscription_number}</span>
                        </th>
                        <td className="bl-muted">{s.plan__name || 'No plan'}</td>
                        <td className="bl-muted">{formatDate(s.created_at)}</td>
                        <td>
                          <StatusText kind="subscription" value={s.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      <Modal
        isOpen={!!drill}
        onClose={() => setDrill(null)}
        title={drill?.title ?? ''}
        description="The most recent records behind this figure."
        maxWidth="2xl"
      >
        {isDrillLoading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading records…</p>
        ) : drillError ? (
          <div className="bl-notice bl-notice-error" role="alert">
            <AlertCircle size={18} />
            <span>We couldn’t load these records. Please try again.</span>
          </div>
        ) : drillRecords.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No records yet.</p>
        ) : (
          <div className="bl-table-scroll" role="region" aria-label={drill?.title} tabIndex={0}>
            <table className="bl-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th className="bl-align-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {drillRecords.map((r) => (
                  <tr key={`${r.reference}-${r.id}`}>
                    <th scope="row">
                      {r.reference}
                      {r.details && (
                        <span className="block text-xs font-normal text-[#6b776d]">{r.details}</span>
                      )}
                    </th>
                    <td>{r.customer_name || '—'}</td>
                    <td className="bl-muted">{formatDate(r.date)}</td>
                    <td className="bl-align-right">{formatCurrency(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="bl-refresh"
            onClick={exportDrillDown}
            disabled={isExporting || isDrillLoading}
          >
            <Download size={14} />
            {isExporting ? 'Exporting…' : 'Export CSV'}
          </button>
          {drill && (
            <Link to={drill.listUrl} className="bl-refresh is-primary" onClick={() => setDrill(null)}>
              Open full list <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </Modal>

      <div className="bl-portal-endnote">
        <span>Everything in its place.</span>
        <p>Run billing from the top bar whenever renewal cycles are due.</p>
        <Link to="/reports" className="bl-text-link">
          Open reports <ArrowUpRight size={15} />
        </Link>
      </div>
    </div>
  )
}
