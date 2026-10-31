import React, { useState, useEffect, useRef } from 'react'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Mail,
  CheckCircle2,
  XCircle,
  CreditCard,
  Eye,
  AlertTriangle,
} from 'lucide-react'
import { api, fetchAll, getApiError } from '@/lib/api'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import type { Invoice, Customer, InvoiceStatus, PaymentMethodType, HistoryEvent } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Pagination } from '@/components/ui/Pagination'
import { TableControls } from '@/components/ui/TableControls'

export const InvoicesPage: React.FC = () => {
  const { isStaff } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [ordering, setOrdering] = useState('-issue_date')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const lastFilterKey = useRef('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Create Invoice Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [formInv, setFormInv] = useState({
    customer: '',
    due_date: '',
    notes: '',
    product_name: '',
    quantity: 1,
    unit_price: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Payment Recording Modal
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethodType>('BANK_TRANSFER')
  const [payRef, setPayRef] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [isRecordingPayment, setIsRecordingPayment] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  // Detail Modal
  const [detailInv, setDetailInv] = useState<Invoice | null>(null)
  const [invHistory, setInvHistory] = useState<{ events: HistoryEvent[]; payments: any[] } | null>(null)

  // Draft editing (header fields; the line is editable when the draft has exactly one)
  const [editInv, setEditInv] = useState<{ id: number; number: string; due_date: string; notes: string; single: boolean; product_name: string; quantity: number; unit_price: string } | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  const fetchInvoices = async () => {
    setIsLoading(true)
    try {
      let url = '/invoices/'
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      params.append('page', String(page))
      if (ordering) params.append('ordering', ordering)
      if (dateFrom) params.append('issue_date__gte', dateFrom)
      if (dateTo) params.append('issue_date__lte', dateTo)
      if (params.toString()) url += `?${params.toString()}`

      const res = await api.get(url)
      setInvoices(res.data.results || res.data)
      setCount(res.data.count ?? (res.data.results || res.data).length)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCustomers = async () => {
    try {
      const rows = await fetchAll<Customer>('/customers/', { status: 'ACTIVE' })
      setCustomers(rows)
      return rows
    } catch (err) {
      console.error(err)
      return [] as Customer[]
    }
  }

  useEffect(() => {
    if (!detailInv) {
      setInvHistory(null)
      return
    }
    api.get(`/invoices/${detailInv.id}/history/`).then((res) => setInvHistory(res.data)).catch(() => setInvHistory(null))
  }, [detailInv?.id])

  const openEdit = (inv: Invoice) => {
    const only = inv.items && inv.items.length === 1 ? inv.items[0] : null
    setEditInv({
      id: inv.id, number: inv.invoice_number, due_date: inv.due_date, notes: inv.notes || '',
      single: !!only, product_name: only?.product_name || '', quantity: only?.quantity || 1, unit_price: only ? String(only.unit_price) : '',
    })
    setEditError(null)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editInv) return
    setIsEditing(true)
    setEditError(null)
    try {
      const body: Record<string, unknown> = { due_date: editInv.due_date, notes: editInv.notes }
      if (editInv.single) body.items = [{ product_name: editInv.product_name, quantity: Number(editInv.quantity) || 1, unit_price: editInv.unit_price }]
      await api.patch(`/invoices/${editInv.id}/`, body)
      setEditInv(null)
      setDetailInv(null)
      fetchInvoices()
      setActionNotice(`Draft invoice ${editInv.number} updated.`)
      setTimeout(() => setActionNotice(null), 5000)
    } catch (err) {
      setEditError(getApiError(err, 'Could not update the draft.'))
    } finally {
      setIsEditing(false)
    }
  }

  useEffect(() => {
    const filterKey = String(search) + '|' + String(statusFilter) + '|' + String(ordering) + '|' + String(dateFrom) + '|' + String(dateTo)
    if (lastFilterKey.current !== filterKey && page !== 1) {
      lastFilterKey.current = filterKey
      setPage(1)
      return
    }
    lastFilterKey.current = filterKey
    fetchInvoices()
  }, [search, statusFilter, ordering, dateFrom, dateTo, page])

  const openCreateModal = async () => {
    const rows = await loadCustomers()
    const d = new Date()
    d.setDate(d.getDate() + 30)
    setFormInv({
      customer: rows[0]?.id ? String(rows[0].id) : '',
      due_date: d.toISOString().split('T')[0],
      notes: '',
      product_name: '',
      quantity: 1,
      unit_price: '',
    })
    setFormError(null)
    setIsCreateOpen(true)
  }

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFormError(null)

    try {
      await api.post('/invoices/', {
        customer: Number(formInv.customer),
        due_date: formInv.due_date,
        notes: formInv.notes,
        items: [
          {
            product_name: formInv.product_name,
            quantity: Number(formInv.quantity) || 1,
            unit_price: formInv.unit_price,
          },
        ],
      })
      setIsCreateOpen(false)
      fetchInvoices()
      setActionNotice('Draft invoice created.')
      setTimeout(() => setActionNotice(null), 5000)
    } catch (err: any) {
      setFormError(getApiError(err, 'Failed to generate invoice.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirm = async (inv: Invoice) => {
    try {
      await api.post(`/invoices/${inv.id}/confirm/`)
      setActionNotice(`Invoice ${inv.invoice_number} confirmed and marked due.`)
      fetchInvoices()
      setTimeout(() => setActionNotice(null), 5000)
    } catch (err: any) {
      setActionNotice(`Error: ${getApiError(err)}`)
      setTimeout(() => setActionNotice(null), 5000)
    }
  }

  const handleCancel = async (inv: Invoice) => {
    if (!confirm(`Cancel invoice ${inv.invoice_number}?`)) return
    try {
      await api.post(`/invoices/${inv.id}/cancel/`)
      setActionNotice(`Invoice ${inv.invoice_number} cancelled.`)
      fetchInvoices()
      setTimeout(() => setActionNotice(null), 5000)
    } catch (err: any) {
      setActionNotice(`Error: ${getApiError(err)}`)
      setTimeout(() => setActionNotice(null), 5000)
    }
  }

  const handleSendEmail = async (inv: Invoice) => {
    try {
      const res = await api.post(`/invoices/${inv.id}/send-email/`)
      setActionNotice(res.data.message)
      setTimeout(() => setActionNotice(null), 5000)
    } catch (err: any) {
      setActionNotice(`Error sending email: ${getApiError(err)}`)
      setTimeout(() => setActionNotice(null), 5000)
    }
  }

  const handleDownloadPDF = async (inv: Invoice) => {
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
      console.error('PDF error:', err)
    }
  }

  const openPaymentModal = (inv: Invoice) => {
    setSelectedInvoiceForPayment(inv)
    setPayAmount(String(inv.balance_due))
    setPayMethod('BANK_TRANSFER')
    setPayRef('')
    setPayNotes('')
    setPayError(null)
    setIsPaymentModalOpen(true)
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInvoiceForPayment) return
    setIsRecordingPayment(true)
    setPayError(null)

    try {
      await api.post('/payments/', {
        invoice: selectedInvoiceForPayment.id,
        amount: payAmount,
        payment_method: payMethod,
        transaction_reference: payRef,
        notes: payNotes,
      })
      setIsPaymentModalOpen(false)
      fetchInvoices()
      setActionNotice(`Payment recorded for invoice ${selectedInvoiceForPayment.invoice_number}!`)
      setTimeout(() => setActionNotice(null), 5000)
    } catch (err: any) {
      setPayError(getApiError(err, 'Payment recording failed.'))
    } finally {
      setIsRecordingPayment(false)
    }
  }

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success">Paid</Badge>
      case 'PARTIALLY_PAID':
        return <Badge variant="info">Partially Paid</Badge>
      case 'CONFIRMED':
        return <Badge variant="default">Due</Badge>
      case 'OVERDUE':
        return <Badge variant="danger">Overdue</Badge>
      case 'DRAFT':
        return <Badge variant="neutral">Draft</Badge>
      case 'CANCELLED':
        return <Badge variant="neutral">Cancelled</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Invoice Management</h1>
          <p className="text-xs text-slate-500 mt-1">Immutable billing snapshots, balance tracking, and PDF document delivery</p>
        </div>
        {isStaff && (
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Create Invoice
          </Button>
        )}
      </div>

      {actionNotice && (
        <div className="p-3 bg-navy-950 text-white rounded-xl text-xs font-semibold flex items-center justify-between border border-slate-700 animate-in fade-in">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Filter and Search */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice #, customer..."
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Due / Confirmed</option>
              <option value="OVERDUE">Overdue</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
              <option value="DRAFT">Draft</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </CardContent>
        <CardContent className="px-4 pb-4 pt-3 border-t border-slate-100">
          <TableControls
            orderingOptions={[{ label: 'Newest first', value: '-issue_date' }, { label: 'Oldest first', value: 'issue_date' }, { label: 'Due soonest', value: 'due_date' }, { label: 'Highest total', value: '-total_amount' }, { label: 'Highest balance', value: '-balance_due' }]}
            ordering={ordering}
            onOrderingChange={setOrdering}
            dateLabel="Issued"
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
        </CardContent>
      </Card>

      {/* Invoices Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No Invoices Found"
          description={search ? `No invoices matched "${search}".` : 'No invoices generated yet.'}
          actionLabel={isStaff ? 'Create Invoice' : undefined}
          onAction={isStaff ? openCreateModal : undefined}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Balance Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{inv.customer_details?.company || inv.customer_details?.name}</div>
                      <div className="text-[11px] text-slate-400">{inv.customer_details?.name}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {formatDate(inv.issue_date)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={inv.is_overdue ? 'font-bold text-red-600' : 'text-slate-600'}>
                        {formatDate(inv.due_date)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {formatCurrency(inv.balance_due)}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDownloadPDF(inv)}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary-50 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {isStaff && (
                          <button
                            onClick={() => handleSendEmail(inv)}
                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary-50 rounded-lg transition-colors"
                            title="Send via Email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDetailInv(inv)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Staff payment & confirm actions */}
                        {isStaff && inv.status === 'DRAFT' && (
                          <Button size="sm" variant="outline" onClick={() => handleConfirm(inv)}>
                            Confirm
                          </Button>
                        )}

                        {isStaff && Number(inv.balance_due) > 0 && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED' && (
                          <Button size="sm" onClick={() => openPaymentModal(inv)}>
                            <CreditCard className="w-3.5 h-3.5 mr-1" /> Pay
                          </Button>
                        )}

                        {isStaff && inv.status === 'DRAFT' && (
                          <button
                            onClick={() => handleCancel(inv)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                            title="Cancel Invoice"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} count={count} onPageChange={setPage} />
        </Card>
      )}

      {/* Invoice Detail Modal */}
      {detailInv && (
        <Modal
          isOpen={!!detailInv}
          onClose={() => setDetailInv(null)}
          title={`Invoice ${detailInv.invoice_number}`}
          description={`Billed to: ${detailInv.customer_details?.company || detailInv.customer_details?.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <p className="text-slate-500">Issue Date</p>
                <p className="font-semibold text-slate-800">{formatDate(detailInv.issue_date)}</p>
              </div>
              <div>
                <p className="text-slate-500">Due Date</p>
                <p className={`font-semibold ${detailInv.is_overdue ? 'text-red-600 font-bold' : 'text-slate-800'}`}>
                  {formatDate(detailInv.due_date)} {detailInv.is_overdue && '(OVERDUE)'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Subtotal</p>
                <p className="font-semibold text-slate-800">{formatCurrency(detailInv.subtotal)}</p>
              </div>
              <div>
                <p className="text-slate-500">Taxes</p>
                <p className="font-semibold text-slate-800">{formatCurrency(detailInv.tax_amount)}</p>
              </div>
              <div>
                <p className="text-slate-500">Total Billed</p>
                <p className="font-bold text-slate-900 text-sm">{formatCurrency(detailInv.total_amount)}</p>
              </div>
              <div>
                <p className="text-slate-500">Remaining Balance</p>
                <p className="font-black text-red-600 text-sm">{formatCurrency(detailInv.balance_due)}</p>
              </div>
            </div>

            {((detailInv.applied_discounts && detailInv.applied_discounts.length > 0) || (detailInv.tax_summary && detailInv.tax_summary.length > 0)) && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                {detailInv.applied_discounts?.map((d) => (
                  <div key={d.code} className="flex justify-between text-green-700">
                    <span>Discount {d.code} — {d.name}</span><span>-{formatCurrency(d.amount)}</span>
                  </div>
                ))}
                {detailInv.tax_summary?.map((t) => (
                  <div key={`${t.name}-${t.rate}`} className="flex justify-between text-slate-600">
                    <span>{t.name} ({t.rate}%)</span><span>+{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Line items snapshot */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900">Immutable Line Items Snapshot</h4>
              {detailInv.items && detailInv.items.map((it) => (
                <div key={it.id} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">{it.product_name}</span>
                    {it.variant_name && <span className="text-slate-400 ml-1">({it.variant_name})</span>}
                    <span className="text-slate-400 ml-2">x {it.quantity}</span>
                  </div>
                  <span className="font-bold text-slate-900">{formatCurrency(it.line_total)}</span>
                </div>
              ))}
            </div>

            {invHistory && (invHistory.payments.length > 0 || invHistory.events.length > 0) && (
              <div className="space-y-2">
                {invHistory.payments.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Payments</h4>
                    <ul className="space-y-1">
                      {invHistory.payments.map((p) => (
                        <li key={p.id} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg">
                          <span className="font-mono font-semibold">{p.payment_number}</span>
                          <span className="text-slate-500">{formatDate(p.payment_date)} · {p.method}</span>
                          <span className={p.status === 'REVERSED' ? 'line-through text-slate-400' : 'font-bold text-green-700'}>{formatCurrency(p.amount)}</span>
                          {p.status === 'REVERSED' && <Badge variant="danger">Reversed</Badge>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Invoice History</h4>
                  <ul className="space-y-1 max-h-28 overflow-y-auto">
                    {invHistory.events.map((e) => (
                      <li key={e.id} className="flex justify-between gap-3 p-2 bg-white border border-slate-200 rounded-lg">
                        <span className="text-slate-700">{e.description}</span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{formatDateTime(e.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              {isStaff && detailInv.status === 'DRAFT' && (
                <Button size="sm" variant="outline" onClick={() => openEdit(detailInv)}>Edit Draft</Button>
              )}
              <Button size="sm" variant="outline" onClick={() => handleDownloadPDF(detailInv)}>
                <Download className="w-3.5 h-3.5 mr-1" /> PDF Export
              </Button>
              {isStaff && Number(detailInv.balance_due) > 0 && (
                <Button size="sm" onClick={() => { setDetailInv(null); openPaymentModal(detailInv); }}>
                  <CreditCard className="w-3.5 h-3.5 mr-1" /> Record Payment
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Record Payment Modal */}
      {selectedInvoiceForPayment && (
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title={`Record Payment for ${selectedInvoiceForPayment.invoice_number}`}
          description={`Outstanding Balance: ${formatCurrency(selectedInvoiceForPayment.balance_due)}`}
          maxWidth="md"
        >
          <form onSubmit={handleRecordPayment} className="space-y-4">
            {payError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
                {payError}
              </div>
            )}

            <Input
              label="Payment Amount ($)"
              type="number"
              step="0.01"
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="e.g. 500.00"
              helperText={`Maximum payable: ${formatCurrency(selectedInvoiceForPayment.balance_due)} (Overpayments prevented)`}
            />

            <Select
              label="Payment Method"
              required
              value={payMethod}
              onChange={(e: any) => setPayMethod(e.target.value)}
              options={[
                { label: 'Bank Transfer (Wire / NEFT)', value: 'BANK_TRANSFER' },
                { label: 'UPI', value: 'UPI' },
                { label: 'Card (Manual Terminal)', value: 'CARD' },
                { label: 'Cash', value: 'CASH' },
                { label: 'Other', value: 'OTHER' },
              ]}
            />

            <Input
              label="Transaction / Reference # (Optional)"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="e.g. WIRE-889123 or UPI-TXN-12345"
            />

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Payment Notes</label>
              <textarea
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                rows={2}
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Bank receipt, branch notes..."
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isRecordingPayment}>
                Submit Payment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Manual Invoice Creation Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Manual Invoice"
        description="Draft a custom or ad-hoc invoice."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Customer"
              required
              value={formInv.customer}
              onChange={(e) => setFormInv({ ...formInv, customer: e.target.value })}
              options={customers.map((c) => ({
                label: `${c.company || c.name} (${c.reference})`,
                value: c.id,
              }))}
            />
            <Input
              label="Due Date"
              type="date"
              required
              value={formInv.due_date}
              onChange={(e) => setFormInv({ ...formInv, due_date: e.target.value })}
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200/80">
            <p className="text-xs font-bold text-slate-800">Invoice Line Item</p>
            <Input
              label="Item / Service Name"
              required
              value={formInv.product_name}
              onChange={(e) => setFormInv({ ...formInv, product_name: e.target.value })}
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                label="Quantity"
                type="number"
                min="1"
                required
                value={formInv.quantity}
                onChange={(e) => setFormInv({ ...formInv, quantity: parseInt(e.target.value) || 1 })}
              />
              <Input
                label="Unit Price ($)"
                type="number"
                step="0.01"
                required
                value={formInv.unit_price}
                onChange={(e) => setFormInv({ ...formInv, unit_price: e.target.value })}
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 -mt-2">Taxes are added automatically from the configured tax rules. Invoices start as Draft until confirmed.</p>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Invoice Notes</label>
            <textarea
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
              value={formInv.notes}
              onChange={(e) => setFormInv({ ...formInv, notes: e.target.value })}
              placeholder="Payment instructions, bank info..."
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Create Draft Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Draft Invoice */}
      {editInv && (
        <Modal isOpen={!!editInv} onClose={() => setEditInv(null)} title={`Edit Draft ${editInv.number}`} description="Only draft invoices can be edited. Totals and taxes are recalculated by the system." maxWidth="md">
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">{editError}</div>}
            <Input label="Due Date" type="date" required value={editInv.due_date} onChange={(e) => setEditInv({ ...editInv, due_date: e.target.value })} />
            {editInv.single ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3"><Input label="Item / Service" required value={editInv.product_name} onChange={(e) => setEditInv({ ...editInv, product_name: e.target.value })} /></div>
                <Input label="Quantity" type="number" min="1" required value={editInv.quantity} onChange={(e) => setEditInv({ ...editInv, quantity: parseInt(e.target.value) || 1 })} />
                <Input label="Unit Price ($)" type="number" step="0.01" required value={editInv.unit_price} onChange={(e) => setEditInv({ ...editInv, unit_price: e.target.value })} />
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">This draft has several generated lines; only the due date and notes can be edited.</p>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Notes</label>
              <textarea className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" rows={2} value={editInv.notes} onChange={(e) => setEditInv({ ...editInv, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setEditInv(null)}>Cancel</Button>
              <Button type="submit" isLoading={isEditing}>Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

