import React, { useState, useEffect } from 'react'
import { Receipt, Plus, Edit2, ShieldAlert } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { TaxRule } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

export const TaxesPage: React.FC = () => {
  const { isAdmin } = useAuth()
  const [taxes, setTaxes] = useState<TaxRule[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTax, setEditingTax] = useState<TaxRule | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    percentage: '',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
    is_active: true,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchTaxes = async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/taxes/')
      setTaxes(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTaxes()
  }, [])

  const openCreateModal = () => {
    setEditingTax(null)
    setFormData({
      name: '',
      percentage: '',
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: '',
      is_active: true,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (t: TaxRule) => {
    setEditingTax(t)
    setFormData({
      name: t.name,
      percentage: String(t.percentage),
      effective_from: t.effective_from,
      effective_to: t.effective_to || '',
      is_active: t.is_active,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSaveTax = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFormError(null)

    const payload = {
      ...formData,
      effective_to: formData.effective_to || null,
    }

    try {
      if (editingTax) {
        await api.patch(`/taxes/${editingTax.id}/`, payload)
      } else {
        await api.post('/taxes/', payload)
      }
      setIsModalOpen(false)
      fetchTaxes()
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Failed to save tax rule.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tax Jurisdiction & Rules</h1>
          <p className="text-xs text-slate-500 mt-1">Configure VAT, GST, and regional tax brackets applied automatically to subscription line items</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Tax Rule
          </Button>
        )}
      </div>

      {!isAdmin && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Only system Administrators may create or update tax rate configurations.</span>
        </div>
      )}

      {/* Tax Rules Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : taxes.length === 0 ? (
        <EmptyState
          title="No Tax Rules Configured"
          description="Create your first tax rate (e.g. 18% GST or 10% VAT)."
          actionLabel={isAdmin ? 'Add Tax Rule' : undefined}
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
                  <th className="py-3 px-4">Effective Window</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {taxes.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {t.name}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-primary text-sm">
                      {t.percentage}%
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
                      {isAdmin && (
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Tax Rule"
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
        </Card>
      )}

      {/* Tax Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTax ? 'Edit Tax Rule' : 'Create Tax Rule'}
        description="Set tax rate percentage and effective calendar window."
        maxWidth="md"
      >
        <form onSubmit={handleSaveTax} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
              {formError}
            </div>
          )}

          <Input
            label="Tax Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. GST 18% or Standard VAT"
          />

          <Input
            label="Percentage Rate (%)"
            type="number"
            step="0.01"
            required
            value={formData.percentage}
            onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
            placeholder="18.00"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Effective From"
              type="date"
              required
              value={formData.effective_from}
              onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
            />
            <Input
              label="Effective Until (Optional)"
              type="date"
              value={formData.effective_to}
              onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs">
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
              Save Tax Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

