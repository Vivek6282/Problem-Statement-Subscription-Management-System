import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/** Filters the drill-down and export endpoints accept. Nothing else is ever sent. */
export interface ReportFilters {
  start_date: string
  end_date: string
  plan_id: string
  product_id: string
}

export const DRILL_METRICS = [
  'mrr',
  'active_subscriptions',
  'overdue_invoices',
  'outstanding',
  'billed',
  'revenue_collected',
] as const
export type DrillMetric = (typeof DRILL_METRICS)[number]

/** Plan and product filters only make sense for subscription-based metrics. */
export const SUBSCRIPTION_METRICS: DrillMetric[] = ['mrr', 'active_subscriptions']

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ID_RE = /^\d{1,12}$/

const clean = (value: string | null, re: RegExp) => (value && re.test(value) ? value : '')

export function filtersToQuery(filters: ReportFilters, metric?: DrillMetric | null): string {
  const query = new URLSearchParams()
  if (filters.start_date) query.set('start_date', filters.start_date)
  if (filters.end_date) query.set('end_date', filters.end_date)
  if (!metric || SUBSCRIPTION_METRICS.includes(metric)) {
    if (filters.plan_id) query.set('plan_id', filters.plan_id)
    if (filters.product_id) query.set('product_id', filters.product_id)
  }
  return query.toString()
}

export function describePeriod(filters: ReportFilters): string {
  if (!filters.start_date && !filters.end_date) return 'all time'
  return `${filters.start_date || 'the beginning'} to ${filters.end_date || 'today'}`
}

/**
 * Report filters, the open drill-down and its page live in the query string, so a refresh, a copied
 * link and the Back button all restore the same view. Invalid values in the URL are ignored.
 */
export function useReportParams() {
  const [params, setParams] = useSearchParams()

  const filters: ReportFilters = useMemo(
    () => ({
      start_date: clean(params.get('start_date'), DATE_RE),
      end_date: clean(params.get('end_date'), DATE_RE),
      plan_id: clean(params.get('plan_id'), ID_RE),
      product_id: clean(params.get('product_id'), ID_RE),
    }),
    [params],
  )

  const rawDrill = params.get('drill')
  const drill = (DRILL_METRICS as readonly string[]).includes(rawDrill ?? '')
    ? (rawDrill as DrillMetric)
    : null
  const page = Math.max(1, Number(clean(params.get('page'), ID_RE)) || 1)

  /** Merge changes into the query string; null or '' removes a key. Changing filters resets paging. */
  const update = useCallback(
    (patch: Record<string, string | null>) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === '') next.delete(key)
          else next.set(key, value)
        }
        if (!('page' in patch)) next.delete('page')
        return next
      })
    },
    [setParams],
  )

  return { filters, drill, page, update }
}
