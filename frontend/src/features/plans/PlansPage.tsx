import React, { useState, useEffect, useRef } from 'react'
import { Layers, Plus, Calendar, Check, X, Edit2, ShieldAlert } from 'lucide-react'
import { api, getApiError } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Plan, BillingInterval } from '@/types'
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

export const PlansPage: React.FC = () => {
  const { isAdmin } = useAuth()
  const [notice, setNotice] = useState<string | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const lastFilterKey = useRef('')

  // Plan Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    price: '',
    billing_interval: 'MONTHLY' as BillingInterval,
    min_quantity: 1,
    availability_start_date: '',
    availability_end_date: '',
    allow_pause: true,
    allow_early_close: true,
    allow_renewal: true,
    auto_close_on_expiry: false,
    is_active: true,
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const fetchPlans = async () => {
    setIsLoading(true)
    try {
      const res = await api.get(`/plans/?page=${page}`)
      setPlans(res.data.results || res.data)
      setCount(res.data.count ?? (res.data.results || res.data).length)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const filterKey = ''
    if (lastFilterKey.current !== filterKey && page !== 1) {
      lastFilterKey.current = filterKey
      setPage(1)
      return
    }
    lastFilterKey.current = filterKey
    fetchPlans()
  }, [page])

  const openCreateModal = () => {
    setEditingPlan(null)
    setFormData({
      name: '',
      code: '',
      description: '',
      price: '',
      billing_interval: 'MONTHLY',
      min_quantity: 1,
      availability_start_date: '',
      availability_end_date: '',
      allow_pause: true,
      allow_early_close: true,
      allow_renewal: true,
      auto_close_on_expiry: false,
      is_active: true,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (p: Plan) => {
    setEditingPlan(p)
    setFormData({
      name: p.name,
      code: p.code,
      description: p.description,
      price: String(p.price),
      billing_interval: p.billing_interval,
      min_quantity: p.min_quantity,
      availability_start_date: p.availability_start_date || '',
      availability_end_date: p.availability_end_date || '',
      allow_pause: p.allow_pause,
      allow_early_close: p.allow_early_close,
      allow_renewal: p.allow_renewal,
      auto_close_on_expiry: p.auto_close_on_expiry,
      is_active: p.is_active,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const toggleActive = async (p: Plan) => {
    const next = !p.is_active
    if (!confirm(`${next ? 'Activate' : 'Deactivate'} plan "${p.name}"? ${next ? '' : 'Existing subscriptions keep running, but new subscriptions and quotations cannot use it.'}`)) return
    try {
      await api.patch(`/plans/${p.id}/`, { is_active: next })
      setNotice(`Plan "${p.name}" ${next ? 'activated' : 'deactivated'}.`)
      fetchPlans()
    } catch (err) {
      setNotice(`Error: ${getApiError(err)}`)
    }
    setTimeout(() => setNotice(null), 5000)
  }

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFormError(null)

    const payload = {
      ...formData,
      availability_start_date: formData.availability_start_date || null,
      availability_end_date: formData.availability_end_date || null,
    }

    try {
      if (editingPlan) {
        await api.patch(`/plans/${editingPlan.id}/`, payload)
      } else {
        await api.post('/plans/', payload)
      }
      setIsModalOpen(false)
      fetchPlans()
    } catch (err: any) {
      setFormError(getApiError(err, 'Failed to save plan.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Subscription Plans</h1>
          <p className="text-xs text-slate-500 mt-1">Configure recurring billing tiers, intervals, and renewal policies</p>
        </div>
        {isAdmin ? (
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Create Plan
          </Button>
        ) : (
          <Badge variant="neutral">View Only — plans are managed by Administrators</Badge>
        )}
      </div>

      {notice && (
        <div className="p-3 bg-navy-950 text-white rounded-xl text-xs font-semibold flex items-center justify-between border border-slate-700">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Plans Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          title="No Subscription Plans Configured"
          description="Create plans that customers can subscribe to."
          actionLabel={isAdmin ? 'Create Plan' : undefined}
          onAction={isAdmin ? openCreateModal : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((p) => (
            <Card key={p.id} className="relative flex flex-col justify-between hover:shadow-lg transition-all">
              <CardHeader className="bg-slate-50/50">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="default">{p.interval_display || p.billing_interval}</Badge>
                      {!p.is_active && <Badge variant="danger">Inactive</Badge>}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleActive(p)}
                          className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 rounded"
                          title={p.is_active ? 'Deactivate plan' : 'Activate plan'}
                        >
                          {p.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
                          title="Edit Plan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <CardTitle className="mt-2 text-lg">{p.name}</CardTitle>
                  <p className="text-[11px] font-mono text-slate-400">code: {p.code}</p>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4 flex-1">
                <div>
                  <span className="text-3xl font-black text-slate-900">{formatCurrency(p.price)}</span>
                  <span className="text-xs text-slate-400 font-medium"> / {p.billing_interval.toLowerCase()}</span>
                </div>

                {p.description && <p className="text-xs text-slate-500">{p.description}</p>}

                {/* Plan Policy Checklist */}
                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Minimum Quantity:</span>
                    <span className="font-bold text-slate-800">{p.min_quantity}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Allows Pause:</span>
                    {p.allow_pause ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-slate-300" />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Allows Early Close:</span>
                    {p.allow_early_close ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-slate-300" />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Allows Renewal:</span>
                    {p.allow_renewal ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-slate-300" />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Auto-close on Expiry:</span>
                    {p.auto_close_on_expiry ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-slate-300" />}
                  </div>
                </div>

                {/* Availability Dates */}
                {(p.availability_start_date || p.availability_end_date) && (
                  <div className="p-2 bg-slate-50 rounded-lg text-[11px] text-slate-500 space-y-0.5">
                    <p className="font-semibold text-slate-700">Availability Window:</p>
                    <p>Start: {formatDate(p.availability_start_date)}</p>
                    <p>End: {formatDate(p.availability_end_date) || 'Ongoing'}</p>
                  </div>
                )}
              </CardContent>

              <div className="p-4 bg-slate-50/50 border-t border-slate-100 rounded-b-xl flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Active Subscribers</span>
                <span className="font-bold text-slate-900">{p.active_subscriptions_count || 0}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && <Pagination page={page} count={count} onPageChange={setPage} className="rounded-xl border border-slate-200" />}

      {/* Plan Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? 'Edit Plan' : 'Create Subscription Plan'}
        description="Configure recurring pricing and lifecycle capabilities."
        maxWidth="lg"
      >
        <form onSubmit={handleSavePlan} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Plan Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Pro Monthly"
            />
            <Input
              label="Plan Code / Slug"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="plan-pro-monthly"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Recurring Price ($)"
              type="number"
              step="0.01"
              required
              disabled={!isAdmin && !!editingPlan}
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="499.00"
            />
            <Select
              label="Billing Interval"
              value={formData.billing_interval}
              onChange={(e: any) => setFormData({ ...formData, billing_interval: e.target.value })}
              options={[
                { label: 'Daily', value: 'DAILY' },
                { label: 'Weekly', value: 'WEEKLY' },
                { label: 'Monthly', value: 'MONTHLY' },
                { label: 'Yearly', value: 'YEARLY' },
              ]}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Description</label>
            <textarea
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Plan features and subscription terms..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Availability Start Date"
              type="date"
              value={formData.availability_start_date}
              onChange={(e) => setFormData({ ...formData, availability_start_date: e.target.value })}
            />
            <Input
              label="Availability End Date"
              type="date"
              value={formData.availability_end_date}
              onChange={(e) => setFormData({ ...formData, availability_end_date: e.target.value })}
            />
          </div>

          {/* Toggle Switches */}
          <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allow_pause}
                onChange={(e) => setFormData({ ...formData, allow_pause: e.target.checked })}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="font-medium text-slate-700">Allow customers to Pause and Resume subscription</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allow_early_close}
                onChange={(e) => setFormData({ ...formData, allow_early_close: e.target.checked })}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="font-medium text-slate-700">Allow early cancellation before contract expiry</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allow_renewal}
                onChange={(e) => setFormData({ ...formData, allow_renewal: e.target.checked })}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="font-medium text-slate-700">Allow renewal after subscription closes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.auto_close_on_expiry}
                onChange={(e) => setFormData({ ...formData, auto_close_on_expiry: e.target.checked })}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="font-medium text-slate-700">Auto-close subscription immediately on expiry date</span>
            </label>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingPlan ? 'Save Changes' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

