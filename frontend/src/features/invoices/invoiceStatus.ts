import type { BadgeProps } from '@/components/ui/Badge'

type BadgeVariant = NonNullable<BadgeProps['variant']>

const invoiceStatus: Record<string, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: 'Draft', variant: 'neutral' },
  CONFIRMED: { label: 'Due', variant: 'info' },
  PARTIALLY_PAID: { label: 'Partially paid', variant: 'warning' },
  PAID: { label: 'Paid', variant: 'success' },
  OVERDUE: { label: 'Overdue', variant: 'danger' },
  CANCELLED: { label: 'Cancelled', variant: 'neutral' },
}

export function getInvoiceStatus(status: string, isOverdue = false) {
  if (isOverdue && status !== 'PAID' && status !== 'CANCELLED') return invoiceStatus.OVERDUE
  return invoiceStatus[status] ?? { label: status, variant: 'neutral' as BadgeVariant }
}
