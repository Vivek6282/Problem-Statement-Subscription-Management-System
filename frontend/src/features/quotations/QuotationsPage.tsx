import React, { useState, useEffect, useRef } from 'react'
import {
  FileCheck,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  ArrowRight,
  Eye,
  FileText,
  Send,
  Check,
  X as XIcon,
  Trash2,
  Layers,
  Pencil,
} from 'lucide-react'
import { api, fetchAll, getApiError } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Quotation, Customer, Plan, Product, QuotationStatus, Discount, QuotationTemplate, PaymentTerms } from '@/types'
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

export const QuotationsPage: React.FC = () => {
  const { isStaff } = useAuth()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [ordering, setOrdering] = useState('-created_at')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const lastFilterKey = useRef('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Create Quotation Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null)
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [templates, setTemplates] = useState<QuotationTemplate[]>([])

  const [formQuote, setFormQuote] = useState({
    customer: '',
    template: '',
    plan: '',
    validity_days: 30,
    payment_terms: 'NET_30' as PaymentTerms,
    selectedProduct: '',
    quantity: 1,
    discount: '',
    notes: '',
  })

  // Quotation template manager
  const emptyTplLine = { product: '', variant: '', quantity: 1 }
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const [tplForm, setTplForm] = useState({ name: '', plan: '', validity_days: 30, payment_terms: 'NET_30' as PaymentTerms, lines: [emptyTplLine] })
  const [tplError, setTplError] = useState<string | null>(null)
  const [isSavingTpl, setIsSavingTpl] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  // Detail Modal
  const [detailQuote, setDetailQuote] = useState<Quotation | null>(null)

  const fetchQuotations = async () => {
    setIsLoading(true)
    try {
      let url = '/quotations/'
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      params.append('page', String(page))
      if (ordering) params.append('ordering', ordering)
      if (dateFrom) params.append('issue_date__gte', dateFrom)
      if (dateTo) params.append('issue_date__lte', dateTo)
      if (params.toString()) url += `?${params.toString()}`

      const res = await api.get(url)
      setQuotations(res.data.results || res.data)
      setCount(res.data.count ?? (res.data.results || res.data).length)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPrerequisites = async () => {
    try {
      const [cRows, pRows, prRows, dRows, tRows] = await Promise.all([
        fetchAll<Customer>('/customers/', { status: 'ACTIVE' }),
        fetchAll<Plan>('/plans/', { is_active: 'true' }),
        fetchAll<Product>('/products/', { is_active: 'true' }),
        fetchAll<Discount>('/discounts/', { is_active: 'true' }),
        fetchAll<QuotationTemplate>('/quotations/templates/', { is_active: 'true' }),
      ])
      setCustomers(cRows)
      setPlans(pRows)
      setProducts(prRows)
      setDiscounts(dRows)
      setTemplates(tRows)
      return { cRows, pRows }
    } catch (err) {
      console.error(err)
      return { cRows: [] as Customer[], pRows: [] as Plan[] }
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
    fetchQuotations()
  }, [search, statusFilter, ordering, dateFrom, dateTo, page])

  const openEditModal = async (q: Quotation) => {
    await loadPrerequisites()
    const first = q.items && q.items.length === 1 ? q.items[0] : null
    setEditingQuote(q)
    setFormQuote({
      customer: String(q.customer),
      template: '',
      plan: q.plan ? String(q.plan) : '',
      validity_days: q.validity_days,
      payment_terms: (q.payment_terms || 'NET_30') as PaymentTerms,
      selectedProduct: first ? String(first.product) : '',
      quantity: first ? first.quantity : 1,
      discount: q.discount ? String(q.discount) : '',
      notes: q.notes || '',
    })
    setFormError(null)
    setIsCreateOpen(true)
  }

  const openCreateModal = async () => {
    setEditingQuote(null)
    const { cRows, pRows } = await loadPrerequisites()
    setFormQuote({
      customer: cRows[0]?.id ? String(cRows[0].id) : '',
      template: '',
      plan: pRows[0]?.id ? String(pRows[0].id) : '',
      validity_days: 30,
      payment_terms: 'NET_30',
      selectedProduct: '',
      quantity: 1,
      discount: '',
      notes: '',
    })
    setFormError(null)
    setIsCreateOpen(true)
  }

  const applyTemplate = (templateId: string) => {
    const tpl = templates.find((t) => t.id === Number(templateId))
    setFormQuote((f) => ({
      ...f,
      template: templateId,
      ...(tpl
        ? { plan: tpl.plan ? String(tpl.plan) : f.plan, validity_days: tpl.validity_days, payment_terms: tpl.payment_terms, selectedProduct: '' }
        : {}),
    }))
  }

  const selectedTemplate = templates.find((t) => t.id === Number(formQuote.template))

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFormError(null)

    // Only what the user chose is sent. Prices, discounts amounts and taxes are always calculated by the server.
    const payload: Record<string, unknown> = {
      customer: Number(formQuote.customer),
      plan: formQuote.plan ? Number(formQuote.plan) : null,
      validity_days: Number(formQuote.validity_days),
      payment_terms: formQuote.payment_terms,
      notes: formQuote.notes,
    }
    if (formQuote.template && !editingQuote) payload.template = Number(formQuote.template)
    payload.discount = formQuote.discount ? Number(formQuote.discount) : null
    if (formQuote.selectedProduct) {
      payload.items = [{ product: Number(formQuote.selectedProduct), quantity: Number(formQuote.quantity) || 1 }]
    } else if (!formQuote.template && (!editingQuote || (editingQuote.items?.length ?? 0) <= 1)) {
      payload.items = []
    }

    try {
      if (editingQuote) {
        payload.customer = Number(formQuote.customer)
        await api.patch(`/quotations/${editingQuote.id}/`, payload)
      } else {
        await api.post('/quotations/', payload)
      }
      setIsCreateOpen(false)
      fetchQuotations()
      setActionNotice(editingQuote ? 'Quotation updated and recalculated.' : 'Quotation generated successfully.')
      setTimeout(() => setActionNotice(null), 5000)
    } catch (err: any) {
      setFormError(getApiError(err, editingQuote ? 'Failed to update quotation.' : 'Failed to create quotation.'))
    } finally {
      setIsSaving(false)
    }
  }

  const runAction = async (quote: Quotation, action: 'send' | 'accept' | 'reject' | 'convert_to_subscription', okMessage: string) => {
    try {
      const res = await api.post(`/quotations/${quote.id}/${action}/`)
      setActionNotice(action === 'convert_to_subscription' ? res.data.message + ` (${res.data.subscription_number})` : okMessage)
      fetchQuotations()
      if (detailQuote?.id === quote.id) setDetailQuote(null)
    } catch (err) {
      setActionNotice(`Error: ${getApiError(err)}`)
    }
    setTimeout(() => setActionNotice(null), 6000)
  }

  const handleConvert = (quote: Quotation) => {
    if (!confirm(`Confirm quotation ${quote.quotation_number}? This creates its subscription in the Confirmed stage (activate it separately to start billing).`)) return
    runAction(quote, 'convert_to_subscription', '')
  }

  const handleDeleteDraft = async (quote: Quotation) => {
    if (!confirm(`Delete draft quotation ${quote.quotation_number}? This cannot be undone.`)) return
    try {
      await api.delete(`/quotations/${quote.id}/`)
      setActionNotice(`Draft ${quote.quotation_number} deleted.`)
      fetchQuotations()
    } catch (err) {
      setActionNotice(`Error: ${getApiError(err)}`)
    }
    setTimeout(() => setActionNotice(null), 5000)
  }

  const openTemplates = async () => {
    await loadPrerequisites()
    setTplForm({ name: '', plan: '', validity_days: 30, payment_terms: 'NET_30', lines: [emptyTplLine] })
    setTplError(null)
    setIsTemplatesOpen(true)
  }

  const saveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingTpl(true)
    setTplError(null)
    try {
      await api.post('/quotations/templates/', {
        name: tplForm.name,
        plan: tplForm.plan ? Number(tplForm.plan) : null,
        validity_days: Number(tplForm.validity_days),
        payment_terms: tplForm.payment_terms,
        items: tplForm.lines
          .filter((l) => l.product)
          .map((l) => ({ product: Number(l.product), variant: l.variant ? Number(l.variant) : null, quantity: Number(l.quantity) || 1 })),
      })
      setTplForm({ name: '', plan: '', validity_days: 30, payment_terms: 'NET_30', lines: [emptyTplLine] })
      setTemplates(await fetchAll<QuotationTemplate>('/quotations/templates/', { is_active: 'true' }))
      setActionNotice('Template saved.')
      setTimeout(() => setActionNotice(null), 4000)
    } catch (err) {
      setTplError(getApiError(err, 'Could not save the template.'))
    } finally {
      setIsSavingTpl(false)
    }
  }

  const deleteTemplate = async (tpl: QuotationTemplate) => {
    if (!confirm(`Remove template "${tpl.name}"? Templates already used by quotations are archived instead of deleted.`)) return
    try {
      await api.delete(`/quotations/templates/${tpl.id}/`)
      setTemplates(await fetchAll<QuotationTemplate>('/quotations/templates/', { is_active: 'true' }))
    } catch (err) {
      setTplError(getApiError(err))
    }
  }

  const handleDownloadPDF = async (quote: Quotation) => {
    try {
      const res = await api.get(`/quotations/${quote.id}/pdf/`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${quote.quotation_number}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error('PDF download error:', err)
    }
  }

  const getStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case 'ACCEPTED':
        return <Badge variant="success">Accepted</Badge>
      case 'SENT':
        return <Badge variant="info">Sent</Badge>
      case 'CONVERTED':
        return <Badge variant="default">Converted</Badge>
      case 'DRAFT':
        return <Badge variant="neutral">Draft</Badge>
      case 'REJECTED':
      case 'EXPIRED':
        return <Badge variant="danger">{status}</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            {isStaff ? 'Quotations & Proposals' : 'Your quotations'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isStaff
              ? 'Generate automated estimates, PDF proposals, and one-click subscription conversions'
              : 'Proposals prepared for you. Download any of them as a PDF.'}
          </p>
        </div>
        {isStaff && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openTemplates}>
              <Layers className="w-4 h-4 mr-1.5" />
              Templates
            </Button>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-1.5" />
              New Quotation
            </Button>
          </div>
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
              placeholder="Search quotation #, client..."
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
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="CONVERTED">Converted</option>
              <option value="REJECTED">Rejected</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </CardContent>
        <CardContent className="px-4 pb-4 pt-3 border-t border-slate-100">
          <TableControls
            orderingOptions={[{ label: 'Newest first', value: '-created_at' }, { label: 'Highest total', value: '-total_amount' }, { label: 'Expiring soonest', value: 'expiry_date' }]}
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

      {/* Quotations Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : quotations.length === 0 ? (
        <EmptyState
          title="No quotations yet"
          description={isStaff ? 'Prepare and export enterprise quotes.' : 'When a proposal is prepared for you, it will appear here.'}
          actionLabel={isStaff ? 'New Quotation' : undefined}
          onAction={isStaff ? openCreateModal : undefined}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Quote #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Plan / Scope</th>
                  <th className="py-3 px-4">Valid Until</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {q.quotation_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{q.customer_details?.company || q.customer_details?.name}</div>
                      <div className="text-[11px] text-slate-400">{q.customer_details?.name}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {q.plan_details?.name || 'Custom Package'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {formatDate(q.expiry_date)}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(q.status)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {formatCurrency(q.total_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDownloadPDF(q)}
                          className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary-50 rounded-lg transition-colors"
                          title="Download Official PDF" aria-label="Download Official PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDetailQuote(q)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Details" aria-label="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isStaff && q.status === 'DRAFT' && (
                          <button onClick={() => openEditModal(q)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg" title="Edit draft">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {isStaff && q.status === 'DRAFT' && (
                          <Button size="sm" variant="outline" onClick={() => runAction(q, 'send', `Quotation ${q.quotation_number} sent.`)}>
                            <Send className="w-3.5 h-3.5 mr-1" /> Send
                          </Button>
                        )}
                        {q.status === 'SENT' && (
                          <>
                            <Button size="sm" variant="success" onClick={() => runAction(q, 'accept', `Quotation ${q.quotation_number} accepted.`)}>
                              <Check className="w-3.5 h-3.5 mr-1" /> Accept
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => confirm(`Reject quotation ${q.quotation_number}?`) && runAction(q, 'reject', `Quotation ${q.quotation_number} rejected.`)}>
                              <XIcon className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {isStaff && (q.status === 'DRAFT' || q.status === 'SENT' || q.status === 'ACCEPTED') && (
                          <Button size="sm" variant="secondary" onClick={() => handleConvert(q)}>
                            <ArrowRight className="w-3.5 h-3.5 mr-1" /> Confirm
                          </Button>
                        )}
                        {isStaff && q.status === 'DRAFT' && (
                          <button onClick={() => handleDeleteDraft(q)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete draft">
                            <Trash2 className="w-4 h-4" />
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

      {/* Detail Modal */}
      {detailQuote && (
        <Modal
          isOpen={!!detailQuote}
          onClose={() => setDetailQuote(null)}
          title={`Quotation ${detailQuote.quotation_number}`}
          description={`Customer: ${detailQuote.customer_details?.company || detailQuote.customer_details?.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <p className="text-slate-500">Status</p>
                <div>{getStatusBadge(detailQuote.status)}</div>
              </div>
              <div>
                <p className="text-slate-500">Validity</p>
                <p className="font-semibold text-slate-800">{detailQuote.validity_days} Days (until {formatDate(detailQuote.expiry_date)})</p>
              </div>
              <div>
                <p className="text-slate-500">Subtotal</p>
                <p className="font-semibold text-slate-800">{formatCurrency(detailQuote.subtotal)}</p>
              </div>
              <div>
                <p className="text-slate-500">Total Price</p>
                <p className="font-bold text-primary text-base">{formatCurrency(detailQuote.total_amount)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
              <span>Payment terms: <b className="text-slate-700">{(detailQuote.payment_terms || 'NET_30').replace('_', ' ')}</b></span>
              {detailQuote.template_name && <span>Template: <b className="text-slate-700">{detailQuote.template_name}</b></span>}
              {detailQuote.subscription_number && (
                <span className="col-span-2">Subscription: <b className="text-slate-700">{detailQuote.subscription_number}</b> ({detailQuote.subscription_status})</span>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900">Quoted Line Items</h4>
              {detailQuote.plan_details && (
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex justify-between">
                  <span className="font-semibold text-slate-800">Plan: {detailQuote.plan_details.name}</span>
                  <span className="font-bold text-slate-900">{formatCurrency(detailQuote.plan_details.price)}</span>
                </div>
              )}
              {detailQuote.items && detailQuote.items.map((it) => (
                <div key={it.id} className="p-2.5 bg-white border border-slate-200 rounded-lg flex justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">{it.product_name}</span>
                    {it.variant_name && <span className="text-slate-400 ml-1">({it.variant_name})</span>}
                    <span className="text-slate-400 ml-2">x {it.quantity} @ {formatCurrency(it.unit_price)}</span>
                    {Number(it.discount_amount) > 0 && <span className="text-green-700 ml-2">-{formatCurrency(it.discount_amount)} discount</span>}
                  </div>
                  <span className="font-bold text-slate-900">{formatCurrency(it.line_total)}</span>
                </div>
              ))}
              <div className="p-2.5 bg-slate-50 rounded-lg space-y-0.5">
                <div className="flex justify-between"><span className="text-slate-500">Discounts</span><span>-{formatCurrency(detailQuote.discount_amount)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Taxes</span><span>+{formatCurrency(detailQuote.tax_amount)}</span></div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => handleDownloadPDF(detailQuote)}>
                <Download className="w-3.5 h-3.5 mr-1" /> Download PDF
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={editingQuote ? `Edit Draft ${editingQuote.quotation_number}` : 'Create New Quotation'}
        description={editingQuote ? 'Only Draft quotations can be edited. Prices, discounts and taxes are recalculated.' : 'Select customer, target plan, and optional billable items.'}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateQuotation} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
              {formError}
            </div>
          )}

          {!editingQuote && (
          <Select
            label="Start from Template (optional)"
            value={formQuote.template}
            onChange={(e: any) => applyTemplate(e.target.value)}
            options={[
              { label: '-- Build from scratch --', value: '' },
              ...templates.map((t) => ({ label: `${t.name} — valid ${t.validity_days} days`, value: t.id })),
            ]}
          />
          )}
          {!editingQuote && selectedTemplate && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-900">
              <p className="font-bold">Lines from template:</p>
              <ul className="list-disc ml-4">
                {selectedTemplate.items.map((i) => (
                  <li key={i.id}>{i.product_name}{i.variant_name ? ` (${i.variant_name})` : ''} × {i.quantity}</li>
                ))}
              </ul>
              <p className="mt-1 text-blue-700">Choosing a product below replaces these lines.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Select Customer"
              required
              value={formQuote.customer}
              onChange={(e) => setFormQuote({ ...formQuote, customer: e.target.value })}
              options={customers.map((c) => ({
                label: `${c.company || c.name} (${c.reference})`,
                value: c.id,
              }))}
            />
            <Select
              label="Associated Plan"
              value={formQuote.plan}
              onChange={(e) => setFormQuote({ ...formQuote, plan: e.target.value })}
              options={[
                { label: '-- No Recurring Plan --', value: '' },
                ...plans.map((p) => ({
                  label: `${p.name} (${formatCurrency(p.price)})`,
                  value: p.id,
                })),
              ]}
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200/80">
            <p className="text-xs font-bold text-slate-800">Product Line Item</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <select
                  value={formQuote.selectedProduct}
                  onChange={(e) => setFormQuote({ ...formQuote, selectedProduct: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatCurrency(p.sales_price)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <input
                  type="number"
                  min="1"
                  value={formQuote.quantity}
                  onChange={(e) => setFormQuote({ ...formQuote, quantity: parseInt(e.target.value) || 1 })}
                  placeholder="Qty"
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-2">
              <Select
                label="Discount (optional)"
                value={formQuote.discount}
                onChange={(e: any) => setFormQuote({ ...formQuote, discount: e.target.value })}
                options={[
                  { label: 'No discount', value: '' },
                  ...discounts.map((d) => ({
                    label: `${d.code} — ${d.name} (${d.discount_type === 'PERCENTAGE' ? d.value + '%' : formatCurrency(d.value)})`,
                    value: d.id,
                  })),
                ]}
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Unit prices (including variant adjustments), discount amounts and taxes are calculated automatically from the catalogue, discount rules and tax rules.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
          <Input
            label="Validity (Days)"
            type="number"
            min="1"
            value={formQuote.validity_days}
            onChange={(e) => setFormQuote({ ...formQuote, validity_days: parseInt(e.target.value) || 30 })}
          />
          <Select
            label="Payment Terms"
            value={formQuote.payment_terms}
            onChange={(e: any) => setFormQuote({ ...formQuote, payment_terms: e.target.value })}
            options={[
              { label: 'Net 30 Days', value: 'NET_30' },
              { label: 'Net 15 Days', value: 'NET_15' },
              { label: 'Due Immediately', value: 'IMMEDIATE' },
              { label: 'Net 60 Days', value: 'NET_60' },
            ]}
          />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Proposal Notes</label>
            <textarea
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
              value={formQuote.notes}
              onChange={(e) => setFormQuote({ ...formQuote, notes: e.target.value })}
              placeholder="Commercial terms, deliverables, notes..."
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingQuote ? 'Save Changes' : 'Generate Quotation'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quotation Templates Manager */}
      <Modal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        title="Quotation Templates"
        description="Reusable offers: plan, product lines, validity and payment terms."
        maxWidth="2xl"
      >
        <div className="space-y-5 text-xs">
          {templates.length === 0 ? (
            <p className="text-slate-500">No templates yet. Create the first one below.</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {templates.map((t) => (
                <li key={t.id} className="p-3 border border-slate-200 rounded-xl flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{t.name}</p>
                    <p className="text-slate-500">
                      {t.plan_name || 'No plan'} · valid {t.validity_days} days · {t.payment_terms.replace('_', ' ')}
                    </p>
                    <p className="text-slate-400">
                      {t.items.length === 0 ? 'No product lines' : t.items.map((i) => `${i.product_name}${i.variant_name ? ' (' + i.variant_name + ')' : ''} × ${i.quantity}`).join(', ')}
                    </p>
                  </div>
                  <button onClick={() => deleteTemplate(t)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Remove template">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={saveTemplate} className="space-y-3 pt-4 border-t border-slate-100">
            <p className="font-bold text-slate-900 text-sm">New template</p>
            {tplError && <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg">{tplError}</div>}
            <div className="grid grid-cols-2 gap-3">
              <Input label="Template name" required value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} />
              <Select
                label="Plan"
                value={tplForm.plan}
                onChange={(e: any) => setTplForm({ ...tplForm, plan: e.target.value })}
                options={[{ label: '-- No plan --', value: '' }, ...plans.map((p) => ({ label: `${p.name} (${formatCurrency(p.price)})`, value: p.id }))]}
              />
              <Input label="Validity (days)" type="number" min="1" value={tplForm.validity_days} onChange={(e) => setTplForm({ ...tplForm, validity_days: parseInt(e.target.value) || 30 })} />
              <Select
                label="Payment terms"
                value={tplForm.payment_terms}
                onChange={(e: any) => setTplForm({ ...tplForm, payment_terms: e.target.value })}
                options={[
                  { label: 'Net 30 Days', value: 'NET_30' }, { label: 'Net 15 Days', value: 'NET_15' },
                  { label: 'Due Immediately', value: 'IMMEDIATE' }, { label: 'Net 60 Days', value: 'NET_60' },
                ]}
              />
            </div>
            <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200/80">
              <p className="font-bold text-slate-800">Product lines</p>
              {tplForm.lines.map((line, idx) => {
                const prod = products.find((p) => p.id === Number(line.product))
                const setLine = (patch: Partial<typeof line>) =>
                  setTplForm({ ...tplForm, lines: tplForm.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)) })
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <select value={line.product} onChange={(e) => setLine({ product: e.target.value, variant: '' })} className="col-span-5 text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg">
                      <option value="">-- Product --</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={line.variant} onChange={(e) => setLine({ variant: e.target.value })} disabled={!prod || !prod.variants || prod.variants.length === 0} className="col-span-4 text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg disabled:bg-slate-50">
                      <option value="">No variant</option>
                      {prod?.variants?.filter((v) => v.is_active).map((v) => <option key={v.id} value={v.id}>{v.name} (+{v.price_adjustment})</option>)}
                    </select>
                    <input type="number" min="1" value={line.quantity} onChange={(e) => setLine({ quantity: parseInt(e.target.value) || 1 })} className="col-span-2 text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg" aria-label="Quantity" />
                    <button type="button" onClick={() => setTplForm({ ...tplForm, lines: tplForm.lines.filter((_, i) => i !== idx) })} className="col-span-1 p-1.5 text-slate-400 hover:text-red-600" title="Remove line">
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
              <Button type="button" size="sm" variant="outline" onClick={() => setTplForm({ ...tplForm, lines: [...tplForm.lines, emptyTplLine] })}>
                <Plus className="w-3 h-3 mr-1" /> Add line
              </Button>
            </div>
            <div className="flex justify-end">
              <Button type="submit" isLoading={isSavingTpl}>Save Template</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  )
}

