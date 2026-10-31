import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, ShieldAlert, AlertTriangle, CheckCircle2, Search, Filter } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { TaxRule, Product } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

export const TaxesPage: React.FC = () => {
  const { isAdmin } = useAuth()
  const [taxes, setTaxes] = useState<TaxRule[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null)

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTax, setEditingTax] = useState<TaxRule | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    percentage: '',
    applicable_products: [] as number[],
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
    is_active: true,
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Delete / Archive confirmation modal state
  const [taxToDelete, setTaxToDelete] = useState<TaxRule | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchTaxesAndProducts = async () => {
    setIsLoading(true)
    try {
      const [taxRes, prodRes] = await Promise.all([
        api.get('/taxes/'),
        api.get('/products/'),
      ])
      setTaxes(taxRes.data.results || taxRes.data)
      setProducts(prodRes.data.results || prodRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTaxesAndProducts()
  }, [])

  const openCreateModal = () => {
    setEditingTax(null)
    setFormData({
      name: '',
      percentage: '',
      applicable_products: [],
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: '',
      is_active: true,
    })
    setFieldErrors({})
    setFormError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (t: TaxRule) => {
    setEditingTax(t)
    setFormData({
      name: t.name,
      percentage: String(t.percentage),
      applicable_products: t.applicable_products || [],
      effective_from: t.effective_from,
      effective_to: t.effective_to || '',
      is_active: t.is_active,
    })
    setFieldErrors({})
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSaveTax = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFieldErrors({})
    setFormError(null)

    const payload = {
      name: formData.name.trim(),
      percentage: formData.percentage,
      applicable_products: formData.applicable_products,
      effective_from: formData.effective_from,
      effective_to: formData.effective_to || null,
      is_active: formData.is_active,
    }

    try {
      if (editingTax) {
        await api.patch(`/taxes/${editingTax.id}/`, payload)
        setFeedback({
          type: 'success',
          message: `Tax rule "${payload.name}" updated successfully.`,
        })
      } else {
        await api.post('/taxes/', payload)
        setFeedback({
          type: 'success',
          message: `Tax rule "${payload.name}" created successfully.`,
        })
      }
      setIsModalOpen(false)
      fetchTaxesAndProducts()
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
        setFormError(genericMsg || (Object.keys(errors).length === 0 ? 'Failed to save tax rule.' : null))
      } else {
        setFormError('An unexpected server error occurred.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteTax = async () => {
    if (!taxToDelete) return
    setIsDeleting(true)
    try {
      const res = await api.delete(`/taxes/${taxToDelete.id}/`)
      if (res.status === 200 && res.data?.archived) {
        setFeedback({
          type: 'info',
          message: `Tax rule "${taxToDelete.name}" has been archived because it is referenced by existing invoices. It is no longer selectable for new purchases.`,
        })
      } else {
        setFeedback({
          type: 'success',
          message: `Tax rule "${taxToDelete.name}" was successfully deleted.`,
        })
      }
      setTaxToDelete(null)
      fetchTaxesAndProducts()
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to delete tax rule.'
      setFeedback({ type: 'error', message: msg })
      setTaxToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleProductSelection = (productId: number) => {
    setFormData((prev) => {
      const exists = prev.applicable_products.includes(productId)
      return {
        ...prev,
        applicable_products: exists
          ? prev.applicable_products.filter((id) => id !== productId)
          : [...prev.applicable_products, productId],
      }
    })
  }

  // Filtered taxes
  const filteredTaxes = taxes.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && t.is_active) ||
      (statusFilter === 'INACTIVE' && !t.is_active)
    return matchesSearch && matchesStatus
  })

  const getProductNames = (ids: number[]) => {
    if (!ids || ids.length === 0) return 'All Products (Global)'
    const names = ids
      .map((id) => products.find((p) => p.id === id)?.name)
      .filter(Boolean)
    if (names.length === 0) return `${ids.length} product(s)`
    if (names.length <= 2) return names.join(', ')
    return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tax Jurisdiction & Rules</h1>
          <p className="text-xs text-slate-500 mt-1">Configure VAT, GST, and regional tax brackets applied automatically to subscription line items</p>
        </div>
        <div>
          {isAdmin ? (
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Tax Rule
            </Button>
          ) : (
            <div title="Admin permission required to create tax rules">
              <Button disabled variant="outline">
                <Plus className="w-4 h-4 mr-1.5" />
                Add Tax Rule
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Role permission notice if not admin */}
      {!isAdmin && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Viewing tax rules in read-only mode. System Administrator permissions are required to create, update, or archive tax configurations.</span>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tax rules by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'ALL' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'ACTIVE' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'INACTIVE' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Inactive
            </button>
          </div>
        </div>
      </div>

      {/* Tax Rules Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredTaxes.length === 0 ? (
        <EmptyState
          title={searchQuery || statusFilter !== 'ALL' ? 'No Matching Tax Rules' : 'No Tax Rules Configured'}
          description={
            searchQuery || statusFilter !== 'ALL'
              ? 'Try adjusting your search query or status filter.'
              : 'Create your first tax rate (e.g. 18% GST or 10% VAT).'
          }
          actionLabel={isAdmin && !searchQuery && statusFilter === 'ALL' ? 'Add Tax Rule' : undefined}
          onAction={isAdmin ? openCreateModal : undefined}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Tax Rule Name</th>
                  <th className="py-3 px-4">Percentage Rate</th>
                  <th className="py-3 px-4">Applicable Scope</th>
                  <th className="py-3 px-4">Effective Window</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTaxes.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {t.name}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-primary text-sm">
                      {t.percentage}%
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {getProductNames(t.applicable_products)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {formatDate(t.effective_from)} to {t.effective_to ? formatDate(t.effective_to) : 'Present'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={t.is_active ? 'success' : 'neutral'}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isAdmin ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(t)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Tax Rule"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setTaxToDelete(t)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete or Archive Tax Rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Read-only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tax Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTax ? 'Edit Tax Rule' : 'Create Tax Rule'}
        description="Set tax rate percentage, product applicability, and effective calendar window."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveTax} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Tax Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. GST 18% or Standard VAT"
              />
              {fieldErrors.name && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <Input
                label="Percentage Rate (%)"
                type="number"
                step="0.01"
                required
                value={formData.percentage}
                onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                placeholder="18.00"
              />
              {fieldErrors.percentage && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.percentage}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Effective From"
                type="date"
                required
                value={formData.effective_from}
                onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
              />
              {fieldErrors.effective_from && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.effective_from}</p>
              )}
            </div>
            <div>
              <Input
                label="Effective Until (Optional)"
                type="date"
                value={formData.effective_to}
                onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
              />
              {fieldErrors.effective_to && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.effective_to}</p>
              )}
            </div>
          </div>

          {/* Applicable Products Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Applicable Products
            </label>
            <p className="text-[11px] text-slate-500">
              Select specific products to restrict this tax to. If no products are selected, this tax applies globally across the entire catalog.
            </p>
            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2.5 space-y-1.5 bg-slate-50/50">
              {products.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No products available in catalog.</p>
              ) : (
                products.map((p) => {
                  const isChecked = formData.applicable_products.includes(p.id)
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer transition-colors text-xs text-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleProductSelection(p.id)}
                        className="rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <span className="font-medium">{p.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">({p.sku})</span>
                    </label>
                  )
                })
              )}
            </div>
            {formData.applicable_products.length > 0 && (
              <button
                type="button"
                onClick={() => setFormData({ ...formData, applicable_products: [] })}
                className="text-[11px] text-primary hover:underline font-medium"
              >
                Clear product restrictions (apply to all products)
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs pt-1">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span className="font-semibold text-slate-700">Tax rule is currently active</span>
          </label>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingTax ? 'Update Tax Rule' : 'Save Tax Rule'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete / Archive Confirmation Modal */}
      <Modal
        isOpen={!!taxToDelete}
        onClose={() => setTaxToDelete(null)}
        title="Confirm Tax Rule Removal"
        description="Verify how this tax rule should be retired from active use."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Archival & Data Integrity Safeguard</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                If this tax rule is referenced by existing invoices or subscriptions, it will be <strong>archived (deactivated)</strong> instead of deleted. Active and historical subscriptions will continue using their locked tax rates.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Are you sure you want to proceed with removing tax rule <strong className="text-slate-900">{taxToDelete?.name} ({taxToDelete?.percentage}%)</strong>?
          </p>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setTaxToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={isDeleting}
              onClick={handleDeleteTax}
            >
              Archive or Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
