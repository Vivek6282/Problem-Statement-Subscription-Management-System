import React, { useState, useEffect, useRef } from 'react'
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
} from 'lucide-react'
import { api, getApiError } from '@/lib/api'
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
import { Pagination } from '@/components/ui/Pagination'

export const ProductsPage: React.FC = () => {
  const { isAdmin } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const lastFilterKey = useRef('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')

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

  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      let url = '/products/'
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (typeFilter !== 'ALL') params.append('product_type', typeFilter)
      params.append('page', String(page))
      if (params.toString()) url += `?${params.toString()}`

      const res = await api.get(url)
      setProducts(res.data.results || res.data)
      setCount(res.data.count ?? (res.data.results || res.data).length)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const filterKey = String(search) + '|' + String(typeFilter)
    if (lastFilterKey.current !== filterKey && page !== 1) {
      lastFilterKey.current = filterKey
      setPage(1)
      return
    }
    lastFilterKey.current = filterKey
    fetchProducts()
  }, [search, typeFilter, page])

  const openCreateProduct = () => {
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
    setIsProdModalOpen(true)
  }

  const openEditProduct = (p: Product) => {
    setEditingProduct(p)
    setProdForm({
      sku: p.sku,
      name: p.name,
      product_type: p.product_type,
      sales_price: String(p.sales_price),
      cost_price: String(p.cost_price),
      description: p.description,
      notes: p.notes,
    })
    setProdError(null)
    setIsProdModalOpen(true)
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingProd(true)
    setProdError(null)
    try {
      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}/`, prodForm)
      } else {
        await api.post('/products/', prodForm)
      }
      setIsProdModalOpen(false)
      fetchProducts()
    } catch (err: any) {
      setProdError(getApiError(err, 'Failed to save product.'))
    } finally {
      setIsSavingProd(false)
    }
  }

  const [notice, setNotice] = useState<string | null>(null)

  const handleDeleteProduct = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"? If it is used by subscriptions or quotations it will be archived instead, so financial history stays intact.`)) return
    try {
      const res = await api.delete(`/products/${p.id}/`)
      setNotice(res.data?.message || `Product "${p.name}" deleted.`)
      fetchProducts()
    } catch (err) {
      setNotice(`Error: ${getApiError(err)}`)
    }
    setTimeout(() => setNotice(null), 7000)
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
      setIsVariantModalOpen(false)
      fetchProducts()
    } catch (err: any) {
      setVariantError(getApiError(err, 'Failed to add variant.'))
    } finally {
      setIsSavingVariant(false)
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

      {notice && (
        <div className="p-3 bg-navy-950 text-white rounded-xl text-xs font-semibold flex items-center justify-between border border-slate-700">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Pricing policy banner */}
      <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl flex items-center justify-between text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" />
          <span><b>Pricing Authorization:</b> Base prices and variant adjustments require Administrator permissions.</span>
        </div>
        <Badge variant={isAdmin ? 'danger' : 'neutral'}>
          {isAdmin ? 'Admin Pricing Access' : 'View Only Mode'}
        </Badge>
      </div>

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
          description="Create your first billable product or subscription add-on."
          actionLabel={isAdmin ? 'Create Product' : undefined}
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
                      {!p.is_active && <Badge variant="danger">Archived</Badge>}
                      <span className="font-mono text-xs text-slate-500 font-semibold">SKU: {p.sku}</span>
                    </div>
                    {p.description && <p className="text-xs text-slate-500 max-w-2xl">{p.description}</p>}
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-slate-400 font-medium">Base Sales Price</p>
                      <p className="text-lg font-black text-slate-900">{formatCurrency(p.sales_price)}</p>
                    </div>

                    {isAdmin && (
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
                        <button
                          onClick={() => openEditProduct(p)}
                          className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete (archives when in use)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
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
                            <span className="font-bold text-slate-800">{v.name}</span>
                            <div className="text-[10px] font-mono text-slate-400">{v.effective_sku}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-primary">{formatCurrency(v.final_unit_price)}</span>
                            <div className="text-[10px] text-slate-400">
                              (+{formatCurrency(v.price_adjustment)})
                            </div>
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

      {!isLoading && <Pagination page={page} count={count} onPageChange={setPage} className="rounded-xl border border-slate-200" />}

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
            <Input
              label="Product SKU"
              required
              value={prodForm.sku}
              onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
              placeholder="e.g. PROD-ERP-CORE"
            />
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

          <Input
            label="Product Name"
            required
            value={prodForm.name}
            onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
            placeholder="e.g. Cloud ERP Platform"
          />

          <div className="grid grid-cols-2 gap-3">
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
            <Input
              label="Cost Price ($)"
              type="number"
              step="0.01"
              disabled={!isAdmin}
              value={prodForm.cost_price}
              onChange={(e) => setProdForm({ ...prodForm, cost_price: e.target.value })}
              placeholder="500.00"
            />
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
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Internal Notes</label>
            <textarea
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
              value={prodForm.notes}
              onChange={(e) => setProdForm({ ...prodForm, notes: e.target.value })}
              placeholder="Notes visible to staff only..."
            />
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
      {selectedProductForVariants && (
        <Modal
          isOpen={isVariantModalOpen}
          onClose={() => setIsVariantModalOpen(false)}
          title={`Add Variant to "${selectedProductForVariants.name}"`}
          description={`Base Product Price: ${formatCurrency(selectedProductForVariants.sales_price)}`}
          maxWidth="md"
        >
          <form onSubmit={handleAddVariant} className="space-y-4">
            {variantError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
                {variantError}
              </div>
            )}

            <Input
              label="Variant Name"
              required
              value={variantForm.name}
              onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
              placeholder="e.g. Odoo Integration Suite"
            />

            <Input
              label="SKU Suffix (Optional)"
              value={variantForm.sku_suffix}
              onChange={(e) => setVariantForm({ ...variantForm, sku_suffix: e.target.value })}
              placeholder="OD"
              helperText={`Effective SKU: ${selectedProductForVariants.sku}-${variantForm.sku_suffix || 'X'}`}
            />

            <Input
              label="Price Adjustment ($)"
              type="number"
              step="0.01"
              required
              value={variantForm.price_adjustment}
              onChange={(e) => setVariantForm({ ...variantForm, price_adjustment: e.target.value })}
              placeholder="560.00"
              helperText={`Final Unit Price: ${formatCurrency(
                Number(selectedProductForVariants.sales_price) + (parseFloat(variantForm.price_adjustment) || 0)
              )}`}
            />

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsVariantModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSavingVariant}>
                Save Variant
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

