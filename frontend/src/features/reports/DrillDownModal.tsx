import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight, ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
  filtersToQuery,
  SUBSCRIPTION_METRICS,
  type DrillMetric,
  type ReportFilters,
} from '@/lib/reportFilters'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

export const DRILL_INFO: Record<DrillMetric, { title: string; listUrl: string }> = {
  mrr: { title: 'MRR (normalised monthly)', listUrl: '/subscriptions?status=ACTIVE' },
  active_subscriptions: { title: 'Active subscriptions', listUrl: '/subscriptions?status=ACTIVE' },
  overdue_invoices: { title: 'Overdue (past due, unpaid)', listUrl: '/invoices?status=OVERDUE' },
  outstanding: { title: 'Outstanding (open balance)', listUrl: '/invoices' },
  billed: { title: 'Billed (invoiced)', listUrl: '/invoices' },
  revenue_collected: { title: 'Received (payments)', listUrl: '/payments' },
}

const PAGE_SIZE = 10

interface DrillRecord {
  id: number
  reference: string
  customer_name: string
  amount: string
  date: string
  status: string
  details: string
}

interface DrillResponse {
  metric: string
  count: number
  total: string
  page: number
  total_pages: number
  results: DrillRecord[]
  currency_code?: string
  generated_at?: string
}

interface Option {
  value: string
  label: string
}

interface Props {
  metric: DrillMetric | null
  filters: ReportFilters
  page: number
  /** Record count shown on the dashboard card for this metric, if the card has one. */
  cardCount?: number
  onClose: () => void
  onChange: (patch: Record<string, string | null>) => void
}

export const DrillDownModal: React.FC<Props> = ({ metric, filters, page, cardCount, onClose, onChange }) => {
  const [data, setData] = useState<DrillResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [plans, setPlans] = useState<Option[]>([])
  const [products, setProducts] = useState<Option[]>([])

  const query = metric ? filtersToQuery(filters, metric) : ''
  const isSubscriptionMetric = !!metric && SUBSCRIPTION_METRICS.includes(metric)

  // Drop the previous metric's rows when the modal switches to another metric.
  useEffect(() => {
    setData(null)
    setHasError(false)
    setExportError(null)
  }, [metric])

  useEffect(() => {
    if (!metric) return
    const controller = new AbortController()
    setIsLoading(true)
    api
      .get<DrillResponse>(`/reports/drilldown/?metric=${metric}&page=${page}&page_size=${PAGE_SIZE}${query ? `&${query}` : ''}`, {
        signal: controller.signal,
      })
      .then((res) => {
        setData(res.data)
        setHasError(false)
        setIsLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted || err?.code === 'ERR_CANCELED') return
        setHasError(true)
        setIsLoading(false)
      })
    return () => controller.abort()
  }, [metric, page, query, reloadKey])

  // Plan and product choices come from the breakdown endpoints, which are not paginated.
  useEffect(() => {
    if (!isSubscriptionMetric) return
    let cancelled = false
    api
      .get('/reports/mrr-breakdown/?group_by=plan')
      .then((res) => {
        if (!cancelled) setPlans((res.data.results ?? []).map((p: any) => ({ value: String(p.plan_id), label: p.plan_name })))
      })
      .catch(() => {})
    api
      .get('/reports/mrr-breakdown/?group_by=product')
      .then((res) => {
        if (!cancelled) setProducts((res.data.results ?? []).map((p: any) => ({ value: String(p.product_id), label: p.product_name })))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isSubscriptionMetric])

  const exportCsv = useCallback(async () => {
    if (!metric) return
    setIsExporting(true)
    setExportError(null)
    try {
      const res = await api.get(`/reports/export/?type=drilldown&metric=${metric}${query ? `&${query}` : ''}`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `brightloop_drilldown_${metric}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setExportError('The export failed. Try again in a moment.')
    } finally {
      setIsExporting(false)
    }
  }, [metric, query])

  const info = metric ? DRILL_INFO[metric] : null
  const filtered = !!(filters.start_date || filters.end_date || (isSubscriptionMetric && (filters.plan_id || filters.product_id)))
  const showStale = hasError && !!data
  const matchesCard = cardCount !== undefined && data !== null && !filtered && cardCount === data.count

  return (
    <Modal
      isOpen={!!metric}
      onClose={onClose}
      title={info?.title ?? ''}
      description="The records behind this figure, from the same data as the dashboard cards."
      maxWidth="2xl"
    >
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="Filters">
        <Input
          type="date"
          label="From"
          value={filters.start_date}
          max={filters.end_date || undefined}
          onChange={(e) => onChange({ start_date: e.target.value })}
        />
        <Input
          type="date"
          label="To"
          value={filters.end_date}
          min={filters.start_date || undefined}
          onChange={(e) => onChange({ end_date: e.target.value })}
        />
        {isSubscriptionMetric && (
          <>
            <Select
              label="Plan"
              value={filters.plan_id}
              onChange={(e) => onChange({ plan_id: e.target.value })}
              options={[{ value: '', label: 'All plans' }, ...plans]}
            />
            <Select
              label="Product"
              value={filters.product_id}
              onChange={(e) => onChange({ product_id: e.target.value })}
              options={[{ value: '', label: 'All products' }, ...products]}
            />
          </>
        )}
      </div>

      {data && (
        <p className="mb-3 text-xs text-slate-600" aria-live="polite">
          <strong>{data.count}</strong> {data.count === 1 ? 'record' : 'records'} · total{' '}
          <strong>{formatCurrency(data.total)}</strong>
          {cardCount !== undefined &&
            (matchesCard
              ? ` · matches the dashboard card (${cardCount})`
              : filtered
                ? ` · filtered view (dashboard card: ${cardCount})`
                : ` · dashboard card: ${cardCount}`)}
        </p>
      )}

      {showStale && (
        <div className="bl-notice bl-notice-error" role="alert">
          <AlertCircle size={18} />
          <span>
            Showing earlier data{data?.generated_at ? ` (updated ${formatDateTime(data.generated_at)})` : ''}. The refresh failed.
          </span>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} aria-label="Retry loading records">
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      {isLoading && !data ? (
        <div className="space-y-2" role="status" aria-label="Loading records">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : hasError && !data ? (
        <div className="bl-notice bl-notice-error" role="alert">
          <AlertCircle size={18} />
          <span>We couldn’t load these records.</span>
          <button type="button" className="bl-refresh" onClick={() => setReloadKey((k) => k + 1)}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : data && data.results.length === 0 ? (
        <EmptyState
          title="No records match"
          description={filtered ? 'Try widening the dates or clearing a filter.' : 'There is nothing to show for this figure yet.'}
          actionLabel={filtered ? 'Clear filters' : undefined}
          onAction={filtered ? () => onChange({ start_date: null, end_date: null, plan_id: null, product_id: null }) : undefined}
        />
      ) : data ? (
        <div className={isLoading ? 'opacity-60' : undefined} aria-busy={isLoading}>
          <div className="bl-table-scroll" role="region" aria-label={info?.title} tabIndex={0}>
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
                {data.results.map((r) => (
                  <tr key={`${r.reference}-${r.id}`}>
                    <th scope="row">
                      {r.reference}
                      {r.details && <span className="block text-xs font-normal text-[#6b776d]">{r.details}</span>}
                    </th>
                    <td>{r.customer_name || '—'}</td>
                    <td className="bl-muted">{formatDate(r.date)}</td>
                    <td className="bl-align-right">{formatCurrency(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="mt-3 flex items-center justify-between gap-3" aria-label="Pagination">
            <button
              type="button"
              className="bl-refresh"
              onClick={() => onChange({ page: String(page - 1) })}
              disabled={page <= 1 || isLoading}
              aria-label="Previous page"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span className="text-xs text-slate-600" aria-current="page">
              Page {data.page} of {data.total_pages}
            </span>
            <button
              type="button"
              className="bl-refresh"
              onClick={() => onChange({ page: String(page + 1) })}
              disabled={page >= data.total_pages || isLoading}
              aria-label="Next page"
            >
              Next <ChevronRight size={14} />
            </button>
          </nav>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="bl-refresh" onClick={exportCsv} disabled={isExporting || (isLoading && !data)}>
          <Download size={14} />
          {isExporting ? 'Preparing export…' : 'Export CSV'}
        </button>
        {info && (
          <Link to={info.listUrl} className="bl-refresh is-primary" onClick={onClose}>
            Open full list <ArrowRight size={14} />
          </Link>
        )}
      </div>
      {exportError && (
        <div className="bl-notice bl-notice-error" role="alert">
          <AlertCircle size={18} />
          <span>{exportError}</span>
        </div>
      )}
    </Modal>
  )
}
