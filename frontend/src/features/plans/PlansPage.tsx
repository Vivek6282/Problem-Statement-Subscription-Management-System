import React, { useState, useEffect } from 'react'
import { Layers, Plus, Calendar, Check, X, Edit2, Trash2, ShieldAlert, Archive, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
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

export const PlansPage: React.FC = () => {
  const { isAdmin } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null)

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Delete / Archive Modal
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchPlans = async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/plans/')
      setPlans(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

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
    setFieldErrors({})
    setIsModalOpen(true)
  }

  const openEditModal = (p: Plan) => {
    setEditingPlan(p)
    setFormData({
      name: p.name,
      code: p.code,
      description: p.description || '',
      price: String(p.price),
      billing_interval: p.billing_interval,
      min_quantity: p.min_quantity || 1,
      availability_start_date: p.availability_start_date || '',
      availability_end_date: p.availability_end_date || '',
      allow_pause: p.allow_pause,
      allow_early_close: p.allow_early_close,
      allow_renewal: p.allow_renewal,
      auto_close_on_expiry: p.auto_close_on_expiry,
      is_active: p.is_active,
    })
    setFormError(null)
    setFieldErrors({})
    setIsModalOpen(true)
  }

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFormError(null)
    setFieldErrors({})

    const payload = {
      ...formData,
      availability_start_date: formData.availability_start_date || null,
      availability_end_date: formData.availability_end_date || null,
    }

    try {
      if (editingPlan) {
        await api.patch(`/plans/${editingPlan.id}/`, payload)
        setFeedbackMessage({ text: `Plan '${formData.name}' updated successfully.`, type: 'success' })
      } else {
        await api.post('/plans/', payload)
        setFeedbackMessage({ text: `Plan '${formData.name}' created successfully.`, type: 'success' })
      }
      setIsModalOpen(false)
      fetchPlans()
    } catch (err: any) {
      const data = err?.response?.data || {}
      const errors: Record<string, string> = {}
      if (data.price) errors.price = Array.isArray(data.price) ? data.price[0] : data.price
      if (data.min_quantity) errors.min_quantity = Array.isArray(data.min_quantity) ? data.min_quantity[0] : data.min_quantity
      if (data.availability_end_date) errors.availability_end_date = Array.isArray(data.availability_end_date) ? data.availability_end_date[0] : data.availability_end_date
      if (data.code) errors.code = Array.isArray(data.code) ? data.code[0] : data.code
      if (data.name) errors.name = Array.isArray(data.name) ? data.name[0] : data.name
      setFieldErrors(errors)
      setFormError(data.detail || Object.values(errors)[0] || 'Failed to save plan.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!planToDelete) return
    setIsDeleting(true)
    try {
      const res = await api.delete(`/plans/${planToDelete.id}/`)
      if (res.data?.archived) {
        setFeedbackMessage({
          text: res.data.message || `Plan '${planToDelete.name}' has been deactivated/archived because it is in use by subscriptions.`,
          type: 'info'
        })
      } else {
        setFeedbackMessage({ text: `Plan '${planToDelete.name}' deleted successfully.`, type: 'success' })
      }
      setPlanToDelete(null)
      fetchPlans()
    } catch (err: any) {
      setFeedbackMessage({ text: err?.response?.data?.detail || 'Failed to delete plan.', type: 'error' })
    } finally {
      setIsDeleting(false)
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
        {isAdmin && (
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Create Plan
          </Button>
        )}
      </div>

      {/* Role banner */}
      <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl flex items-center justify-between text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <span><b>Plan Configuration:</b> Only Administrators can create plans, change pricing, and configure lifecycle flags.</span>
        </div>
        <Badge variant={isAdmin ? 'success' : 'neutral'}>
          {isAdmin ? 'Administrator Access' : 'Staff Read-Only'}
        </Badge>
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
          feedbackMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : feedbackMessage.type === 'info'
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <Archive className="w-4 h-4 text-amber-600" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-[11px] underline font-semibold ml-4">
            Dismiss
          </button>
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
          description={isAdmin ? "Create plans that customers can subscribe to." : "No plans are currently available."}
          actionLabel={isAdmin ? "Create Plan" : undefined}
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
                      <Badge variant={p.is_active ? 'success' : 'neutral'}>
                        {p.is_active ? 'Active' : 'Archived'}
                      </Badge>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
                          title="Edit Plan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPlanToDelete(p)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete or Archive Plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <CardTitle className="mt-2 text-lg">{p.name}</CardTitle>
                  <p className="text-[11px] font-mono text-slate-400">code: {p.code}</p>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">{formatCurrency(p.price)}</span>
                    <span className="text-xs text-slate-400 font-semibold uppercase">/ {p.billing_interval.toLowerCase()}</span>
                  </div>
                  {p.description && <p className="text-xs text-slate-500 mt-2">{p.description}</p>}
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Min. Quantity:</span>
                    <span className="font-semibold text-slate-900">{p.min_quantity} unit(s)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Availability:</span>
                    <span className="font-semibold text-slate-900">
                      {p.availability_start_date ? formatDate(p.availability_start_date) : 'Open'}
                      {' - '}
                      {p.availability_end_date ? formatDate(p.availability_end_date) : 'Ongoing'}
                    </span>
                  </div>

                  {/* Lifecycle Rules Flags */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subscriber Lifecycle Rules</p>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <div className="flex items-center gap-1.5" title="Subscribers can pause their subscription">
                        {p.allow_pause ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                        <span className={p.allow_pause ? 'text-slate-700' : 'text-slate-400'}>Pause</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Subscribers can cancel before contract period ends">
                        {p.allow_early_close ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                        <span className={p.allow_early_close ? 'text-slate-700' : 'text-slate-400'}>Early Close</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Permits auto or manual contract renewals">
                        {p.allow_renewal ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                        <span className={p.allow_renewal ? 'text-slate-700' : 'text-slate-400'}>Renewal</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Closes subscription on expiration without renewal">
                        {p.auto_close_on_expiry ? <Check className="w-3.5 h-3.5 text-amber-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                        <span className={p.auto_close_on_expiry ? 'text-slate-700' : 'text-slate-400'}>Auto-Close</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
        description="Configure pricing, billing cycle, and subscription contract rules."
        maxWidth="lg"
      >
        <form onSubmit={handleSavePlan} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Plan Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Pro Monthly"
              />
              {fieldErrors.name && <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.name}</p>}
            </div>
            <div>
              <Input
                label="Plan Code"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. PRO-MONTHLY"
              />
              {fieldErrors.code && <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.code}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Input
                label="Recurring Price ($)"
                type="number"
                step="0.01"
                required
                disabled={!isAdmin}
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="99.00"
              />
              {fieldErrors.price && <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.price}</p>}
            </div>
            <Select
              label="Billing Interval"
              value={formData.billing_interval}
              onChange={(e: any) => setFormData({ ...formData, billing_interval: e.target.value })}
              options={[
                { label: 'Monthly', value: 'MONTHLY' },
                { label: 'Yearly', value: 'YEARLY' },
                { label: 'Weekly', value: 'WEEKLY' },
                { label: 'Daily', value: 'DAILY' },
              ]}
            />
            <div>
              <Input
                label="Min. Quantity"
                type="number"
                min="1"
                value={formData.min_quantity}
                onChange={(e) => setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 1 })}
              />
              {fieldErrors.min_quantity && <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.min_quantity}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Availability Start (Optional)"
              type="date"
              value={formData.availability_start_date}
              onChange={(e) => setFormData({ ...formData, availability_start_date: e.target.value })}
            />
            <div>
              <Input
                label="Availability End (Optional)"
                type="date"
                value={formData.availability_end_date}
                onChange={(e) => setFormData({ ...formData, availability_end_date: e.target.value })}
              />
              {fieldErrors.availability_end_date && <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.availability_end_date}</p>}
            </div>
          </div>

          {/* Lifecycle Configuration Flags */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800">Subscriber Contract Lifecycle Policies</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">These policies govern client-side actions and renewal automation for active subscriptions on this plan.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allow_pause}
                  onChange={(e) => setFormData({ ...formData, allow_pause: e.target.checked })}
                  className="rounded text-primary focus:ring-primary mt-0.5"
                />
                <div>
                  <span className="font-semibold text-slate-800">Allow Pause</span>
                  <p className="text-[11px] text-slate-500">Customers can pause their active subscription.</p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allow_early_close}
                  onChange={(e) => setFormData({ ...formData, allow_early_close: e.target.checked })}
                  className="rounded text-primary focus:ring-primary mt-0.5"
                />
                <div>
                  <span className="font-semibold text-slate-800">Allow Early Close</span>
                  <p className="text-[11px] text-slate-500">Customers can terminate before the term ends.</p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allow_renewal}
                  onChange={(e) => setFormData({ ...formData, allow_renewal: e.target.checked })}
                  className="rounded text-primary focus:ring-primary mt-0.5"
                />
                <div>
                  <span className="font-semibold text-slate-800">Allow Renewal</span>
                  <p className="text-[11px] text-slate-500">Auto-renews or permits manual renewals on completion.</p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.auto_close_on_expiry}
                  onChange={(e) => setFormData({ ...formData, auto_close_on_expiry: e.target.checked })}
                  className="rounded text-primary focus:ring-primary mt-0.5"
                />
                <div>
                  <span className="font-semibold text-slate-800">Auto-Close on Expiry</span>
                  <p className="text-[11px] text-slate-500">Automatically closes upon reaching expiry date without renewal.</p>
                </div>
              </label>
            </div>
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

      {/* Delete / Archive Confirmation Modal */}
      <Modal
        isOpen={!!planToDelete}
        onClose={() => setPlanToDelete(null)}
        title="Confirm Plan Removal / Archival"
        description="Plans referenced in existing contracts will be safely archived instead of deleted."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to remove plan <b>{planToDelete?.name}</b>? If it is attached to active subscriptions or quotations, it will remain archived for contract continuity.
          </p>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPlanToDelete(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" isLoading={isDeleting} onClick={handleConfirmDelete}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
