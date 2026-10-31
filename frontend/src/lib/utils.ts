import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '$0.00'
  }
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric)
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  try {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

export function formatDateTime(dateTimeString: string | null | undefined): string {
  if (!dateTimeString) return '-'
  try {
    const d = new Date(dateTimeString)
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateTimeString
  }
}


/** Money stays a Decimal string in state; convert to a number only for chart data. */
export function mapTrendForChart<T extends { billed: string | number; collected: string | number }>(
  rows: T[] | undefined | null,
): Array<Omit<T, 'billed' | 'collected'> & { billed: number; collected: number }> {
  return (rows ?? []).map((row) => ({
    ...row,
    billed: Number(row.billed),
    collected: Number(row.collected),
  }))
}
