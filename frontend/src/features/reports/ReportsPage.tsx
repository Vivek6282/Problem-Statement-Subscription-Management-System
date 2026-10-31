import React, { useState, useEffect } from 'react'
import {
  BarChart3,
  Download,
  Calendar,
  Layers,
  Package,
  CreditCard,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'

const COLORS = ['#2563EB', '#16A34A', '#F59E0B', '#9333EA', '#0F172A', '#06B6D4']

export const ReportsPage: React.FC = () => {
  const [productData, setProductData] = useState<any[]>([])
  const [planData, setPlanData] = useState<any[]>([])
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchReports = async () => {
    setIsLoading(true)
    try {
      const [prodRes, planRes, payRes] = await Promise.all([
        api.get('/reports/revenue-by-product/'),
        api.get('/reports/revenue-by-plan/'),
        api.get('/reports/payment-methods/'),
      ])
      setProductData(prodRes.data)
      setPlanData(planRes.data)
      setPaymentMethods(payRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const handleExportCSV = async (type: 'invoices' | 'subscriptions' | 'payments') => {
    try {
      const res = await api.get(`/reports/export-csv/?type=${type}`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `brightloop_${type}_report.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error('Export CSV error:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Financial Reports & Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Billed revenue breakdown, plan recurring velocity, and payment method settlement analytics
          </p>
        </div>

        {/* CSV Export Quick Actions */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => handleExportCSV('invoices')}>
            <Download className="w-3.5 h-3.5 mr-1" /> Export Invoices CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExportCSV('subscriptions')}>
            <Download className="w-3.5 h-3.5 mr-1" /> Export Subscriptions CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExportCSV('payments')}>
            <Download className="w-3.5 h-3.5 mr-1" /> Export Payments CSV
          </Button>
        </div>
      </div>

      {/* Revenue by Product Chart & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <CardTitle>Revenue by Billable Item</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productData} layout="vertical" margin={{ left: 30, right: 20 }}>
                <XAxis type="number" tickFormatter={(v) => `$${v}`} fontSize={11} stroke="#94A3B8" />
                <YAxis dataKey="product_name" type="category" width={110} fontSize={10} stroke="#94A3B8" />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Total Revenue']}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="total_revenue" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <CardTitle>Cash Settlements by Payment Method</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="h-72 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={paymentMethods}
                  dataKey="total_amount"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {paymentMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Total Settled']}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
              {paymentMethods.map((m, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span>{m.method}: <b>{formatCurrency(m.total_amount)}</b></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <CardTitle>Recurring Plan Yield & MRR Contribution</CardTitle>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">Plan Name</th>
                <th className="py-3 px-4">Interval</th>
                <th className="py-3 px-4">Base Rate</th>
                <th className="py-3 px-4">Active Subscribers</th>
                <th className="py-3 px-4 text-right">Estimated Plan MRR Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {planData.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{p.plan_name}</td>
                  <td className="py-3.5 px-4">
                    <Badge variant="neutral">{p.billing_interval}</Badge>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">{formatCurrency(p.price)}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{p.active_subscribers}</td>
                  <td className="py-3.5 px-4 font-black text-primary text-right text-sm">
                    {formatCurrency(p.estimated_mrr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

