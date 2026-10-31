import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  LayoutList,
  Link2,
  Plus,
  Search,
  Table as TableIcon,
  X,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { Invoice, Customer, InvoiceStatus, PaymentMethodType } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { getInvoiceStatus } from './invoiceStatus'

const fieldClass =
  'w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 hover:border-slate-300 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 transition-colors'
const labelClass = 'block text-xs font-medium text-slate-700 mb-1.5'

export const InvoicesPage: React.FC = () => {
  const { isStaff } = useAuth()
  const [searchParams] = useSearchParams()
  const statusParam = searchParams.get('status')

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  // Filters
  const [activeTab, setActiveTab] = useState<'ALL' | 'DRAFT' | 'UNPAID'>('UNPAID')
  const [search, setSearch] = useState('')
  const [customerFilter, setCustomerFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState(statusParam || 'ALL')

  useEffect(() => {
    if (statusParam === 'OVERDUE') {
      setStatusFilter('OVERDUE')
      setActiveTab('UNPAID')
    } else if (statusParam === 'UNPAID') {
      setActiveTab('UNPAID')
      setStatusFilter('ALL')
    } else if (statusParam) {
      setStatusFilter(statusParam)
    }
  }, [statusParam])
  const [showTableView, setShowTableView] = useState(false)

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSavingInvoice, setIsSavingInvoice] = useState(false)
  const [formInv, setFormInv] = useState({
    customer: '',
    due_date: '',
    notes: '',
    product_name: 'Product Consulting & Advisory',
    quantity: 1,
    unit_price: '2500.00',
    tax_amount: '0.00',
  })

  // Add Item to existing invoice Modal
  const [isAddItemOpen, setIsAddItemOpen] = useState(false)
  const [isSavingItem, setIsSavingItem] = useState(false)
  const [newItemForm, setNewItemForm] = useState({
    product_name: '',
    quantity: 1,
    unit_price: '500.00',
    discount_amount: '0.00',
    tax_amount: '0.00',
  })

  // Payment Recording Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethodType>('BANK_TRANSFER')
  const [payRef, setPayRef] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [isRecordingPayment, setIsRecordingPayment] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 5000)
  }

  const fetchInvoices = async () => {
    setIsLoading(true)
    try {
      let url = '/invoices/'
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (customerFilter !== 'ALL') params.append('customer', customerFilter)
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (params.toString()) url += `?${params.toString()}`

      const res = await api.get(url)
      const data: Invoice[] = res.data.results || res.data
      setInvoices(data)

      // Retain or select active invoice
      if (data.length > 0) {
        setSelectedInvoice((prev) => {
          if (!prev) return data[0]
          const found = data.find((inv) => inv.id === prev.id)
          return found || data[0]
        })
      } else {
        setSelectedInvoice(null)
      }
    } catch (err) {
      console.error('Failed to load invoices:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCustomers = async () => {
    try {
      const res = await api.get('/customers/')
      setCustomers(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchInvoices()
    loadCustomers()
  }, [search, customerFilter, statusFilter])

  // Filtered invoices by active workbench tabs
  const workbenchInvoices = useMemo(() => {
    if (activeTab === 'DRAFT') {
      return invoices.filter((i) => i.status === 'DRAFT')
    }
    if (activeTab === 'UNPAID') {
      return invoices.filter((i) => ['CONFIRMED', 'PARTIALLY_PAID', 'OVERDUE'].includes(i.status) && Number(i.balance_due) > 0)
    }
    return invoices
  }, [invoices, activeTab])

  // Summary figures, computed only from the loaded invoices.
  const metrics = useMemo(() => {
    const now = new Date()
    const thirtyDaysOut = new Date()
    thirtyDaysOut.setDate(now.getDate() + 30)

    const isOpen = (i: Invoice) => i.status !== 'DRAFT' && i.status !== 'CANCELLED' && Number(i.balance_due) > 0
    const overdueInvoices = invoices.filter((i) => isOpen(i) && (i.status === 'OVERDUE' || new Date(i.due_date) < now))
    const dueSoon = invoices.filter((i) => {
      const d = new Date(i.due_date)
      return isOpen(i) && d >= now && d <= thirtyDaysOut
    })

    return {
      overdueTotal: overdueInvoices.reduce((acc, curr) => acc + Number(curr.balance_due || 0), 0),
      overdueCount: overdueInvoices.length,
      dueNextMonthTotal: dueSoon.reduce((acc, curr) => acc + Number(curr.balance_due || 0), 0),
      dueNextMonthCount: dueSoon.length,
      collectedTotal: invoices.reduce((acc, curr) => acc + Number(curr.paid_amount || 0), 0),
      openBalance: invoices.filter(isOpen).reduce((acc, curr) => acc + Number(curr.balance_due || 0), 0),
      draftCount: invoices.filter((i) => i.status === 'DRAFT').length,
      unpaidCount: invoices.filter((i) => ['CONFIRMED', 'PARTIALLY_PAID', 'OVERDUE'].includes(i.status) && Number(i.balance_due) > 0).length,
    }
  }, [invoices])

  const openCreateModal = () => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    setFormInv({
      customer: customers[0]?.id ? String(customers[0].id) : '',
      due_date: d.toISOString().split('T')[0],
      notes: 'Payment due within 30 days of issue.',
      product_name: 'Product Consulting & Advisory',
      quantity: 1,
      unit_price: '2500.00',
      tax_amount: '0.00',
    })
    setIsCreateOpen(true)
  }

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingInvoice(true)
    try {
      const res = await api.post('/invoices/', {
        customer: Number(formInv.customer),
        due_date: formInv.due_date,
        notes: formInv.notes,
        items: [
          {
            product_name: formInv.product_name,
            quantity: Number(formInv.quantity) || 1,
            unit_price: formInv.unit_price,
            tax_amount: formInv.tax_amount,
          },
        ],
      })
      setIsCreateOpen(false)
      await fetchInvoices()
      setSelectedInvoice(res.data)
      showToast(`Invoice ${res.data.invoice_number} created successfully!`)
    } catch (err: any) {
      showToast(`Creation error: ${err?.response?.data?.detail || err.message}`)
    } finally {
      setIsSavingInvoice(false)
    }
  }

  const handleDownloadPDF = async (inv?: Invoice | null) => {
    const target = inv || selectedInvoice
    if (!target) return
    try {
      const res = await api.get(`/invoices/${target.id}/pdf/`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${target.invoice_number}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      showToast(`Downloaded PDF for ${target.invoice_number}`)
    } catch (err: any) {
      showToast('PDF download failed.')
    }
  }

  const handleConfirmInvoice = async (inv?: Invoice | null) => {
    const target = inv || selectedInvoice
    if (!target) return
    try {
      const res = await api.post(`/invoices/${target.id}/confirm/`)
      await fetchInvoices()
      setSelectedInvoice(res.data)
      showToast(`Invoice ${target.invoice_number} confirmed & activated.`)
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Could not confirm invoice.')
    }
  }

  const handleAddItemToInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInvoice) return
    setIsSavingItem(true)
    try {
      const res = await api.post(`/invoices/${selectedInvoice.id}/add-item/`, {
        product_name: newItemForm.product_name,
        quantity: Number(newItemForm.quantity) || 1,
        unit_price: newItemForm.unit_price,
        discount_amount: newItemForm.discount_amount,
        tax_amount: newItemForm.tax_amount,
      })
      setIsAddItemOpen(false)
      setSelectedInvoice(res.data)
      await fetchInvoices()
      showToast(`Added '${newItemForm.product_name}' to ${selectedInvoice.invoice_number}!`)
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to add item.')
    } finally {
      setIsSavingItem(false)
    }
  }

  const openPaymentModal = (inv?: Invoice | null) => {
    const target = inv || selectedInvoice
    if (!target) return
    setPayAmount(String(target.balance_due))
    setPayMethod('BANK_TRANSFER')
    setPayRef('')
    setPayNotes('')
    setPayError(null)
    setIsPaymentModalOpen(true)
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInvoice) return
    setIsRecordingPayment(true)
    setPayError(null)
    try {
      await api.post('/payments/', {
        invoice: selectedInvoice.id,
        amount: payAmount,
        payment_method: payMethod,
        transaction_reference: payRef,
        notes: payNotes,
      })
      setIsPaymentModalOpen(false)
      await fetchInvoices()
      showToast(`Payment of $${payAmount} allocated to ${selectedInvoice.invoice_number}!`)
    } catch (err: any) {
      const resp = err?.response?.data
      setPayError(resp?.non_field_errors?.[0] || resp?.amount?.[0] || resp?.detail || 'Payment processing error.')
    } finally {
      setIsRecordingPayment(false)
    }
  }

  const copyInvoiceLink = () => {
    if (!selectedInvoice) return
    const url = `${window.location.origin}/invoices?invoice=${selectedInvoice.invoice_number}`
    navigator.clipboard.writeText(url)
    showToast(`Payment link for ${selectedInvoice.invoice_number} copied to clipboard!`)
  }

  const calculateRelativeDueDate = (dueDateStr: string, status: InvoiceStatus) => {
    if (status === 'PAID') return 'Settled'
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDateStr)
    due.setHours(0, 0, 0, 0)
    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return `Overdue ${Math.abs(diffDays)}d`
    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'In 1 day'
    return `In ${diffDays} days`
  }

  // Customers never see drafts, so their views and figures leave them out.
  const tabs = [
    { key: 'UNPAID' as const, label: 'Unpaid', count: metrics.unpaidCount },
    ...(isStaff ? [{ key: 'DRAFT' as const, label: 'Draft', count: metrics.draftCount }] : []),
    { key: 'ALL' as const, label: 'All', count: invoices.length },
  ]

  const summary = [
    {
      label: 'Overdue',
      value: formatCurrency(metrics.overdueTotal),
      hint: `${metrics.overdueCount} ${metrics.overdueCount === 1 ? 'invoice' : 'invoices'}`,
      danger: metrics.overdueCount > 0,
    },
    {
      label: 'Due in the next 30 days',
      value: formatCurrency(metrics.dueNextMonthTotal),
      hint: `${metrics.dueNextMonthCount} ${metrics.dueNextMonthCount === 1 ? 'invoice' : 'invoices'}`,
    },
    { label: 'Collected', value: formatCurrency(metrics.collectedTotal), hint: 'Payments applied to invoices' },
    isStaff
      ? { label: 'Drafts', value: String(metrics.draftCount), hint: 'Not yet confirmed' }
      : {
          label: 'Open balance',
          value: formatCurrency(metrics.openBalance),
          hint: `${metrics.unpaidCount} unpaid ${metrics.unpaidCount === 1 ? 'invoice' : 'invoices'}`,
        },
  ]

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      {toastMessage && (
        <div
          role="status"
          className="fixed right-4 top-20 z-50 flex max-w-sm items-start gap-3 rounded-xl bg-navy-900 px-4 py-3 text-sm text-white shadow-lg sm:right-8"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary-200" />
          <span className="flex-1">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="-mr-1 rounded-full p-0.5 text-white/60 hover:text-white"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
          <p className="mt-1 text-sm text-slate-500">Track what’s been billed, what’s due and what’s been paid.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTableView(!showTableView)}
            aria-pressed={showTableView}
          >
            {showTableView ? (
              <LayoutList className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <TableIcon className="mr-1.5 h-3.5 w-3.5" />
            )}
            {showTableView ? 'Detail view' : 'Table view'}
          </Button>
          {isStaff && (
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New invoice
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <Card className="grid grid-cols-2 gap-px overflow-hidden bg-slate-100 lg:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="bg-white px-5 py-5">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p
              className={cn(
                'mt-1.5 text-2xl font-semibold tracking-tight tabular-nums text-slate-900',
                item.danger && 'text-red-700',
              )}
            >
              {item.value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{item.hint}</p>
          </div>
        ))}
      </Card>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
{isStaff && (
            <>
          <label className="sr-only" htmlFor="invoice-customer-filter">Customer</label>
          <select
            id="invoice-customer-filter"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="h-9 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-primary-500/15"
          >
            <option value="ALL">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company || c.name}
              </option>
            ))}
          </select>
            </>
          )}
          <label className="sr-only" htmlFor="invoice-status-filter">Status</label>
          <select
            id="invoice-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-primary-500/15"
          >
            <option value="ALL">All statuses</option>
            <option value="CONFIRMED">Due / Confirmed</option>
            <option value="OVERDUE">Overdue</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="DRAFT">Draft (Unsent)</option>
          </select>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice number"
            aria-label="Search invoices"
            className="h-9 rounded-full pl-9 text-xs"
          />
        </div>
      </div>

      {!showTableView ? (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* List */}
          <Card className="overflow-hidden lg:col-span-5">
            <div className="border-b border-slate-100 p-3">
              <div className="flex rounded-full bg-slate-100 p-1" role="tablist" aria-label="Invoice views">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-medium transition-colors',
                      activeTab === tab.key
                        ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(31,51,39,0.08)]'
                        : 'text-slate-500 hover:text-slate-900',
                    )}
                  >
                    {tab.label}
                    <span className="tabular-nums text-slate-400">{tab.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : workbenchInvoices.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <FileText className="mx-auto h-5 w-5 text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-900">No invoices here</p>
                <p className="mt-1 text-xs text-slate-500">Try another view or adjust the filters above.</p>
              </div>
            ) : (
              <ul className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
                {workbenchInvoices.map((inv) => {
                  const isSelected = selectedInvoice?.id === inv.id
                  const status = getInvoiceStatus(inv.status, inv.is_overdue)
                  return (
                    <li key={inv.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(inv)}
                        aria-current={isSelected ? 'true' : undefined}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors',
                          isSelected ? 'bg-primary-50' : 'hover:bg-slate-50',
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{inv.invoice_number}</p>
                          <p className="truncate text-xs text-slate-500">
                            {inv.customer_details?.company || inv.customer_details?.name || '-'} ·{' '}
                            {calculateRelativeDueDate(inv.due_date, inv.status)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-sm font-medium tabular-nums text-slate-900">
                            {formatCurrency(inv.total_amount)}
                          </span>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {/* Detail */}
          <Card className="lg:col-span-7">
            {isLoading ? (
              <div className="space-y-4 p-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : !selectedInvoice ? (
              <div className="px-6 py-20 text-center text-sm text-slate-500">
                Select an invoice to see its details.
              </div>
            ) : (
              (() => {
                const status = getInvoiceStatus(selectedInvoice.status, selectedInvoice.is_overdue)
                const customer = selectedInvoice.customer_details
                const items = selectedInvoice.items ?? []
                return (
                  <div>
                    {/* Detail header */}
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                            {selectedInvoice.invoice_number}
                          </h2>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {customer?.company || customer?.name || 'Unknown customer'}
                          {customer?.company && customer?.name ? ` · ${customer.name}` : ''}
                        </p>
                        {customer?.email && <p className="text-xs text-slate-500">{customer.email}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={copyInvoiceLink}
                          className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          aria-label="Copy invoice link"
                          title="Copy invoice link"
                        >
                          <Link2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(selectedInvoice)}
                          className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          aria-label="Download PDF"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Dates */}
                    <dl className="grid grid-cols-2 gap-4 border-b border-slate-100 px-6 py-4 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-xs text-slate-500">Issued</dt>
                        <dd className="mt-0.5 text-slate-900">{formatDate(selectedInvoice.issue_date)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Due</dt>
                        <dd className="mt-0.5 text-slate-900">
                          {formatDate(selectedInvoice.due_date)}
                          <span className="ml-1.5 text-xs text-slate-500">
                            {calculateRelativeDueDate(selectedInvoice.due_date, selectedInvoice.status)}
                          </span>
                        </dd>
                      </div>
                      {selectedInvoice.billing_period_start && (
                        <div>
                          <dt className="text-xs text-slate-500">Billing period</dt>
                          <dd className="mt-0.5 text-slate-900">
                            {formatDate(selectedInvoice.billing_period_start)} – {formatDate(selectedInvoice.billing_period_end)}
                          </dd>
                        </div>
                      )}
                    </dl>

                    {/* Line items */}
                    <div className="px-6 py-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Line items</h3>
                        {isStaff && selectedInvoice.status !== 'PAID' && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewItemForm({
                                product_name: 'Extended Support & SLA',
                                quantity: 1,
                                unit_price: '750.00',
                                discount_amount: '0.00',
                                tax_amount: '0.00',
                              })
                              setIsAddItemOpen(true)
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-700"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add item
                          </button>
                        )}
                      </div>
                      {items.length === 0 ? (
                        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                          No line items on this invoice yet.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="bl-wrap-table w-full text-left text-[13px]">
                            <thead className="border-b">
                              <tr>
                                <th className="pr-3 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 whitespace-nowrap">Item</th>
                                <th className="px-3 text-right py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 whitespace-nowrap">Qty</th>
                                <th className="px-3 text-right py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 whitespace-nowrap">Unit price</th>
                                <th className="pl-3 text-right py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 whitespace-nowrap">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {items.map((item, idx) => (
                                <tr key={item.id || idx}>
                                  <td className="py-2.5 pr-3 text-slate-900">
                                    {item.product_name}
                                    {item.variant_name && (
                                      <span className="block text-xs text-slate-500">{item.variant_name}</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{item.quantity}</td>
                                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{formatCurrency(item.unit_price)}</td>
                                  <td className="py-2.5 pl-3 text-right font-medium tabular-nums text-slate-900">
                                    {formatCurrency(item.line_total)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Totals & action */}
                    <div className="flex flex-col gap-5 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
                      <dl className="grid grid-cols-3 gap-x-8 gap-y-1 text-sm">
                        <dt className="text-xs text-slate-500">Subtotal</dt>
                        <dt className="text-xs text-slate-500">Total</dt>
                        <dt className="text-xs text-slate-500">Balance due</dt>
                        <dd className="tabular-nums text-slate-700">{formatCurrency(selectedInvoice.subtotal)}</dd>
                        <dd className="tabular-nums text-slate-700">{formatCurrency(selectedInvoice.total_amount)}</dd>
                        <dd className="text-base font-semibold tabular-nums text-slate-900">
                          {formatCurrency(selectedInvoice.balance_due)}
                        </dd>
                      </dl>

                      {selectedInvoice.status === 'DRAFT' && isStaff ? (
                        <Button onClick={() => handleConfirmInvoice(selectedInvoice)}>Confirm invoice</Button>
                      ) : Number(selectedInvoice.balance_due) > 0 && isStaff ? (
                        <Button onClick={() => openPaymentModal(selectedInvoice)}>Record payment</Button>
                      ) : (
                        <Button variant="outline" onClick={() => handleDownloadPDF(selectedInvoice)}>
                          <Download className="mr-1.5 h-4 w-4" />
                          {selectedInvoice.status === 'PAID' ? 'Download receipt' : 'Download PDF'}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })()
            )}
          </Card>
        </div>
      ) : (
        /* Table view */
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <p className="px-6 py-14 text-center text-sm text-slate-500">No invoices match these filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b">
                  <tr>
                    <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 whitespace-nowrap">Invoice</th>
                    <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 whitespace-nowrap">Customer</th>
                    <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 whitespace-nowrap">Issued</th>
                    <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 whitespace-nowrap">Due</th>
                    <th className="px-5 text-right py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 whitespace-nowrap">Total</th>
                    <th className="px-5 text-right py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 whitespace-nowrap">Balance</th>
                    <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 whitespace-nowrap">Status</th>
                    <th className="px-5 text-right py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 whitespace-nowrap"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => {
                    const status = getInvoiceStatus(inv.status, inv.is_overdue)
                    return (
                      <tr key={inv.id}>
                        <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-900">{inv.invoice_number}</td>
                        <td className="px-5 py-3 text-slate-600">{inv.customer_details?.company || inv.customer_details?.name}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">{formatDate(inv.issue_date)}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">{formatDate(inv.due_date)}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-slate-900">{formatCurrency(inv.total_amount)}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right font-medium tabular-nums text-slate-900">{formatCurrency(inv.balance_due)}</td>
                        <td className="px-5 py-3">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDownloadPDF(inv)}
                            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            aria-label={`Download PDF for ${inv.invoice_number}`}
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modal: Create Invoice */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New invoice" maxWidth="lg">
        <form onSubmit={handleCreateInvoice} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="invoice-customer">Customer</label>
              <select
                id="invoice-customer"
                value={formInv.customer}
                onChange={(e) => setFormInv({ ...formInv, customer: e.target.value })}
                required
                className={fieldClass}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company ? `${c.company} (${c.name})` : c.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Due date"
              type="date"
              value={formInv.due_date}
              onChange={(e) => setFormInv({ ...formInv, due_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">First line item</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Input
                  label="Description / Product"
                  value={formInv.product_name}
                  onChange={(e) => setFormInv({ ...formInv, product_name: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Price ($)"
                type="number"
                step="0.01"
                value={formInv.unit_price}
                onChange={(e) => setFormInv({ ...formInv, unit_price: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="invoice-notes">Notes</label>
            <textarea
              id="invoice-notes"
              value={formInv.notes}
              onChange={(e) => setFormInv({ ...formInv, notes: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 hover:border-slate-300 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSavingInvoice}>
              Create invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Line Item */}
      <Modal isOpen={isAddItemOpen} onClose={() => setIsAddItemOpen(false)} title={`Add item to ${selectedInvoice?.invoice_number ?? 'invoice'}`}>
        <form onSubmit={handleAddItemToInvoice} className="space-y-4">
          <Input
            label="Item description"
            value={newItemForm.product_name}
            onChange={(e) => setNewItemForm({ ...newItemForm, product_name: e.target.value })}
            placeholder="e.g. Design Consulting, Cloud Infrastructure"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity"
              type="number"
              min={1}
              value={newItemForm.quantity}
              onChange={(e) => setNewItemForm({ ...newItemForm, quantity: Number(e.target.value) })}
              required
            />
            <Input
              label="Unit price ($)"
              type="number"
              step="0.01"
              value={newItemForm.unit_price}
              onChange={(e) => setNewItemForm({ ...newItemForm, unit_price: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsAddItemOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSavingItem}>
              Add to invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Record Payment */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={`Record payment for ${selectedInvoice?.invoice_number ?? 'invoice'}`}>
        <form onSubmit={handleRecordPayment} className="space-y-4">
          {payError && (
            <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-xs text-red-700">
              <AlertCircle className="mt-px h-4 w-4 shrink-0" />
              {payError}
            </div>
          )}

          <div>
            <Input
              label="Payment amount ($)"
              type="number"
              step="0.01"
              max={Number(selectedInvoice?.balance_due || 0)}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Remaining balance: {formatCurrency(selectedInvoice?.balance_due || 0)}
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="payment-method">Payment method</label>
            <select
              id="payment-method"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethodType)}
              className={fieldClass}
            >
              <option value="BANK_TRANSFER">Bank Wire / ACH</option>
              <option value="CARD">Credit Card (Stripe)</option>
              <option value="UPI">UPI Instant</option>
              <option value="CASH">Cash Settlement</option>
              <option value="OTHER">PayPal / Digital Wallet</option>
            </select>
          </div>

          <Input
            label="Transaction reference / Cheque #"
            value={payRef}
            onChange={(e) => setPayRef(e.target.value)}
            placeholder="e.g. TXN-948274 or STRIPE_CH_9281"
          />

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isRecordingPayment}>
              Record payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
