import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Quotation, Customer, Plan, Product, QuotationStatus } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

export const QuotationsPage: React.FC = () => {
  const { isStaff } = useAuth()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Create Quotation Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const [formQuote, setFormQuote] = useState({
    customer: '',
    plan: '',
    validity_days: 30,
    selectedProduct: '',
    quantity: 1,
    discount_amount: '0.00',
    tax_percentage: '18.00',
    notes: '',
  })
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
      if (params.toString()) url += `?${params.toString()}`

      const res = await api.get(url)
      setQuotations(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPrerequisites = async () => {
    try {
      const [cRes, pRes, prRes] = await Promise.all([
        api.get('/customers/'),
        api.get('/plans/'),
        api.get('/products/'),
      ])
      setCustomers(cRes.data.results || cRes.data)
      setPlans(pRes.data.results || pRes.data)
      setProducts(prRes.data.results || prRes.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchQuotations()
  }, [search, statusFilter])

  const openCreateModal = () => {
    loadPrerequisites()
    setFormQuote({
      customer: customers[0]?.id ? String(customers[0].id) : '',
      plan: plans[0]?.id ? String(plans[0].id) : '',
      validity_days: 30,
      selectedProduct: '',
      quantity: 1,
      discount_amount: '0.00',
      tax_percentage: '18.00',
      notes: '',
    })
    setFormError(null)
    setIsCreateOpen(true)
  }

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFormError(null)

    const items = []
    if (formQuote.selectedProduct) {
      const prod = products.find((p) => p.id === Number(formQuote.selectedProduct))
      if (prod) {
        items.push({
          product: prod.id,
          quantity: Number(formQuote.quantity) || 1,
          unit_price: prod.sales_price,
          discount_amount: formQuote.discount_amount,
          tax_percentage: formQuote.tax_percentage,
        })
      }
    }

    try {
      await api.post('/quotations/', {
        customer: Number(formQuote.customer),
        plan: formQuote.plan ? Number(formQuote.plan) : null,
        validity_days: Number(formQuote.validity_days),
        notes: formQuote.notes,
        items,
      })
      setIsCreateOpen(false)
      fetchQuotations()
      setActionNotice('Quotation generated successfully.')
      setTimeout(() => setActionNotice(null), 5000)
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Failed to create quotation.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleConvert = async (quote: Quotation) => {
    if (!confirm(`Convert quotation ${quote.quotation_number} into an active subscription?`)) return
    try {
      const res = await api.post(`/quotations/${quote.id}/convert_to_subscription/`)
      setActionNotice(res.data.message)
      fetchQuotations()
      setTimeout(() => setActionNotice(null), 5000)
    } catch (err: any) {
      setActionNotice(`Error: ${err?.response?.data?.error || err.message}`)
      setTimeout(() => setActionNotice(null), 5000)
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
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Quotation
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
            </select>
          </div>
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
                        {isStaff && q.status !== 'CONVERTED' && (
                          <Button size="sm" variant="secondary" onClick={() => handleConvert(q)}>
                            <ArrowRight className="w-3.5 h-3.5 mr-1" /> Convert
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900">Quoted Line Items</h4>
              {detailQuote.items && detailQuote.items.map((it) => (
                <div key={it.id} className="p-2.5 bg-white border border-slate-200 rounded-lg flex justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">{it.product_name}</span>
                    <span className="text-slate-400 ml-2">x {it.quantity}</span>
                  </div>
                  <span className="font-bold text-slate-900">{formatCurrency(it.line_total)}</span>
                </div>
              ))}
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
        title="Create New Quotation"
        description="Select customer, target plan, and optional billable items."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateQuotation} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
              {formError}
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

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Input
                label="Discount Amount ($)"
                type="number"
                step="0.01"
                value={formQuote.discount_amount}
                onChange={(e) => setFormQuote({ ...formQuote, discount_amount: e.target.value })}
              />
              <Input
                label="Tax Rate (%)"
                type="number"
                step="0.01"
                value={formQuote.tax_percentage}
                onChange={(e) => setFormQuote({ ...formQuote, tax_percentage: e.target.value })}
              />
            </div>
          </div>

          <Input
            label="Validity (Days)"
            type="number"
            min="1"
            value={formQuote.validity_days}
            onChange={(e) => setFormQuote({ ...formQuote, validity_days: parseInt(e.target.value) || 30 })}
          />

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
              Generate Quotation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

