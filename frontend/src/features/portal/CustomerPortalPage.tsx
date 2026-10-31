import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Repeat,
  FileText,
  CreditCard,
  Download,
  Pause,
  Play,
  XCircle,
  X,
  ArrowUpRight,
  ArrowRight,
  RefreshCw,
  CalendarDays,
  AlertCircle,
  Check,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Subscription, Invoice, Payment } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { StatusText } from '@/components/ui/StatusText'

export const CustomerPortalPage = () => {
  const { user } = useAuth()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [notice, setNotice] = useState<{
    message: string
    error?: boolean
  } | null>(null)
  const [pendingAction, setPendingAction] = useState<number | null>(null)
  const [downloading, setDownloading] = useState<number | null>(null)

  const fetchPortalData = useCallback(
    () =>
      Promise.all([
        api.get('/subscriptions/'),
        api.get('/invoices/'),
        api.get('/payments/'),
      ])
        .then(([subsRes, invsRes, paysRes]) => {
          setSubscriptions(subsRes.data.results || subsRes.data)
          setInvoices(invsRes.data.results || invsRes.data)
          setPayments(paysRes.data.results || paysRes.data)
          setLoadError(false)
        })
        .catch(() => {
          setLoadError(true)
        })
        .finally(() => {
          setIsLoading(false)
        }),
    [],
  )

  useEffect(() => {
    void fetchPortalData()
  }, [fetchPortalData])

  const refresh = async () => {
    setIsRefreshing(true)
    await fetchPortalData()
    setIsRefreshing(false)
  }

  const handleSubscriptionAction = async (
    subscription: Subscription,
    action: 'pause' | 'resume' | 'close',
  ) => {
    if (
      action === 'close' &&
      !window.confirm('Are you sure you want to close this subscription?')
    )
      return
    setPendingAction(subscription.id)
    try {
      await api.post(`/subscriptions/${subscription.id}/${action}/`)
      const verb = { pause: 'paused', resume: 'resumed', close: 'closed' }[
        action
      ]
      setNotice({
        message: `Subscription ${subscription.subscription_number} ${verb}.`,
      })
      await fetchPortalData()
    } catch (error: any) {
      setNotice({
        message:
          error?.response?.data?.error ||
          error?.response?.data?.detail ||
          'We couldn’t update your subscription. Please try again.',
        error: true,
      })
    } finally {
      setPendingAction(null)
    }
  }

  const handleDownloadInvoicePDF = async (invoice: Invoice) => {
    setDownloading(invoice.id)
    try {
      const response = await api.get(`/invoices/${invoice.id}/pdf/`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(
        new Blob([response.data], { type: 'application/pdf' }),
      )
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoice.invoice_number}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setNotice({
        message: 'We couldn’t download this invoice. Please try again.',
        error: true,
      })
    } finally {
      setDownloading(null)
    }
  }

  if (isLoading)
    return (
      <div className="bl-portal-loading" role="status">
        <span className="bl-eyebrow">YOUR WORKSPACE</span>
        <h1>Getting things in order.</h1>
        <p>Loading your subscriptions and billing history…</p>
        <div className="bl-loading-line" />
        <div className="bl-loading-line" />
        <div className="bl-loading-line" />
      </div>
    )

  const activeSubscriptions = subscriptions.filter(
    (subscription) => subscription.status === 'ACTIVE',
  )
  const totalBalanceDue = invoices
    .filter((invoice) =>
      ['CONFIRMED', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status),
    )
    .reduce((sum, invoice) => sum + Number(invoice.balance_due || 0), 0)
  const nextBilling = activeSubscriptions
    .map((subscription) => subscription.next_billing_date)
    .filter(Boolean)
    .sort()[0]
  const name = user?.first_name || user?.full_name || 'there'

  return (
    <div className="bl-portal">
      <div className="bl-portal-heading">
        <div>
          <span className="bl-eyebrow">YOUR PERSONAL OVERVIEW</span>
          <h1>
            Hello, {name}
            <span>.</span>
          </h1>
          <p>
            A clear view of your subscriptions. A little more peace of mind.
          </p>
        </div>
        <button
          type="button"
          className="bl-refresh"
          onClick={refresh}
          disabled={isRefreshing}
          aria-label="Refresh dashboard"
        >
          <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {loadError && (
        <div className="bl-notice bl-notice-error" role="alert">
          <AlertCircle size={18} />
          <span>
            We couldn’t load your latest billing information. Please refresh to
            try again.
          </span>
        </div>
      )}
      {notice && (
        <div
          className={`bl-notice ${notice.error ? 'bl-notice-error' : ''}`}
          role={notice.error ? 'alert' : 'status'}
        >
          {notice.error ? <AlertCircle size={18} /> : <Check size={18} />}
          <span>{notice.message}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notification"
          >
            <X size={17} />
          </button>
        </div>
      )}
      <section className="bl-overview-stats" aria-label="Account summary">
        <div>
          <span>
            <Repeat size={16} /> Active subscriptions
          </span>
          <strong>
            {loadError
              ? '—'
              : activeSubscriptions.length}
          </strong>
          <small>Your plans, all in one place</small>
        </div>
        <div>
          <span>
            <CreditCard size={16} /> Outstanding balance
          </span>
          <strong className={totalBalanceDue > 0 ? 'bl-amount-due' : ''}>
            {loadError ? '—' : formatCurrency(totalBalanceDue)}
          </strong>
          <small>
            {totalBalanceDue > 0
              ? 'Across your open invoices'
              : 'Everything is up to date'}
          </small>
        </div>
        <div>
          <span>
            <CalendarDays size={16} /> Next billing date
          </span>
          <strong className="bl-stat-date">
            {loadError
              ? '—'
              : nextBilling
                ? formatDate(nextBilling)
                : 'Nothing scheduled'}
          </strong>
          <small>
            {nextBilling
              ? 'Your next active plan renewal'
              : 'Your next renewal will appear here'}
          </small>
        </div>
      </section>
      <nav className="bl-section-links" aria-label="Jump to billing section">
        <a href="#my-subscriptions">
          Subscriptions <ArrowRight size={14} />
        </a>
        <a href="#my-invoices">
          Invoices <ArrowRight size={14} />
        </a>
        <a href="#my-payments">
          Payment history <ArrowRight size={14} />
        </a>
      </nav>

      <section
        className="bl-portal-section"
        id="my-subscriptions"
        aria-labelledby="subscription-heading"
      >
        <div className="bl-section-heading">
          <div>
            <span className="bl-eyebrow">01 / YOUR PLANS</span>
            <h2 id="subscription-heading">Subscriptions, in order.</h2>
          </div>
          <Link to="/subscriptions" className="bl-text-link">
            View subscriptions <ArrowUpRight size={15} />
          </Link>
        </div>
        {subscriptions.length === 0 ? (
          <div className="bl-empty">
            <Repeat size={26} strokeWidth={1.3} />
            <h3>
              {loadError
                ? 'Subscriptions unavailable'
                : 'A little room for what’s next.'}
            </h3>
            <p>
              {loadError
                ? 'Refresh to load your subscriptions.'
                : 'Your subscriptions will appear here once a plan is set up.'}
            </p>
          </div>
        ) : (
          <div className="bl-subscriptions">
            {subscriptions.map((subscription) => (
              <article className="bl-subscription" key={subscription.id}>
                <div className="bl-subscription-name">
                  <span className="bl-subscription-symbol">
                    <Repeat size={21} strokeWidth={1.4} />
                  </span>
                  <div>
                    <small>{subscription.subscription_number}</small>
                    <h3>
                      {subscription.plan_details?.name || 'Subscription plan'}
                    </h3>
                    <StatusText kind="subscription" value={subscription.status} />
                  </div>
                </div>
                <div className="bl-subscription-price">
                  <strong>
                    {formatCurrency(subscription.recurring_subtotal)}
                  </strong>
                  <span>
                    {subscription.plan_details?.billing_interval
                      ? `/ ${subscription.plan_details.billing_interval.toLowerCase()}`
                      : 'per billing cycle'}
                  </span>
                </div>
                <div className="bl-subscription-date">
                  <small>Next billing</small>
                  <span>
                    {['ACTIVE', 'CONFIRMED'].includes(subscription.status)
                      ? formatDate(subscription.next_billing_date)
                      : 'Not scheduled'}
                  </span>
                </div>
                <div className="bl-subscription-actions">
                  {subscription.status === 'ACTIVE' &&
                    subscription.plan_details?.allow_pause && (
                      <button
                        type="button"
                        disabled={pendingAction !== null}
                        onClick={() =>
                          handleSubscriptionAction(subscription, 'pause')
                        }
                      >
                        <Pause size={14} />
                        Pause
                      </button>
                    )}
                  {subscription.status === 'PAUSED' && (
                    <button
                      type="button"
                      disabled={pendingAction !== null}
                      onClick={() =>
                        handleSubscriptionAction(subscription, 'resume')
                      }
                    >
                      <Play size={14} />
                      Resume
                    </button>
                  )}
                  {subscription.status === 'ACTIVE' &&
                    subscription.plan_details?.allow_early_close && (
                      <button
                        type="button"
                        className="bl-close-plan"
                        disabled={pendingAction !== null}
                        onClick={() =>
                          handleSubscriptionAction(subscription, 'close')
                        }
                      >
                        <XCircle size={14} />
                        Close plan
                      </button>
                    )}
                  {pendingAction === subscription.id && (
                    <span role="status">Updating…</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section
        className="bl-portal-section"
        id="my-invoices"
        aria-labelledby="invoice-heading"
      >
        <div className="bl-section-heading">
          <div>
            <span className="bl-eyebrow">02 / BILLING, SIMPLIFIED</span>
            <h2 id="invoice-heading">Every invoice. Right here.</h2>
          </div>
          <span className="bl-section-count">{invoices.length} invoices</span>
        </div>
        {invoices.length === 0 ? (
          <div className="bl-empty">
            <FileText size={26} strokeWidth={1.3} />
            <h3>{loadError ? 'Invoices unavailable' : 'A clean slate.'}</h3>
            <p>
              {loadError
                ? 'Refresh to load your invoices.'
                : 'When an invoice is generated, you can view and download it here.'}
            </p>
          </div>
        ) : (
          <div
            className="bl-table-scroll"
            role="region"
            aria-label="Your invoices"
            tabIndex={0}
          >
            <table className="bl-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Issued</th>
                  <th>Due date</th>
                  <th>Total</th>
                  <th>Balance due</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Download</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <th scope="row">{invoice.invoice_number}</th>
                    <td>{formatDate(invoice.issue_date)}</td>
                    <td>{formatDate(invoice.due_date)}</td>
                    <td>{formatCurrency(invoice.total_amount)}</td>
                    <td
                      className={
                        Number(invoice.balance_due) > 0 ? 'bl-amount-due' : ''
                      }
                    >
                      {formatCurrency(invoice.balance_due)}
                    </td>
                    <td>
                      <StatusText kind="invoice" value={invoice.status} />
                    </td>
                    <td>
                      <button
                        className="bl-download"
                        type="button"
                        onClick={() => handleDownloadInvoicePDF(invoice)}
                        disabled={downloading !== null}
                        aria-label={`Download ${invoice.invoice_number} PDF`}
                      >
                        <Download size={16} />
                        {downloading === invoice.id ? 'Downloading…' : 'PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        className="bl-portal-section"
        id="my-payments"
        aria-labelledby="payment-heading"
      >
        <div className="bl-section-heading">
          <div>
            <span className="bl-eyebrow">03 / ALL ACCOUNTED FOR</span>
            <h2 id="payment-heading">Your payment history.</h2>
          </div>
          <Link to="/payments" className="bl-text-link">
            View payments <ArrowUpRight size={15} />
          </Link>
        </div>
        {payments.length === 0 ? (
          <div className="bl-empty">
            <CreditCard size={26} strokeWidth={1.3} />
            <h3>
              {loadError
                ? 'Payments unavailable'
                : 'Nothing to keep track of. Yet.'}
            </h3>
            <p>
              {loadError
                ? 'Refresh to load your payments.'
                : 'Your payment records will appear here after your first payment.'}
            </p>
          </div>
        ) : (
          <div
            className="bl-table-scroll"
            role="region"
            aria-label="Your payment history"
            tabIndex={0}
          >
            <table className="bl-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th className="bl-align-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <th scope="row">{payment.payment_number}</th>
                    <td>{payment.invoice_number || '—'}</td>
                    <td>{formatDate(payment.payment_date)}</td>
                    <td className="bl-method">
                      {payment.payment_method
                        .replaceAll('_', ' ')
                        .toLowerCase()}
                    </td>
                    <td>{payment.transaction_reference || '—'}</td>
                    <td className="bl-align-right bl-paid-amount">
                      {formatCurrency(payment.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <div className="bl-portal-endnote">
        <span>Everything in its place.</span>
        <p>
          Keep your contact details current for a smoother billing experience.
        </p>
        <Link to="/profile" className="bl-text-link">
          Manage your account <ArrowUpRight size={15} />
        </Link>
      </div>
    </div>
  )
}
