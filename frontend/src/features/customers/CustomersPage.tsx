import React, { useState, useEffect } from 'react'
import {
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Archive,
  RotateCcw,
  Building,
  Mail,
  Phone,
  MapPin,
  Repeat,
  FileText,
  CreditCard,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Customer, Subscription, Invoice, Payment } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL')

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address_line1: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'United States',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Customer Detail Drawer state
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null)
  const [customerSubs, setCustomerSubs] = useState<Subscription[]>([])
  const [customerInvs, setCustomerInvs] = useState<Invoice[]>([])
  const [customerPayments, setCustomerPayments] = useState<Payment[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'invoices' | 'payments'>('overview')

  const fetchCustomers = async () => {
    setIsLoading(true)
    try {
      let url = '/customers/'
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (params.toString()) url += `?${params.toString()}`

      const res = await api.get(url)
      setCustomers(res.data.results || res.data)
    } catch (err) {
      console.error('Failed to load customers:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [search, statusFilter])

  const openCreateModal = () => {
    setEditingCustomer(null)
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      address_line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'United States',
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c)
    setFormData({
      name: c.name,
      company: c.company,
      email: c.email,
      phone: c.phone,
      address_line1: c.address_line1,
      city: c.city,
      state: c.state,
      postal_code: c.postal_code,
      country: c.country,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFormError(null)
    try {
      if (editingCustomer) {
        await api.patch(`/customers/${editingCustomer.id}/`, formData)
      } else {
        await api.post('/customers/', formData)
      }
      setIsModalOpen(false)
      fetchCustomers()
    } catch (err: any) {
      setFormError(err?.response?.data?.email?.[0] || err?.response?.data?.detail || 'Failed to save customer.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleArchive = async (c: Customer) => {
    if (!confirm(`Are you sure you want to archive ${c.name}? Historical financial records are protected.`)) return
    try {
      await api.post(`/customers/${c.id}/archive/`)
      fetchCustomers()
    } catch (err) {
      console.error(err)
    }
  }

  const handleRestore = async (c: Customer) => {
    try {
      await api.post(`/customers/${c.id}/restore/`)
      fetchCustomers()
    } catch (err) {
      console.error(err)
    }
  }

  const openDetailDrawer = async (c: Customer) => {
    setDetailCustomer(c)
    setActiveTab('overview')
    try {
      const [subsRes, invsRes, paysRes] = await Promise.all([
        api.get(`/subscriptions/?customer=${c.id}`),
        api.get(`/invoices/?customer=${c.id}`),
        api.get(`/payments/?customer=${c.id}`),
      ])
      setCustomerSubs(subsRes.data.results || subsRes.data)
      setCustomerInvs(invsRes.data.results || invsRes.data)
      setCustomerPayments(paysRes.data.results || paysRes.data)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer Directory</h1>
          <p className="text-xs text-slate-500 mt-1">Manage corporate clients, accounts, and financial relations</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Customer
        </Button>
      </div>

      {/* Filters and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, company, email..."
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="ARCHIVED">Archived Only</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Customer Data Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          title="No Customers Found"
          description={search ? `No customer matched "${search}".` : 'Start by onboarding your first client.'}
          actionLabel="Add Customer"
          onAction={openCreateModal}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Active Subs</th>
                  <th className="py-3 px-4">Balance Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{c.company || c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.name}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{c.email}</div>
                      <div className="text-[11px] text-slate-400">{c.phone || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700 font-semibold">
                      {c.reference}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {c.active_subscriptions_count || 0}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {formatCurrency(c.outstanding_balance || 0)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={c.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDetailDrawer(c)}
                          className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary-50 rounded-lg transition-colors"
                          title="View 360 Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {c.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleArchive(c)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Archive Customer"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestore(c)}
                            className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Restore Customer"
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

      {/* Customer Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
        description="Fill in corporate client information and billing contact details."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Full Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Jane Doe"
            />
            <Input
              label="Company / Enterprise Name"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Stark Industries LLC"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email Address"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="billing@company.com"
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 234-5678"
            />
          </div>

          <Input
            label="Street Address"
            value={formData.address_line1}
            onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
            placeholder="100 Innovation Parkway"
          />

          <div className="grid grid-cols-3 gap-2">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="San Francisco"
            />
            <Input
              label="State / Province"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="CA"
            />
            <Input
              label="Zip / Postal"
              value={formData.postal_code}
              onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              placeholder="94105"
            />
          </div>

          <Input
            label="Country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            placeholder="United States"
          />

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingCustomer ? 'Update Customer' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Customer 360 Detail Modal */}
      {detailCustomer && (
        <Modal
          isOpen={!!detailCustomer}
          onClose={() => setDetailCustomer(null)}
          title={detailCustomer.company || detailCustomer.name}
          description={`Customer Ref: ${detailCustomer.reference} • Joined: ${formatDate(detailCustomer.created_at)}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all ${
                  activeTab === 'overview'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'subscriptions'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" /> Subscriptions ({customerSubs.length})
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'invoices'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Invoices ({customerInvs.length})
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'payments'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" /> Payments ({customerPayments.length})
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-2 gap-4 py-2 text-xs">
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                  <h4 className="font-bold text-slate-900">Contact Details</h4>
                  <p className="flex items-center gap-2 text-slate-600"><Mail className="w-4 h-4 text-slate-400" /> {detailCustomer.email}</p>
                  <p className="flex items-center gap-2 text-slate-600"><Phone className="w-4 h-4 text-slate-400" /> {detailCustomer.phone || '-'}</p>
                  <p className="flex items-center gap-2 text-slate-600"><Building className="w-4 h-4 text-slate-400" /> {detailCustomer.company || '-'}</p>
                  <p className="flex items-center gap-2 text-slate-600"><MapPin className="w-4 h-4 text-slate-400" /> {detailCustomer.address_line1} {detailCustomer.city} {detailCustomer.country}</p>
                </div>

                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                  <h4 className="font-bold text-slate-900">Financial Summary</h4>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Subscriptions:</span>
                    <span className="font-bold text-slate-800">{customerSubs.filter(s => s.status === 'ACTIVE').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Invoices:</span>
                    <span className="font-bold text-slate-800">{customerInvs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Outstanding Balance:</span>
                    <span className="font-bold text-red-600">{formatCurrency(detailCustomer.outstanding_balance)}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subscriptions' && (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {customerSubs.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">No subscriptions created for this customer.</p>
                ) : (
                  customerSubs.map((s) => (
                    <div key={s.id} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{s.subscription_number}</span>
                        <span className="text-slate-500 ml-2">Plan: {s.plan_details?.name}</span>
                        <div className="text-[11px] text-slate-400 mt-0.5">Next Billing: {formatDate(s.next_billing_date)}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">{formatCurrency(s.recurring_subtotal)}</span>
                        <div>
                          <Badge variant={s.status === 'ACTIVE' ? 'success' : s.status === 'PAUSED' ? 'warning' : 'neutral'}>
                            {s.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'invoices' && (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {customerInvs.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">No invoices generated for this customer.</p>
                ) : (
                  customerInvs.map((inv) => (
                    <div key={inv.id} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{inv.invoice_number}</span>
                        <div className="text-[11px] text-slate-400">Due: {formatDate(inv.due_date)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{formatCurrency(inv.total_amount)}</div>
                        <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'danger' : 'info'}>
                          {inv.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {customerPayments.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">No payments recorded for this customer.</p>
                ) : (
                  customerPayments.map((p) => (
                    <div key={p.id} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{p.payment_number}</span>
                        <div className="text-[11px] text-slate-400">{p.payment_method} • {formatDate(p.payment_date)}</div>
                      </div>
                      <div className="font-bold text-green-700">
                        {formatCurrency(p.amount)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

