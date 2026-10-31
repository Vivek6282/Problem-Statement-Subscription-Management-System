import React, { useState, useEffect } from 'react'
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Layers,
  DollarSign,
  AlertCircle,
  Tag,
  Archive,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import type { Product, ProductVariant, ProductType } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

export const ProductsPage: React.FC = () => {
  const { isAdmin } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null)

  // Optional AI description drafts (admin only; the page works the same without them)
  const [aiAvailable, setAiAvailable] = useState(false)
  const [aiDraft, setAiDraft] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    api
      .get('/assistant/status/')
      .then((res) => {
        if (!cancelled) setAiAvailable(!!res.data?.available)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  // Product Modal
  const [isProdModalOpen, setIsProdModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [prodForm, setProdForm] = useState({
    sku: '',
    name: '',
    product_type: 'SOFTWARE' as ProductType,
    sales_price: '',
    cost_price: '',
    description: '',
    notes: '',
  })
  const [prodError, setProdError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSavingProd, setIsSavingProd] = useState(false)

  // Variant Modal
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product | null>(null)
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false)
  const [variantForm, setVariantForm] = useState({
    name: '',
    sku_suffix: '',
    price_adjustment: '0.00',
  })
  const [variantError, setVariantError] = useState<string | null>(null)
  const [isSavingVariant, setIsSavingVariant] = useState(false)

  // Deletion / Archival Confirmation Modal
  const [itemToDelete, setItemToDelete] = useState<{ type: 'product' | 'variant'; id: number; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      let url = '/products/'
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (typeFilter !== 'ALL') params.append('product_type', typeFilter)
      if (params.toString()) url += `?${params.toString()}`

      const res = await api.get(url)
      setProducts(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [search, typeFilter])

  const requestDraft = async () => {
    if (!prodForm.name.trim()) {
      setAiError(true)
      return
    }
    setAiLoading(true)
    setAiError(false)
    setAiDraft(null)
    try {
      const res = await api.post('/assistant/product-description/', {
        name: prodForm.name,
        product_type: prodForm.product_type,
        variant_names: (editingProduct?.variants ?? []).map((v) => v.name).slice(0, 20),
      })
      setAiDraft(res.data.draft)
    } catch {
      setAiError(true) // every form value is kept
    } finally {
      setAiLoading(false)
    }
  }

  const openCreateProduct = () => {
    setAiDraft(null)
    setAiError(false)
    setEditingProduct(null)
    setProdForm({
      sku: '',
      name: '',
      product_type: 'SOFTWARE',
      sales_price: '',
      cost_price: '0.00',
      description: '',
      notes: '',
    })
    setProdError(null)
    setFieldErrors({})
    setIsProdModalOpen(true)
  }

  const openEditProduct = (p: Product) => {
    setAiDraft(null)
    setAiError(false)
    setEditingProduct(p)
    setProdForm({
      sku: p.sku,
      name: p.name,
      product_type: p.product_type,
      sales_price: String(p.sales_price),
      cost_price: String(p.cost_price),
      description: p.description || '',
      notes: p.notes || '',
    })
    setProdError(null)
    setFieldErrors({})
    setIsProdModalOpen(true)
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingProd(true)
    setProdError(null)
    setFieldErrors({})
    try {
      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}/`, prodForm)
        setFeedbackMessage({ text: `Product '${prodForm.name}' updated successfully.`, type: 'success' })
      } else {
        await api.post('/products/', prodForm)
        setFeedbackMessage({ text: `Product '${prodForm.name}' created successfully.`, type: 'success' })
      }
      setIsProdModalOpen(false)
      fetchProducts()
    } catch (err: any) {
      const data = err?.response?.data || {}
      const errors: Record<string, string> = {}
      if (data.sales_price) errors.sales_price = Array.isArray(data.sales_price) ? data.sales_price[0] : data.sales_price
      if (data.cost_price) errors.cost_price = Array.isArray(data.cost_price) ? data.cost_price[0] : data.cost_price
      if (data.sku) errors.sku = Array.isArray(data.sku) ? data.sku[0] : data.sku
      if (data.name) errors.name = Array.isArray(data.name) ? data.name[0] : data.name
      setFieldErrors(errors)
      setProdError(data.detail || Object.values(errors)[0] || 'Failed to save product.')
    } finally {
      setIsSavingProd(false)
    }
  }

  const openVariantManager = (p: Product) => {
    setSelectedProductForVariants(p)
    setVariantForm({
      name: '',
      sku_suffix: '',
      price_adjustment: '0.00',
    })
    setVariantError(null)
    setIsVariantModalOpen(true)
  }

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductForVariants) return
    setIsSavingVariant(true)
    setVariantError(null)
    try {
      await api.post('/products/variants/', {
        product: selectedProductForVariants.id,
        ...variantForm,
      })
      setFeedbackMessage({ text: `Variant '${variantForm.name}' added successfully.`, type: 'success' })
      setIsVariantModalOpen(false)
      fetchProducts()
    } catch (err: any) {
      const data = err?.response?.data || {}
      setVariantError(data.price_adjustment?.[0] || data.name?.[0] || data.detail || 'Failed to add variant.')
    } finally {
      setIsSavingVariant(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return
    setIsDeleting(true)
    try {
      const endpoint = itemToDelete.type === 'product'
        ? `/products/${itemToDelete.id}/`
        : `/products/variants/${itemToDelete.id}/`
      const res = await api.delete(endpoint)
      if (res.data?.archived) {
        setFeedbackMessage({
          text: res.data.message || `${itemToDelete.name} is in use by existing records; it has been deactivated/archived.`,
          type: 'info'
        })
      } else {
        setFeedbackMessage({ text: `${itemToDelete.name} deleted successfully.`, type: 'success' })
      }
      setItemToDelete(null)
      fetchProducts()
    } catch (err: any) {
      setFeedbackMessage({ text: err?.response?.data?.detail || 'Failed to remove record.', type: 'error' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Product & Catalog Management</h1>
          <p className="text-xs text-slate-500 mt-1">Configure base items, SKUs, and variant pricing adjustments</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateProduct}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Product
          </Button>
        )}
      </div>

      {/* Pricing policy banner */}
      <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl flex items-center justify-between text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" />
          <span><b>Catalog Authorization:</b> Creating items, editing prices, and archiving require Administrator role.</span>
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

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU, name, description..."
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Types</option>
              <option value="SOFTWARE">Software / SaaS</option>
              <option value="SERVICE">Service</option>
              <option value="SUBSCRIPTION">Subscription Add-on</option>
              <option value="HARDWARE">Hardware</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No Products in Catalog"
          description={isAdmin ? "Create your first billable product or subscription add-on." : "No products are currently available."}
          actionLabel={isAdmin ? "Create Product" : undefined}
          onAction={isAdmin ? openCreateProduct : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {products.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                      <Badge variant="info">{p.product_type}</Badge>
                      <Badge variant={p.is_active ? 'success' : 'neutral'}>
                        {p.is_active ? 'Active' : 'Archived'}
                      </Badge>
                      <span className="font-mono text-xs text-slate-500 font-semibold">SKU: {p.sku}</span>
                    </div>
                    {p.description && <p className="text-xs text-slate-500 max-w-2xl">{p.description}</p>}
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-slate-400 font-medium">Base Sales Price</p>
                      <p className="text-lg font-black text-slate-900">{formatCurrency(p.sales_price)}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openVariantManager(p)}
                        className="text-xs"
                      >
                        <Layers className="w-3.5 h-3.5 mr-1" />
                        Variants ({p.variants?.length || 0})
                      </Button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => openEditProduct(p)}
                            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setItemToDelete({ type: 'product', id: p.id, name: p.name })}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete or Archive Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nested Variants Display */}
                {p.variants && p.variants.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Configured Product Variants
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {p.variants.map((v) => (
                        <div
                          key={v.id}
                          className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800">{v.name}</span>
                              {!v.is_active && <Badge variant="neutral">Archived</Badge>}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">{v.effective_sku}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className="font-bold text-primary">{formatCurrency(v.final_unit_price)}</span>
                              <div className="text-[10px] text-slate-400">
                                (+{formatCurrency(v.price_adjustment)})
                              </div>
                            </div>
                            {isAdmin && (
                              <button
                                onClick={() => setItemToDelete({ type: 'variant', id: v.id, name: `${p.name} - ${v.name}` })}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                title="Delete or Archive Variant"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Product Create/Edit Modal */}
      <Modal
        isOpen={isProdModalOpen}
        onClose={() => setIsProdModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        description="Enter product catalog information and pricing specifications."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          {prodError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{prodError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Product SKU"
                required
                value={prodForm.sku}
                onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                placeholder="e.g. PROD-ERP-CORE"
              />
              {fieldErrors.sku && <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.sku}</p>}
            </div>
            <Select
              label="Product Type"
              value={prodForm.product_type}
              onChange={(e: any) => setProdForm({ ...prodForm, product_type: e.target.value })}
              options={[
                { label: 'Software / SaaS', value: 'SOFTWARE' },
                { label: 'Service', value: 'SERVICE' },
                { label: 'Subscription Add-on', value: 'SUBSCRIPTION' },
                { label: 'Hardware', value: 'HARDWARE' },
              ]}
            />
          </div>

          <div>
            <Input
              label="Product Name"
              required
              value={prodForm.name}
              onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
              placeholder="e.g. Cloud ERP Platform"
            />
            {fieldErrors.name && <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Sales Price ($)"
                type="number"
                step="0.01"
                required
                disabled={!isAdmin}
                value={prodForm.sales_price}
                onChange={(e) => setProdForm({ ...prodForm, sales_price: e.target.value })}
                placeholder="2000.00"
                helperText={!isAdmin ? 'Pricing modifications require Admin role.' : ''}
              />
              {fieldErrors.sales_price && <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.sales_price}</p>}
            </div>
            <div>
              <Input
                label="Cost Price ($)"
                type="number"
                step="0.01"
                disabled={!isAdmin}
                value={prodForm.cost_price}
                onChange={(e) => setProdForm({ ...prodForm, cost_price: e.target.value })}
                placeholder="500.00"
              />
              {fieldErrors.cost_price && <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.cost_price}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Description</label>
            <textarea
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              value={prodForm.description}
              onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
              placeholder="Detailed description for invoices and quotations..."
            />
            {isAdmin && aiAvailable && (
              <div className="pt-1 space-y-2">
                <Button type="button" size="sm" variant="outline" onClick={requestDraft} isLoading={aiLoading}>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Draft description
                </Button>
                {aiLoading && <Skeleton className="h-16 w-full" />}
                {aiError && !aiLoading && (
                  <p className="text-xs text-red-600" role="alert">
                    AI assistant unavailable
                  </p>
                )}
                {aiDraft !== null && !aiLoading && (
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold text-slate-600">AI-generated draft. Review before saving.</p>
                    <textarea
                      aria-label="AI-generated description draft"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                      value={aiDraft}
                      onChange={(e) => setAiDraft(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setProdForm({ ...prodForm, description: aiDraft })
                          setAiDraft(null)
                        }}
                      >
                        Use this draft
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setAiDraft(null)}>
                        Discard
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsProdModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSavingProd}>
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Variant Modal */}
      <Modal
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        title={`Add Variant to ${selectedProductForVariants?.name}`}
        description="Variants inherit base SKU with a suffix and apply a price delta."
        maxWidth="md"
      >
        <form onSubmit={handleAddVariant} className="space-y-4">
          {variantError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{variantError}</span>
            </div>
          )}

          <Input
            label="Variant Name"
            required
            value={variantForm.name}
            onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
            placeholder="e.g. Enterprise Edition / 24-7 SLA"
          />

          <Input
            label="SKU Suffix (Optional)"
            value={variantForm.sku_suffix}
            onChange={(e) => setVariantForm({ ...variantForm, sku_suffix: e.target.value })}
            placeholder="e.g. ENT-247"
            helperText={`Effective SKU: ${selectedProductForVariants?.sku}-${variantForm.sku_suffix || '<id>'}`}
          />

          <Input
            label="Price Adjustment ($)"
            type="number"
            step="0.01"
            disabled={!isAdmin}
            value={variantForm.price_adjustment}
            onChange={(e) => setVariantForm({ ...variantForm, price_adjustment: e.target.value })}
            placeholder="500.00"
            helperText={`Calculated unit price: ${formatCurrency(
              Number(selectedProductForVariants?.sales_price || 0) + Number(variantForm.price_adjustment || 0)
            )}`}
          />

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsVariantModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSavingVariant}>
              Add Variant
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deletion / Archival Confirmation Modal */}
      <Modal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title="Confirm Removal / Archival"
        description="Records referenced in active contracts or history will be safely deactivated/archived rather than deleted."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to remove <b>{itemToDelete?.name}</b>? If it is linked to existing subscriptions or invoices, it will remain archived for financial integrity.
          </p>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setItemToDelete(null)}>
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
