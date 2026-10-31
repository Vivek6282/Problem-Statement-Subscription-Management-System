import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

let currencyCode = 'USD'

/** Set the display currency (ISO 4217). Amounts are never converted, only labelled. */
export function setCurrencyCode(code: string | null | undefined) {
  const next = (code || '').trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(next)) return
  try {
    new Intl.NumberFormat('en-US', { style: 'currency', currency: next })
    currencyCode = next
  } catch {
    // Unknown currency code: keep the current one.
  }
}

export function getCurrencyCode(): string {
  return currencyCode
}

export function formatCurrency(amount: number | string | null | undefined): string {
  const numeric =
    amount === null || amount === undefined || isNaN(Number(amount)) ? 0 : Number(amount)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
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

/** Short axis label such as "$1.2K" in the configured currency. */
export function formatCompactCurrency(amount: number | string | null | undefined): string {
  const numeric =
    amount === null || amount === undefined || isNaN(Number(amount)) ? 0 : Number(amount)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(numeric)
}
