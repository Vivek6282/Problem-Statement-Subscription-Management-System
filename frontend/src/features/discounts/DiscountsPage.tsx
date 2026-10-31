import React, { useState, useEffect, useRef } from 'react'
import { Percent, Plus, Edit2, ShieldAlert, CheckCircle, Tag } from 'lucide-react'
import { api, fetchAll, getApiError } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Discount, DiscountType } from '@/types'
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
import { MultiSelect } from '@/components/ui/MultiSelect'

export const DiscountsPage: React.FC = () => {
  const { isAdmin } = useAuth()
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const lastFilterKey = useRef('')

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
    applicable_products: [] as number[],
    applicable_plans: [] as number[],
  })
  const [catalog, setCatalog] = useState<Array<{ id: number; name: string; sku: string }>>([])
  const [planOptions, setPlanOptions] = useState<Array<{ id: number; name: string }>>([])
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchDiscounts = async () => {
    setIsLoading(true)
    try {
      const res = await api.get(`/discounts/?page=${page}`)
      setDiscounts(res.data.results || res.data)
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
    fetchDiscounts()
  }, [page])

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
      applicable_products: [],
      applicable_plans: [],
    })
    loadCatalog()
    setFormError(null)
    setIsModalOpen(true)
  }

  const loadCatalog = () => {
    fetchAll<{ id: number; name: string; sku: string }>('/products/', { is_active: 'true' }).then(setCatalog).catch(() => setCatalog([]))
    fetchAll<{ id: number; name: string }>('/plans/', { is_active: 'true' }).then(setPlanOptions).catch(() => setPlanOptions([]))
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
      applicable_products: d.applicable_products || [],
      applicable_plans: d.applicable_plans || [],
    })
    loadCatalog()
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFormError(null)

    const payload = {
      ...formData,
      code: formData.code.toUpperCase().trim(),
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
      end_date: formData.end_date || null,
    }

    try {
      if (editingDiscount) {
        await api.patch(`/discounts/${editingDiscount.id}/`, payload)
      } else {
        await api.post('/discounts/', payload)
      }
      setIsModalOpen(false)
      fetchDiscounts()
    } catch (err: any) {
      setFormError(getApiError(err, 'Failed to save discount rule.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Promotions & Discounts</h1>
          <p className="text-xs text-slate-500 mt-1">Configure percentage or fixed coupons, usage caps, and redemption limits</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Create Discount Rule
          </Button>
        )}
      </div>

      {!isAdmin && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Only system Administrators are authorized to create or modify discount rules.</span>
        </div>
      )}

      {/* Discounts Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : discounts.length === 0 ? (
        <EmptyState
          title="No Discounts Created"
          description="Create your first promotional discount coupon."
          actionLabel={isAdmin ? 'Create Discount' : undefined}
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
                {discounts.map((d) => (
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
                      <Badge variant={d.is_valid_now ? 'success' : 'neutral'}>
                        {d.is_valid_now ? 'Active' : 'Expired / Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isAdmin && (
                        <button
                          onClick={() => openEditModal(d)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Discount"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} count={count} onPageChange={setPage} />
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
            <Input
              label="Coupon Code"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g. WELCOME20"
            />
            <Input
              label="Promotion Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Early Adopter 20%"
            />
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
            <Input
              label={formData.discount_type === 'PERCENTAGE' ? 'Discount Percentage (%)' : 'Discount Amount ($)'}
              type="number"
              step="0.01"
              required
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder={formData.discount_type === 'PERCENTAGE' ? '20.00' : '50.00'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Minimum Purchase ($)"
              type="number"
              step="0.01"
              value={formData.min_purchase_amount}
              onChange={(e) => setFormData({ ...formData, min_purchase_amount: e.target.value })}
            />
            <Input
              label="Usage Cap (Max Total Redemptions)"
              type="number"
              value={formData.usage_limit}
              onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
              placeholder="Leave empty for unlimited"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              required
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
            <Input
              label="End Date (Optional)"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>

          <Input
            label="Minimum Quantity"
            type="number"
            min="1"
            value={formData.min_quantity}
            onChange={(e) => setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 1 })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MultiSelect
              label="Applicable products"
              options={catalog.map((c) => ({ value: c.id, label: `${c.name} (${c.sku})` }))}
              selected={formData.applicable_products}
              onChange={(v) => setFormData({ ...formData, applicable_products: v })}
              helperText="Empty = any product line."
            />
            <MultiSelect
              label="Applicable plans (subscription-level)"
              options={planOptions.map((p) => ({ value: p.id, label: p.name }))}
              selected={formData.applicable_plans}
              onChange={(v) => setFormData({ ...formData, applicable_plans: v })}
              helperText="Empty = subscriptions on any plan."
            />
          </div>
          <p className="text-[11px] text-slate-500 -mt-1">
            A discount applies automatically to invoices of the subscriptions (or lines) it is attached to, while it is active, within its dates and below its usage limit.
          </p>

          <label className="flex items-center gap-2 cursor-pointer text-xs">
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
              Save Discount Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

