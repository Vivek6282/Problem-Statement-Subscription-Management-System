import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Repeat,
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  XCircle,
  RotateCcw,
  CheckCircle,
  Zap,
  Calendar,
  DollarSign,
  AlertCircle,
  Eye,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Subscription, Customer, Plan, Product, SubscriptionStatus } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

export const SubscriptionsPage: React.FC = () => {
  const { isStaff, user } = useAuth()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  const [statusFilter, setStatusFilter] = useState<string>(statusParam || 'ALL')

  useEffect(() => {
    if (statusParam) setStatusFilter(statusParam)
  }, [statusParam])

  // Create Subscription Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const [formSub, setFormSub] = useState({
    customer: '',
    plan: '',
    status: 'ACTIVE' as SubscriptionStatus,
    start_date: new Date().toISOString().split('T')[0],
    payment_terms: 'NET_30',
    notes: '',
    selectedProduct: '',
    selectedQuantity: 1,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  // Subscription Detail Modal
  const [detailSub, setDetailSub] = useState<Subscription | null>(null)

  const fetchSubscriptions = async () => {
    setIsLoading(true)
    try {
      let url = '/subscriptions/'
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (params.toString()) url += `?${params.toString()}`

      const res = await api.get(url)
      setSubscriptions(res.data.results || res.data)
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
    fetchSubscriptions()
  }, [search, statusFilter])

  const openCreateModal = () => {
    loadPrerequisites()
    setFormSub({
      customer: customers[0]?.id ? String(customers[0].id) : '',
      plan: plans[0]?.id ? String(plans[0].id) : '',
      status: 'ACTIVE',
      start_date: new Date().toISOString().split('T')[0],
      payment_terms: 'NET_30',
      notes: '',
      selectedProduct: '',
      selectedQuantity: 1,
    })
    setFormError(null)
    setIsCreateOpen(true)
  }

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFormError(null)

    const items = []
    if (formSub.selectedProduct) {
      const prodObj = products.find((p) => p.id === Number(formSub.selectedProduct))
      if (prodObj) {
        items.push({
          product: prodObj.id,
          quantity: Number(formSub.selectedQuantity) || 1,
          unit_price: prodObj.sales_price,
        })
      }
    }

    try {
      await api.post('/subscriptions/', {
        customer: Number(formSub.customer),
        plan: Number(formSub.plan),
        status: formSub.status,
        start_date: formSub.start_date,
        payment_terms: formSub.payment_terms,
        notes: formSub.notes,
        items,
      })
      setIsCreateOpen(false)
      fetchSubscriptions()
      setActionNotice('Subscription created successfully.')
      setTimeout(() => setActionNotice(null), 5000)
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Failed to create subscription.')
    } finally {
      setIsSaving(false)
    }
  }

  // Lifecycle transitions
  const handleTransition = async (sub: Subscription, actionName: 'activate' | 'pause' | 'resume' | 'close' | 'trigger_billing') => {
    setActionNotice(null)
    try {
      const res = await api.post(`/subscriptions/${sub.id}/${actionName}/`)
      fetchSubscriptions()
      if (actionName === 'trigger_billing') {
        setActionNotice(`Billing triggered! ${res.data.message}`)
      } else {
        setActionNotice(`Subscription ${sub.subscription_number} moved to ${actionName.toUpperCase()}.`)
      }
      setTimeout(() => setActionNotice(null), 5000)
    } catch (err: any) {
      setActionNotice(`Error: ${err?.response?.data?.error || err?.response?.data?.detail || err.message}`)
      setTimeout(() => setActionNotice(null), 5000)
    }
  }

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>
      case 'PAUSED':
        return <Badge variant="warning">Paused</Badge>
      case 'CONFIRMED':
        return <Badge variant="info">Confirmed</Badge>
      case 'DRAFT':
        return <Badge variant="neutral">Draft</Badge>
      case 'CLOSED':
        return <Badge variant="danger">Closed</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Subscriptions Management</h1>
          <p className="text-xs text-slate-500 mt-1">Lifecycle state machine: Draft → Quotation → Confirmed → Active → Closed</p>
        </div>
        {isStaff && (
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Subscription
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
              placeholder="Search subscription #, client..."
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
              <option value="ALL">All States</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="DRAFT">Draft</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <EmptyState
          title="No Subscriptions Found"
          description={search ? `No subscriptions matched "${search}".` : 'No active subscriptions found.'}
          actionLabel={isStaff ? 'New Subscription' : undefined}
          onAction={isStaff ? openCreateModal : undefined}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Subscription #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Next Billing</th>
                  <th className="py-3 px-4">Recurring Total</th>
                  <th className="py-3 px-4">MRR</th>
                  <th className="py-3 px-4 text-right">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {s.subscription_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{s.customer_details?.company || s.customer_details?.name}</div>
                      <div className="text-[11px] text-slate-400">{s.customer_details?.name}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700">{s.plan_details?.name}</span>
                      <div className="text-[10px] text-slate-400 font-medium">({s.plan_details?.interval_display})</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(s.status)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      {formatDate(s.next_billing_date)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {formatCurrency(s.recurring_subtotal)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-primary">
                      {formatCurrency(s.normalized_mrr)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetailSub(s)}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Lifecycle buttons */}
                        {s.status === 'CONFIRMED' && (
                          <Button size="sm" variant="success" onClick={() => handleTransition(s, 'activate')}>
                            <Play className="w-3 h-3 mr-1 fill-current" /> Activate
                          </Button>
                        )}

                        {s.status === 'ACTIVE' && (
                          <>
                            <button
                              onClick={() => handleTransition(s, 'pause')}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Pause Subscription"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                            {isStaff && (
                              <button
                                onClick={() => handleTransition(s, 'trigger_billing')}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Force Bill Now"
                              >
                                <Zap className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleTransition(s, 'close')}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Close / Cancel"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {s.status === 'PAUSED' && (
                          <>
                            <button
                              onClick={() => handleTransition(s, 'resume')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Resume Subscription"
                            >
                              <Play className="w-4 h-4 fill-current" />
                            </button>
                            <button
                              onClick={() => handleTransition(s, 'close')}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Close Subscription"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {s.status === 'CLOSED' && s.plan_details?.allow_renewal && (
                          <button
                            onClick={() => handleTransition(s, 'activate')}
                            className="p-1.5 text-primary hover:bg-primary-50 rounded-lg transition-colors"
                            title="Renew Subscription"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
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

      {/* Subscription Detail Modal */}
      {detailSub && (
        <Modal
          isOpen={!!detailSub}
          onClose={() => setDetailSub(null)}
          title={`Subscription ${detailSub.subscription_number}`}
          description={`Customer: ${detailSub.customer_details?.company || detailSub.customer_details?.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <p className="text-slate-500">Plan</p>
                <p className="font-bold text-slate-900">{detailSub.plan_details?.name}</p>
                <p className="text-slate-400 text-[11px]">{detailSub.plan_details?.interval_display}</p>
              </div>
              <div>
                <p className="text-slate-500">Status</p>
                <div>{getStatusBadge(detailSub.status)}</div>
              </div>
              <div>
                <p className="text-slate-500">Start Date</p>
                <p className="font-semibold text-slate-800">{formatDate(detailSub.start_date)}</p>
              </div>
              <div>
                <p className="text-slate-500">Next Billing Date</p>
                <p className="font-semibold text-slate-800">{formatDate(detailSub.next_billing_date)}</p>
              </div>
              <div>
                <p className="text-slate-500">Recurring Charge</p>
                <p className="font-bold text-slate-900 text-sm">{formatCurrency(detailSub.recurring_subtotal)}</p>
              </div>
              <div>
                <p className="text-slate-500">Normalized MRR</p>
                <p className="font-bold text-primary text-sm">{formatCurrency(detailSub.normalized_mrr)}</p>
              </div>
            </div>

            {/* Line items list */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2">Attached Line Items & Add-ons</h4>
              <div className="space-y-1.5">
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                  <span>Base Plan: {detailSub.plan_details?.name}</span>
                  <span className="font-bold text-slate-900">{formatCurrency(detailSub.plan_details?.price)}</span>
                </div>
                {detailSub.items && detailSub.items.map((item) => (
                  <div key={item.id} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800">{item.product_name}</span>
                      {item.variant_name && <span className="text-slate-400 ml-1">({item.variant_name})</span>}
                      <span className="text-slate-400 ml-2">x {item.quantity}</span>
                    </div>
                    <span className="font-bold text-slate-900">{formatCurrency(item.line_subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {detailSub.notes && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-bold text-slate-700">Internal Notes:</p>
                <p className="text-slate-600 mt-0.5">{detailSub.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* New Subscription Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Subscription"
        description="Attach client to recurring plan and configure add-on items."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubscription} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Select Customer"
              required
              value={formSub.customer}
              onChange={(e) => setFormSub({ ...formSub, customer: e.target.value })}
              options={customers.map((c) => ({
                label: `${c.company || c.name} (${c.reference})`,
                value: c.id,
              }))}
            />

            <Select
              label="Select Plan"
              required
              value={formSub.plan}
              onChange={(e) => setFormSub({ ...formSub, plan: e.target.value })}
              options={plans.map((p) => ({
                label: `${p.name} (${formatCurrency(p.price)} / ${p.billing_interval.toLowerCase()})`,
                value: p.id,
              }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Start Date"
              type="date"
              required
              value={formSub.start_date}
              onChange={(e) => setFormSub({ ...formSub, start_date: e.target.value })}
            />
            <Select
              label="Initial Status"
              value={formSub.status}
              onChange={(e: any) => setFormSub({ ...formSub, status: e.target.value })}
              options={[
                { label: 'Active', value: 'ACTIVE' },
                { label: 'Draft', value: 'DRAFT' },
                { label: 'Confirmed', value: 'CONFIRMED' },
              ]}
            />
            <Select
              label="Payment Terms"
              value={formSub.payment_terms}
              onChange={(e: any) => setFormSub({ ...formSub, payment_terms: e.target.value })}
              options={[
                { label: 'Net 30 Days', value: 'NET_30' },
                { label: 'Net 15 Days', value: 'NET_15' },
                { label: 'Due Immediately', value: 'IMMEDIATE' },
                { label: 'Net 60 Days', value: 'NET_60' },
              ]}
            />
          </div>

          {/* Add Optional Product Item */}
          <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200/60">
            <p className="text-xs font-bold text-slate-800">Add Product Line Item (Optional)</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <select
                  value={formSub.selectedProduct}
                  onChange={(e) => setFormSub({ ...formSub, selectedProduct: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                >
                  <option value="">-- No Add-on Item --</option>
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
                  value={formSub.selectedQuantity}
                  onChange={(e) => setFormSub({ ...formSub, selectedQuantity: parseInt(e.target.value) || 1 })}
                  placeholder="Qty"
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Notes / Custom Clauses</label>
            <textarea
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
              value={formSub.notes}
              onChange={(e) => setFormSub({ ...formSub, notes: e.target.value })}
              placeholder="Terms or notes for internal staff..."
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Create Subscription
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

