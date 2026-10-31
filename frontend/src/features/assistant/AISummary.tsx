import React, { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthContext'
import type { ReportFilters } from '@/lib/reportFilters'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'

interface SummaryResponse {
  summary: string
  figures: Record<string, string | number | null>
  filters: Record<string, string | number | null>
  as_of: string
  currency: string
  label: string
}

const FIGURE_LABELS: Array<[string, string, 'money' | 'count' | 'text']> = [
  ['active_subscriptions', 'Active subscriptions', 'count'],
  ['mrr', 'MRR (normalised monthly)', 'money'],
  ['arr', 'ARR (MRR x 12)', 'money'],
  ['billed', 'Billed (invoiced)', 'money'],
  ['received', 'Received (payments)', 'money'],
  ['outstanding', 'Outstanding (open balance)', 'money'],
  ['overdue_count', 'Overdue invoices', 'count'],
  ['overdue_amount', 'Overdue (past due, unpaid)', 'money'],
  ['churn_provisional', 'Churn (provisional)', 'text'],
]

/** Admin-only "Summarise with AI". Renders only when the assistant is available; the page works without it. */
export const AISummary: React.FC<{ filters: ReportFilters }> = ({ filters }) => {
  const { isAdmin } = useAuth()
  const [available, setAvailable] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SummaryResponse | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    api
      .get('/assistant/status/')
      .then((res) => {
        if (!cancelled) setAvailable(!!res.data?.available)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  if (!isAdmin || !available) return null

  const summarise = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const sent: Record<string, string> = {}
      for (const [key, value] of Object.entries(filters)) if (value) sent[key] = value
      const res = await api.post<SummaryResponse>('/assistant/report-summary/', { report: 'dashboard', filters: sent })
      setResult(res.data)
    } catch (err: any) {
      setError(
        err?.response?.status === 422
          ? 'The summary could not be verified against the figures, so nothing is shown.'
          : 'AI assistant unavailable',
      )
    } finally {
      setLoading(false)
    }
  }

  const filterText = result
    ? Object.entries(result.filters)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k.replace('_', ' ')}: ${v}`)
        .join(' · ')
    : ''

  return (
    <section className="mt-6" aria-label="AI summary">
      <Button type="button" size="sm" variant="outline" onClick={summarise} isLoading={loading}>
        <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Summarise with AI
      </Button>
      {loading && <Skeleton className="mt-3 h-20 w-full" />}
      {error && !loading && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {result && !loading && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-[11px] font-semibold text-slate-600">{result.label}</p>
          <p className="text-[11px] text-slate-500">
            {filterText ? `${filterText} · ` : 'No filters · '}as of {result.as_of} · {result.currency}
          </p>
          {/* Plain text only: never rendered as HTML. */}
          <p className="whitespace-pre-line text-sm text-slate-900">{result.summary}</p>
          <table className="w-full text-xs" aria-label="Source figures">
            <caption className="text-left font-semibold text-slate-700 pb-1">Source figures</caption>
            <tbody>
              {FIGURE_LABELS.map(([key, label, kind]) => (
                <tr key={key} className="border-t border-slate-100">
                  <th scope="row" className="py-1 pr-3 text-left font-normal text-slate-600">
                    {label}
                  </th>
                  <td className="py-1 text-right font-semibold text-slate-900">
                    {kind === 'money' ? formatCurrency(result.figures[key] as string) : String(result.figures[key] ?? '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-slate-500">Generated {formatDateTime(new Date().toISOString())}</p>
        </div>
      )}
    </section>
  )
}
