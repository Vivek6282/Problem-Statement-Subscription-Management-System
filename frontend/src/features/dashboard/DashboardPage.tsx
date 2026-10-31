import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
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
import { formatCompactCurrency, formatCurrency, formatDate, formatDateTime, mapTrendForChart } from '@/lib/utils'
import { describePeriod, useReportParams, type DrillMetric } from '@/lib/reportFilters'
import { DrillDownModal } from '@/features/reports/DrillDownModal'
import { AISummary } from '@/features/assistant/AISummary'
import type { DashboardMetrics } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { StatusText } from '@/components/ui/StatusText'
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

  // Filters, the open drill-down and its page live in the URL (shareable, survive refresh and Back).
  const { filters, drill, page, update } = useReportParams()
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const openDrillDown = (metric: DrillMetric) => update({ drill: metric, page: null })
  const closeDrillDown = () => update({ drill: null, page: null })

  const fetchDashboardData = async () => {
    setIsLoading(true)
    setLoadError(false)
    try {
      const res = await api.get<DashboardMetrics>('/reports/dashboard/')
      setData(res.data)
      setLastUpdated(res.data.generated_at ?? new Date().toISOString())
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
          <span>We couldn’t load the dashboard. Check that the API is running, then retry.</span>
          <button type="button" className="bl-refresh" onClick={fetchDashboardData}>
            <RefreshCw size={14} /> Retry
          </button>
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
  const cardCounts: Partial<Record<DrillMetric, number>> = {
    active_subscriptions: metrics.active_subscriptions,
    mrr: metrics.active_subscriptions,
    overdue_invoices: metrics.overdue_count,
    outstanding: metrics.outstanding_count,
    revenue_collected: metrics.revenue_collected_count,
    billed: metrics.billed_this_month_count,
  }
  // The month cards cover the 1st of the month to the as-of date, so open the detail with those dates.
  const openMonthDrillDown = (metric: DrillMetric) => {
    const asOf = data.as_of_date
    if (!asOf) return openDrillDown(metric)
    update({ drill: metric, page: null, start_date: `${asOf.slice(0, 8)}01`, end_date: asOf })
  }

  return (
    <div className="bl-portal">
      {heading}

      {loadError && (
        <div className="bl-notice bl-notice-error" role="alert">
          <AlertCircle size={18} />
          <span>
            Showing earlier data{lastUpdated ? ` (updated ${formatDateTime(lastUpdated)})` : ''}. The refresh failed.
          </span>
          <button type="button" onClick={fetchDashboardData} aria-label="Retry loading the dashboard">
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      <p className="bl-muted mt-4 text-sm" data-testid="report-context">
        Currency {data.currency_code ?? 'USD'} · Period {describePeriod(filters)} · As of{' '}
        {data.generated_at ? formatDateTime(data.generated_at) : data.as_of_date || '—'}
      </p>

      <AISummary filters={filters} />

      <section className="bl-overview-stats is-four" aria-label="Recurring revenue and receivables">
        <div>
          <span>
            <Repeat size={16} /> MRR (normalised monthly)
          </span>
          <strong>{formatCurrency(metrics.mrr)}</strong>
          <small>{formatCurrency(metrics.arr)} ARR (MRR x 12)</small>
          <button type="button" className="bl-stat-link" onClick={() => openDrillDown('mrr')}>
            View details <ArrowRight size={13} />
          </button>
        </div>
        <div>
          <span>
            <CalendarClock size={16} /> Active subscriptions
          </span>
          <strong>{metrics.active_subscriptions}</strong>
          <small>
            Customers: {metrics.total_customers} · {metrics.upcoming_renewals_count} renewing this week
            {metrics.churn_rate !== undefined && metrics.churn_rate !== null && ` · Churn (provisional) ${metrics.churn_rate}`}
          </small>
          <button type="button" className="bl-stat-link" onClick={() => openDrillDown('active_subscriptions')}>
            View details <ArrowRight size={13} />
          </button>
        </div>
        <div>
          <span>
            <Wallet size={16} /> Outstanding (open balance)
          </span>
          <strong>{formatCurrency(metrics.outstanding_balance)}</strong>
          <small>
            {metrics.outstanding_count ?? 0} open {metrics.outstanding_count === 1 ? 'invoice' : 'invoices'}
            {' · '}Due soon (next 30 days): {formatCurrency(metrics.due_next_month ?? 0)}
          </small>
          <button type="button" className="bl-stat-link" onClick={() => openDrillDown('outstanding')}>
            View details <ArrowRight size={13} />
          </button>
        </div>
        <div>
          <span>
            <AlertCircle size={16} /> Overdue (past due, unpaid)
          </span>
          <strong className={metrics.overdue_count > 0 ? 'bl-amount-due' : ''}>{formatCurrency(overdueAmount)}</strong>
          <small>
            {metrics.overdue_count > 0
              ? `Across ${plural(metrics.overdue_count, 'invoice')}, remaining balance only`
              : 'Nothing is past due'}
          </small>
          <button type="button" className="bl-stat-link" onClick={() => openDrillDown('overdue_invoices')}>
            View details <ArrowRight size={13} />
          </button>
        </div>
      </section>

      <section className="bl-overview-stats" aria-label="Billed and received">
        <div>
          <span>
            <FileText size={16} /> Billed (invoiced), this month
          </span>
          <strong>{formatCurrency(metrics.billed_this_month ?? 0)}</strong>
          <small>{plural(metrics.billed_this_month_count ?? 0, 'invoice')} issued</small>
          <button type="button" className="bl-stat-link" onClick={() => openMonthDrillDown('billed')}>
            View details <ArrowRight size={13} />
          </button>
        </div>
        <div>
          <span>
            <CircleDollarSign size={16} /> Received (payments), this month
          </span>
          <strong>{formatCurrency(metrics.revenue_this_month)}</strong>
          <small>
            {plural(metrics.revenue_this_month_count ?? 0, 'payment')}
            {metrics.revenue_collected !== undefined && ` · ${formatCurrency(metrics.revenue_collected)} received all time`}
          </small>
          <button type="button" className="bl-stat-link" onClick={() => openMonthDrillDown('revenue_collected')}>
            View details <ArrowRight size={13} />
          </button>
        </div>
        <div>
          <span>
            <CreditCard size={16} /> Received (payments), all time
          </span>
          <strong>{formatCurrency(metrics.revenue_collected ?? 0)}</strong>
          <small>{plural(metrics.revenue_collected_count ?? 0, 'payment')} recorded</small>
          <button type="button" className="bl-stat-link" onClick={() => openDrillDown('revenue_collected')}>
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
          title="Billed and received."
          id="revenue-heading"
          aside={
            <div className="bl-chart-legend" aria-hidden="true">
              <span>
                <i style={{ background: '#305D42' }} /> Billed (invoiced)
              </span>
              <span>
                <i style={{ background: '#A8C09B' }} /> Received (payments)
              </span>
            </div>
          }
        />
        <div className="bl-chart-grid">
          <div className="h-72" role="img" aria-label="Billed (invoiced) versus received (payments) over the last six months">
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
                  tickFormatter={(v) => formatCompactCurrency(v)}
                />
                <Tooltip
                  cursor={{ fill: '#F2F5EE' }}
                  formatter={(val: any, label: any) => [formatCurrency(Number(val)), label]}
                  contentStyle={CHART_TOOLTIP}
                />
                <Bar dataKey="billed" name="Billed (invoiced)" fill="#305D42" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar dataKey="collected" name="Received (payments)" fill="#A8C09B" radius={[4, 4, 0, 0]} maxBarSize={26} />
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

      <DrillDownModal
        metric={drill}
        filters={filters}
        page={page}
        cardCount={drill ? cardCounts[drill] : undefined}
        onClose={closeDrillDown}
        onChange={update}
      />

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
