import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, ShieldAlert, AlertTriangle, CheckCircle2, Search, Filter, PlayCircle, Check, X } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Discount, DiscountType } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

export const DiscountsPage: React.FC = () => {
  const { isAdmin } = useAuth()
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PERCENTAGE' | 'FIXED'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null)

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    discount_type: 'PERCENTAGE' as DiscountType,
    value: '',
    min_purchase_amount: '0.00',
    min_quantity: 1,
    usage_limit: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true,
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Delete / Archive confirmation modal state
  const [discountToDelete, setDiscountToDelete] = useState<Discount | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Test Code Modal state (Staff & Admin)
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [testForm, setTestForm] = useState({
    code: '',
    subtotal: '100.00',
    quantity: 1,
  })
  const [testResult, setTestResult] = useState<{
    valid: boolean
    message?: string
    discount_amount?: string | number
    new_subtotal?: string | number
  } | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  const fetchDiscounts = async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/discounts/')
      setDiscounts(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDiscounts()
  }, [])

  const openCreateModal = () => {
    setEditingDiscount(null)
    setFormData({
      code: '',
      name: '',
      discount_type: 'PERCENTAGE',
      value: '',
      min_purchase_amount: '0.00',
      min_quantity: 1,
      usage_limit: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      is_active: true,
    })
    setFieldErrors({})
    setFormError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (d: Discount) => {
    setEditingDiscount(d)
    setFormData({
      code: d.code,
      name: d.name,
      discount_type: d.discount_type,
      value: String(d.value),
      min_purchase_amount: String(d.min_purchase_amount),
      min_quantity: d.min_quantity,
      usage_limit: d.usage_limit ? String(d.usage_limit) : '',
      start_date: d.start_date,
      end_date: d.end_date || '',
      is_active: d.is_active,
    })
    setFieldErrors({})
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFieldErrors({})
    setFormError(null)

    const payload = {
      ...formData,
      code: formData.code.toUpperCase().trim(),
      name: formData.name.trim(),
      min_purchase_amount: formData.min_purchase_amount || '0.00',
      min_quantity: Number(formData.min_quantity) || 1,
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
      end_date: formData.end_date || null,
    }

    try {
      if (editingDiscount) {
        await api.patch(`/discounts/${editingDiscount.id}/`, payload)
        setFeedback({
          type: 'success',
          message: `Discount code "${payload.code}" updated successfully.`,
        })
      } else {
        await api.post('/discounts/', payload)
        setFeedback({
          type: 'success',
          message: `Discount code "${payload.code}" created successfully.`,
        })
      }
      setIsModalOpen(false)
      fetchDiscounts()
    } catch (err: any) {
      const data = err?.response?.data
      if (data && typeof data === 'object') {
        const errors: Record<string, string> = {}
        let genericMsg: string | null = null
        Object.entries(data).forEach(([k, v]) => {
          if (Array.isArray(v)) {
            errors[k] = v.join(' ')
          } else if (typeof v === 'string') {
            if (k === 'detail' || k === 'non_field_errors') {
              genericMsg = v
            } else {
              errors[k] = v
            }
          }
        })
        setFieldErrors(errors)
        setFormError(genericMsg || (Object.keys(errors).length === 0 ? 'Failed to save discount rule.' : null))
      } else {
        setFormError('An unexpected server error occurred.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteDiscount = async () => {
    if (!discountToDelete) return
    setIsDeleting(true)
    try {
      const res = await api.delete(`/discounts/${discountToDelete.id}/`)
      if (res.status === 200 && res.data?.archived) {
        setFeedback({
          type: 'info',
          message: `Discount coupon "${discountToDelete.code}" has been archived because it is referenced by existing redemptions or subscriptions. It is no longer selectable for new purchases.`,
        })
      } else {
        setFeedback({
          type: 'success',
          message: `Discount coupon "${discountToDelete.code}" was successfully deleted.`,
        })
      }
      setDiscountToDelete(null)
      fetchDiscounts()
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to delete discount.'
      setFeedback({ type: 'error', message: msg })
      setDiscountToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsTesting(true)
    setTestResult(null)
    try {
      const res = await api.post('/discounts/validate-code/', {
        code: testForm.code.trim().toUpperCase(),
        subtotal: testForm.subtotal,
        quantity: Number(testForm.quantity) || 1,
      })
      setTestResult({
        valid: true,
        discount_amount: res.data.discount_amount,
        new_subtotal: res.data.new_subtotal,
        message: 'Coupon is valid and eligible!',
      })
    } catch (err: any) {
      setTestResult({
        valid: false,
        message: err?.response?.data?.message || err?.response?.data?.detail || 'Coupon code is invalid or not eligible.',
      })
    } finally {
      setIsTesting(false)
    }
  }

  const openTestWithCode = (code: string) => {
    setTestForm({
      code,
      subtotal: '100.00',
      quantity: 1,
    })
    setTestResult(null)
    setIsTestModalOpen(true)
  }

  // Filtered discounts
  const filteredDiscounts = discounts.filter((d) => {
    const matchesSearch =
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType =
      typeFilter === 'ALL' || d.discount_type === typeFilter
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && d.is_active) ||
      (statusFilter === 'INACTIVE' && !d.is_active)
    return matchesSearch && matchesType && matchesStatus
  })

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Promotions & Discounts</h1>
          <p className="text-xs text-slate-500 mt-1">Configure percentage or fixed coupons, usage caps, and redemption limits</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setTestForm({ code: '', subtotal: '100.00', quantity: 1 })
              setTestResult(null)
              setIsTestModalOpen(true)
            }}
          >
            <PlayCircle className="w-4 h-4 mr-1.5 text-primary" />
            Test Coupon Code
          </Button>

          {isAdmin ? (
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-1.5" />
              Create Discount Rule
            </Button>
          ) : (
            <div title="Admin permission required to create discount rules">
              <Button disabled variant="outline">
                <Plus className="w-4 h-4 mr-1.5" />
                Create Discount Rule
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Role Notice */}
      {!isAdmin && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Viewing promotions in read-only mode. System Administrators are authorized to create or modify discount rules. Staff may test coupon validity.</span>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-start justify-between gap-3 ${
            feedback.type === 'info'
              ? 'bg-blue-50 border border-blue-200 text-blue-900'
              : feedback.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-900'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'info' && <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0" />}
            {feedback.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />}
            {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search discounts by coupon code or campaign name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                typeFilter === 'ALL' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter('PERCENTAGE')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                typeFilter === 'PERCENTAGE' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Percentage
            </button>
            <button
              onClick={() => setTypeFilter('FIXED')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                typeFilter === 'FIXED' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Fixed
            </button>
          </div>

          <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'ALL' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'ACTIVE' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'INACTIVE' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Inactive
            </button>
          </div>
        </div>
      </div>

      {/* Discounts Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredDiscounts.length === 0 ? (
        <EmptyState
          title={searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL' ? 'No Matching Discount Rules' : 'No Discounts Created'}
          description={
            searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'Try adjusting your search keywords or active filters.'
              : 'Create your first promotional discount coupon.'
          }
          actionLabel={isAdmin && !searchQuery && typeFilter === 'ALL' && statusFilter === 'ALL' ? 'Create Discount' : undefined}
          onAction={isAdmin ? openCreateModal : undefined}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Coupon Code</th>
                  <th className="py-3 px-4">Promotion Name</th>
                  <th className="py-3 px-4">Benefit</th>
                  <th className="py-3 px-4">Min. Purchase</th>
                  <th className="py-3 px-4">Redemptions</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDiscounts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-primary">
                      {d.code}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {d.name}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {d.discount_type === 'PERCENTAGE' ? `${d.value}% Off` : `${formatCurrency(d.value)} Off`}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {formatCurrency(d.min_purchase_amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">{d.times_redeemed}</span>
                      <span className="text-slate-400"> / {d.usage_limit || '∞'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {formatDate(d.start_date)} to {d.end_date ? formatDate(d.end_date) : 'Ongoing'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={d.is_valid_now && d.is_active ? 'success' : 'neutral'}>
                        {d.is_valid_now && d.is_active ? 'Active' : !d.is_active ? 'Disabled' : 'Expired'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openTestWithCode(d.code)}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Test code validity"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEditModal(d)}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Discount"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDiscountToDelete(d)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete or Archive Discount"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
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

      {/* Discount Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDiscount ? 'Edit Discount Rule' : 'Create Discount Rule'}
        description="Set coupon code, discount percentage or fixed value, and redemption limits."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveDiscount} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Coupon Code"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. WELCOME20"
              />
              {fieldErrors.code && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.code}</p>
              )}
            </div>

            <div>
              <Input
                label="Promotion Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Early Adopter 20%"
              />
              {fieldErrors.name && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.name}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Discount Type"
              value={formData.discount_type}
              onChange={(e: any) => setFormData({ ...formData, discount_type: e.target.value })}
              options={[
                { label: 'Percentage (%)', value: 'PERCENTAGE' },
                { label: 'Fixed Amount ($)', value: 'FIXED' },
              ]}
            />
            <div>
              <Input
                label={formData.discount_type === 'PERCENTAGE' ? 'Discount Percentage (%)' : 'Discount Amount ($)'}
                type="number"
                step="0.01"
                required
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder={formData.discount_type === 'PERCENTAGE' ? '20.00' : '50.00'}
              />
              {fieldErrors.value && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.value}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Minimum Purchase ($)"
                type="number"
                step="0.01"
                value={formData.min_purchase_amount}
                onChange={(e) => setFormData({ ...formData, min_purchase_amount: e.target.value })}
              />
              {fieldErrors.min_purchase_amount && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.min_purchase_amount}</p>
              )}
            </div>
            <div>
              <Input
                label="Usage Cap (Max Redemptions)"
                type="number"
                value={formData.usage_limit}
                onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                placeholder="Leave blank for unlimited"
              />
              {fieldErrors.usage_limit && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.usage_limit}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Start Date"
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
              {fieldErrors.start_date && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.start_date}</p>
              )}
            </div>
            <div>
              <Input
                label="End Date (Optional)"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
              {fieldErrors.end_date && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.end_date}</p>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs pt-1">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span className="font-semibold text-slate-700">Discount rule is active</span>
          </label>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingDiscount ? 'Update Discount' : 'Save Discount Rule'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete / Archive Confirmation Modal */}
      <Modal
        isOpen={!!discountToDelete}
        onClose={() => setDiscountToDelete(null)}
        title="Confirm Discount Removal"
        description="Verify how this promotional coupon should be retired from active use."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Archival & Data Integrity Safeguard</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                If this discount has been redeemed or is referenced by active subscription lines, it will be <strong>archived (deactivated)</strong> instead of deleted. Past records and active subscriptions will continue using their locked discount terms.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Are you sure you want to proceed with removing coupon code <strong className="text-slate-900 font-mono">{discountToDelete?.code}</strong> ({discountToDelete?.name})?
          </p>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setDiscountToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={isDeleting}
              onClick={handleDeleteDiscount}
            >
              Archive or Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Test Coupon Code Modal (Staff & Admin) */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title="Test Coupon Code Validity"
        description="Validate coupon applicability and compute expected discount against a sample cart amount."
        maxWidth="md"
      >
        <form onSubmit={handleTestCode} className="space-y-4">
          <Input
            label="Coupon Code"
            required
            value={testForm.code}
            onChange={(e) => setTestForm({ ...testForm, code: e.target.value.toUpperCase() })}
            placeholder="e.g. WELCOME20"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Sample Subtotal ($)"
              type="number"
              step="0.01"
              required
              value={testForm.subtotal}
              onChange={(e) => setTestForm({ ...testForm, subtotal: e.target.value })}
            />
            <Input
              label="Sample Quantity"
              type="number"
              min="1"
              required
              value={testForm.quantity}
              onChange={(e) => setTestForm({ ...testForm, quantity: Number(e.target.value) || 1 })}
            />
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                testResult.valid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                {testResult.valid ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Eligible for Discount</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 text-rose-600" />
                    <span>Coupon Ineligible / Invalid</span>
                  </>
                )}
              </div>
              <p className="text-[11px]">{testResult.message}</p>
              {testResult.valid && (
                <div className="pt-2 border-t border-emerald-200 grid grid-cols-2 gap-2 text-xs font-medium">
                  <div>
                    <span className="text-emerald-700">Calculated Discount: </span>
                    <span className="font-bold">{formatCurrency(testResult.discount_amount || 0)}</span>
                  </div>
                  <div>
                    <span className="text-emerald-700">New Subtotal: </span>
                    <span className="font-bold">{formatCurrency(testResult.new_subtotal || 0)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsTestModalOpen(false)}>
              Close
            </Button>
            <Button type="submit" isLoading={isTesting}>
              Validate Coupon
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
