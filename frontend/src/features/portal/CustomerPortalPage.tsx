import React, { useState, useEffect } from 'react'
import {
  Repeat,
  FileText,
  CreditCard,
  Download,
  Pause,
  Play,
  XCircle,
  Clock,
  Sparkles,
  Building,
  RotateCcw,
  Tag,
} from 'lucide-react'
import { api, fetchAll, getApiError } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Subscription, Invoice, Payment } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'

export const CustomerPortalPage: React.FC = () => {
  const { user } = useAuth()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)

  const fetchPortalData = async () => {
    setIsLoading(true)
    try {
      // Every page is loaded so balances and history are complete (the API only ever returns this customer's records)
      const [subs, invs, pays] = await Promise.all([
        fetchAll<Subscription>('/subscriptions/'),
        fetchAll<Invoice>('/invoices/'),
        fetchAll<Payment>('/payments/'),
      ])
      setSubscriptions(subs)
      setInvoices(invs)
      setPayments(pays)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPortalData()
  }, [])

  const handlePause = async (sub: Subscription) => {
    try {
      await api.post(`/subscriptions/${sub.id}/pause/`)
      setNotice(`Subscription ${sub.subscription_number} paused.`)
      fetchPortalData()
      setTimeout(() => setNotice(null), 4000)
    } catch (err: any) {
      setNotice(`Error: ${getApiError(err)}`)
    }
  }

  const handleResume = async (sub: Subscription) => {
    try {
      await api.post(`/subscriptions/${sub.id}/resume/`)
      setNotice(`Subscription ${sub.subscription_number} resumed!`)
      fetchPortalData()
      setTimeout(() => setNotice(null), 4000)
    } catch (err: any) {
      setNotice(`Error: ${getApiError(err)}`)
    }
  }

  const handleRenew = async (sub: Subscription) => {
    if (!confirm('Renew this subscription starting today?')) return
    try {
      await api.post(`/subscriptions/${sub.id}/renew/`)
      setNotice(`Subscription ${sub.subscription_number} renewed.`)
      fetchPortalData()
      setTimeout(() => setNotice(null), 4000)
    } catch (err: any) {
      setNotice(`Error: ${getApiError(err)}`)
    }
  }

  const handleCancelRequest = async (sub: Subscription) => {
    if (!confirm('Are you sure you want to close this subscription?')) return
    try {
      await api.post(`/subscriptions/${sub.id}/close/`)
      setNotice(`Subscription ${sub.subscription_number} closed.`)
      fetchPortalData()
      setTimeout(() => setNotice(null), 4000)
    } catch (err: any) {
      setNotice(`Error: ${getApiError(err)}`)
    }
  }

  const handleDownloadInvoicePDF = async (inv: Invoice) => {
    try {
      const res = await api.get(`/invoices/${inv.id}/pdf/`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${inv.invoice_number}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error('Download error:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  const activeSubCount = subscriptions.filter((s) => s.status === 'ACTIVE').length
  const totalBalanceDue = invoices
    .filter((inv) => ['CONFIRMED', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status))
    .reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0)

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="p-6 bg-gradient-to-r from-navy-950 via-slate-900 to-navy-950 text-white rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-primary">Customer Self-Service Portal</span>
          <h1 className="text-2xl font-black tracking-tight mt-1">Hello, {user?.full_name || user?.email}</h1>
          <p className="text-xs text-slate-400 mt-1">View active subscriptions, download official invoices, and manage payment records</p>
        </div>

        <div className="flex items-center gap-6 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
          <div>
            <span className="text-[11px] text-slate-400">Active Plans</span>
            <p className="text-lg font-black text-white">{activeSubCount}</p>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div>
            <span className="text-[11px] text-slate-400">Outstanding Due</span>
            <p className={`text-lg font-black ${totalBalanceDue > 0 ? 'text-amber-400' : 'text-green-400'}`}>
              {formatCurrency(totalBalanceDue)}
            </p>
          </div>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-navy-950 text-white rounded-xl text-xs font-semibold flex items-center justify-between border border-slate-700 animate-in fade-in">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Subscriptions Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Repeat className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-slate-900">Your Subscriptions</h2>
        </div>

        {subscriptions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-xs text-slate-400">
              You do not have any active subscriptions yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions.map((s) => (
              <Card key={s.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="bg-slate-50/50">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-900">{s.subscription_number}</span>
                    <CardTitle className="text-sm mt-0.5">{s.plan_details?.name}</CardTitle>
                  </div>
                  <Badge variant={s.status === 'ACTIVE' ? 'success' : s.status === 'PAUSED' ? 'warning' : 'neutral'}>
                    {s.status}
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Recurring Price:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(s.recurring_subtotal)} / {s.plan_details?.billing_interval.toLowerCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Started:</span>
                    <span className="font-semibold text-slate-700">{formatDate(s.start_date)}{s.expiry_date ? ` · ends ${formatDate(s.expiry_date)}` : ''}</span>
                  </div>
                  {s.status === 'ACTIVE' && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Next Billing Date:</span>
                      <span className="font-semibold text-slate-700">{formatDate(s.next_billing_date)}</span>
                    </div>
                  )}
                  {s.pricing && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Next invoice (incl. tax{Number(s.pricing.discount_total) > 0 ? ' & discount' : ''}):</span>
                      <span className="font-bold text-slate-900">{formatCurrency(s.pricing.total)}</span>
                    </div>
                  )}
                  {s.discount_details && (
                    <div className="flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-100 rounded-lg px-2.5 py-1.5">
                      <Tag className="w-3 h-3" />
                      <span>
                        Discount <b>{s.discount_details.code}</b> ({s.discount_details.discount_type === 'PERCENTAGE' ? `${s.discount_details.value}%` : formatCurrency(s.discount_details.value)} off)
                        {s.discount_details.end_date ? ` until ${formatDate(s.discount_details.end_date)}` : ''} applies automatically
                      </span>
                    </div>
                  )}

                  {/* Customer self-service lifecycle controls */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                    {s.status === 'ACTIVE' && s.plan_details?.allow_pause && (
                      <Button size="sm" variant="outline" onClick={() => handlePause(s)}>
                        <Pause className="w-3 h-3 mr-1" /> Pause
                      </Button>
                    )}
                    {s.status === 'PAUSED' && (
                      <Button size="sm" variant="success" onClick={() => handleResume(s)}>
                        <Play className="w-3 h-3 mr-1 fill-current" /> Resume
                      </Button>
                    )}
                    {s.status === 'CLOSED' && s.plan_details?.allow_renewal && (
                      <Button size="sm" variant="outline" onClick={() => handleRenew(s)}>
                        <RotateCcw className="w-3 h-3 mr-1" /> Renew
                      </Button>
                    )}
                    {s.status === 'ACTIVE' && s.plan_details?.allow_early_close && (
                      <Button size="sm" variant="danger" onClick={() => handleCancelRequest(s)}>
                        <XCircle className="w-3 h-3 mr-1" /> Close Plan
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Invoices Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-slate-900">Billing Invoices & Receipts</h2>
        </div>

        {invoices.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-xs text-slate-400">
              No invoices generated yet.
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Balance Due</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {formatDate(inv.issue_date)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="py-3 px-4 font-bold text-red-600">
                        {formatCurrency(inv.balance_due)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'danger' : 'info'}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDownloadInvoicePDF(inv)}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary-50 rounded-lg transition-colors"
                          title="Download Invoice PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Payment History Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-slate-900">Payment History</h2>
        </div>

        {payments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-xs text-slate-400">
              No payments recorded yet.
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.payment_number}</td>
                      <td className="py-3 px-4 font-mono text-primary font-semibold">{p.invoice_number}</td>
                      <td className="py-3 px-4 text-slate-600">{formatDate(p.payment_date)}</td>
                      <td className="py-3 px-4">
                        <Badge variant="neutral">{p.payment_method}</Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{p.transaction_reference || '-'}</td>
                      <td className="py-3 px-4 font-black text-green-700 text-right">{formatCurrency(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

