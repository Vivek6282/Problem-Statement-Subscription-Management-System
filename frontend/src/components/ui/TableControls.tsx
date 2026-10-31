import React from 'react'
import { ArrowUpDown, CalendarRange, X } from 'lucide-react'

export interface OrderingOption {
  label: string
  value: string
}

interface TableControlsProps {
  orderingOptions: OrderingOption[]
  ordering: string
  onOrderingChange: (value: string) => void
  dateLabel?: string
  dateFrom?: string
  dateTo?: string
  onDateFromChange?: (value: string) => void
  onDateToChange?: (value: string) => void
}

const field =
  'text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary'

/** Sort selector and optional date-range filter shared by the transactional list pages. */
export const TableControls: React.FC<TableControlsProps> = ({
  orderingOptions, ordering, onOrderingChange, dateLabel, dateFrom = '', dateTo = '', onDateFromChange, onDateToChange,
}) => (
  <div className="flex flex-wrap items-center gap-3">
    <label className="flex items-center gap-1.5 text-xs text-slate-500">
      <ArrowUpDown className="w-3.5 h-3.5" />
      <span className="sr-only">Sort by</span>
      <select value={ordering} onChange={(e) => onOrderingChange(e.target.value)} className={field} aria-label="Sort by">
        {orderingOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
    {onDateFromChange && onDateToChange && (
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <CalendarRange className="w-3.5 h-3.5" />
        <span className="font-semibold">{dateLabel || 'Date'}</span>
        <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => onDateFromChange(e.target.value)} className={field} aria-label={`${dateLabel || 'Date'} from`} />
        <span>–</span>
        <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => onDateToChange(e.target.value)} className={field} aria-label={`${dateLabel || 'Date'} to`} />
        {(dateFrom || dateTo) && (
          <button type="button" onClick={() => { onDateFromChange(''); onDateToChange('') }} className="p-1 text-slate-400 hover:text-slate-700" title="Clear dates">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    )}
  </div>
)
