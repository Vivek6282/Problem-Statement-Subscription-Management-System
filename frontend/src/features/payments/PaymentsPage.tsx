import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Building,
  FileText,
  DollarSign,
  AlertCircle,
  Eye,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Payment, Invoice, Customer, PaymentMethodType } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

export const PaymentsPage: React.FC = () => {
  const { isStaff } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<string>('ALL')

  // Create payment modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [openInvoices, setOpenInvoices] = useState<Invoice[]>([])
  const [formPay, setFormPay] = useState({
    invoice: '',
    amount: '',
    payment_method: 'BANK_TRANSFER' as PaymentMethodType,
    payment_date: new Date().toISOString().split('T')[0],
    transaction_reference: '',
    notes: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Payment detail modal
  const [detailPay, setDetailPay] = useState<Payment | null>(null)

  const fetchPayments = async () => {
    setIsLoading(true)
    try {
      let url = '/payments/'
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (methodFilter !== 'ALL') params.append('payment_method', methodFilter)
      if (params.toString()) url += `?${params.toString()}`

      const res = await api.get(url)
      setPayments(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadOpenInvoices = async () => {
    try {
      const res = await api.get('/invoices/?status=CONFIRMED')
      const overdueRes = await api.get('/invoices/?status=OVERDUE')
      const partialRes = await api.get('/invoices/?status=PARTIALLY_PAID')

      const combined = [
        ...(res.data.results || res.data),
        ...(overdueRes.data.results || overdueRes.data),
        ...(partialRes.data.results || partialRes.data),
      ]
      setOpenInvoices(combined)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [search, methodFilter])

  const openCreateModal = () => {
    loadOpenInvoices()
    setFormPay({
      invoice: '',
      amount: '',
      payment_method: 'BANK_TRANSFER',
      payment_date: new Date().toISOString().split('T')[0],
      transaction_reference: '',
      notes: '',
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSelectInvoice = (invId: string) => {
    const inv = openInvoices.find((i) => i.id === Number(invId))
    setFormPay({
      ...formPay,
      invoice: invId,
      amount: inv ? String(inv.balance_due) : '',
    })
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFormError(null)

    try {
      await api.post('/payments/', {
        invoice: Number(formPay.invoice),
        amount: formPay.amount,
        payment_method: formPay.payment_method,
        payment_date: formPay.payment_date,
        transaction_reference: formPay.transaction_reference,
        notes: formPay.notes,
      })
      setIsModalOpen(false)
      fetchPayments()
    } catch (err: any) {
      const resp = err?.response?.data
      setFormError(resp?.non_field_errors?.[0] || resp?.amount?.[0] || resp?.detail || 'Failed to record payment.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payment Ledger</h1>
          <p className="text-xs text-slate-500 mt-1">Transaction-safe payment recording, balance reduction, and audit trails</p>
        </div>
        {isStaff && (
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Record Payment
          </Button>
        )}
      </div>

      {/* Filter and Search */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference #, client..."
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Methods</option>
              <option value="BANK_TRANSFER">Bank Transfer (Wire)</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="CASH">Cash</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          title="No Payments Recorded"
          description="Log customer payments against confirmed invoices."
          actionLabel={isStaff ? 'Record Payment' : undefined}
          onAction={isStaff ? openCreateModal : undefined}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Payment Ref #</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">External Reference</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {p.payment_number}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-primary font-semibold">
                      {p.invoice_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{p.customer_company || p.customer_name}</div>
                      <div className="text-[11px] text-slate-400">{p.customer_name}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {formatDate(p.payment_date)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="neutral">{p.payment_method}</Badge>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {p.transaction_reference || '-'}
                    </td>
                    <td className="py-3.5 px-4 font-black text-green-700 text-sm">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setDetailPay(p)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Payment"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Payment Detail Modal */}
      {detailPay && (
        <Modal
          isOpen={!!detailPay}
          onClose={() => setDetailPay(null)}
          title={`Receipt ${detailPay.payment_number}`}
          description={`Customer: ${detailPay.customer_company || detailPay.customer_name}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-green-50/50 rounded-xl border border-green-200/80 flex items-center justify-between">
              <div>
                <span className="text-slate-500">Payment Amount</span>
                <p className="text-2xl font-black text-green-700">{formatCurrency(detailPay.amount)}</p>
              </div>
              <Badge variant="success">Cleared</Badge>
            </div>

            <div className="space-y-2 text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Associated Invoice:</span>
                <span className="font-mono font-bold text-slate-900">{detailPay.invoice_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Payment Date:</span>
                <span className="font-semibold">{formatDate(detailPay.payment_date)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-semibold">{detailPay.payment_method}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">External Bank Ref / UTR:</span>
                <span className="font-mono font-semibold">{detailPay.transaction_reference || 'N/A'}</span>
              </div>
            </div>

            {detailPay.notes && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-bold text-slate-700">Internal Notes:</p>
                <p className="text-slate-600 mt-0.5">{detailPay.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Payment Entry"
        description="Select an open or partially paid invoice to allocate received funds."
        maxWidth="lg"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
              {formError}
            </div>
          )}

          <Select
            label="Select Invoice with Balance Due"
            required
            value={formPay.invoice}
            onChange={(e) => handleSelectInvoice(e.target.value)}
          >
            <option value="">-- Choose Invoice to Settle --</option>
            {openInvoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoice_number} - {inv.customer_details?.company || inv.customer_details?.name} (Balance: {formatCurrency(inv.balance_due)})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Payment Amount ($)"
              type="number"
              step="0.01"
              required
              value={formPay.amount}
              onChange={(e) => setFormPay({ ...formPay, amount: e.target.value })}
              placeholder="e.g. 500.00"
            />
            <Select
              label="Payment Method"
              required
              value={formPay.payment_method}
              onChange={(e: any) => setFormPay({ ...formPay, payment_method: e.target.value })}
              options={[
                { label: 'Bank Transfer (Wire / RTGS / NEFT)', value: 'BANK_TRANSFER' },
                { label: 'UPI', value: 'UPI' },
                { label: 'Card (POS / Terminal)', value: 'CARD' },
                { label: 'Cash', value: 'CASH' },
                { label: 'Other', value: 'OTHER' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Payment Date"
              type="date"
              required
              value={formPay.payment_date}
              onChange={(e) => setFormPay({ ...formPay, payment_date: e.target.value })}
            />
            <Input
              label="External Transaction / Ref #"
              value={formPay.transaction_reference}
              onChange={(e) => setFormPay({ ...formPay, transaction_reference: e.target.value })}
              placeholder="WIRE-123456 or UTR-987"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Internal Audit Notes</label>
            <textarea
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
              value={formPay.notes}
              onChange={(e) => setFormPay({ ...formPay, notes: e.target.value })}
              placeholder="Receipt copy, bank notes..."
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Confirm & Post Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

