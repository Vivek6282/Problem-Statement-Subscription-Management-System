import React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, helperText, type = 'text', id, ...props },
    ref,
  ) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-slate-700"
          >
            {label} {props.required && <span className="text-red-500">*</span>}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || helperText ? `${inputId}-hint` : undefined}
          ref={ref}
          className={cn(
            'w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400',
            'hover:border-slate-300 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 transition-colors',
            'disabled:bg-slate-50 disabled:text-slate-500',
            error && 'border-red-500 hover:border-red-500 focus:border-red-500 focus:ring-red-500/15',
            className,
          )}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-hint`}
            className="text-xs text-red-600 font-medium"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
