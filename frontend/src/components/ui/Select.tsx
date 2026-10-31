import React from 'react'
import { cn } from '@/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options?: Array<{ label: string; value: string | number }>
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, children, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold text-slate-700">
            {label} {props.required && <span className="text-red-500">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all',
            'disabled:bg-slate-50 disabled:text-slate-500',
            error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
            className
          )}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-slate-500">{helperText}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'

