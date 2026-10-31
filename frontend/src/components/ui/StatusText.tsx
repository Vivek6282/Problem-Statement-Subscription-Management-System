import '@/styles/brightloop.css'

const LABELS: Record<'invoice' | 'subscription', Record<string, string>> = {
  invoice: {
    DRAFT: 'Draft',
    CONFIRMED: 'Due',
    PARTIALLY_PAID: 'Partially paid',
    PAID: 'Paid',
    OVERDUE: 'Overdue',
    CANCELLED: 'Cancelled',
  },
  subscription: {
    DRAFT: 'Draft',
    QUOTATION: 'Quotation',
    CONFIRMED: 'Confirmed',
    ACTIVE: 'Active',
    PAUSED: 'Paused',
    CLOSED: 'Closed',
  },
}

const POSITIVE = ['ACTIVE', 'PAID']
const PENDING = ['PAUSED', 'PARTIALLY_PAID', 'CONFIRMED', 'QUOTATION']

/** A colored dot plus a plain-language label, so status never relies on color alone. */
export function StatusText({
  value,
  kind,
}: {
  value: string
  kind: 'invoice' | 'subscription'
}) {
  const tone = POSITIVE.includes(value)
    ? 'positive'
    : PENDING.includes(value)
      ? 'pending'
      : value === 'OVERDUE'
        ? 'overdue'
        : 'neutral'
  const label =
    LABELS[kind][value] ?? value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ')
  return (
    <span className={`bl-status bl-status-${tone}`}>
      <span aria-hidden="true" />
      {label}
    </span>
  )
}
