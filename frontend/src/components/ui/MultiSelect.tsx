import React from 'react'

interface MultiSelectProps {
  label: string
  options: Array<{ value: number; label: string }>
  selected: number[]
  onChange: (selected: number[]) => void
  helperText?: string
}

/** Compact checkbox list for choosing several related records (e.g. applicable products). */
export const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, selected, onChange, helperText }) => {
  const toggle = (value: number) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">{label}</label>
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-[11px] text-slate-500 hover:text-slate-800 underline">
            Clear ({selected.length})
          </button>
        )}
      </div>
      <div className="max-h-32 overflow-y-auto border border-slate-300 rounded-lg bg-white divide-y divide-slate-100">
        {options.length === 0 ? (
          <p className="p-2.5 text-xs text-slate-400">Nothing available yet.</p>
        ) : (
          options.map((o) => (
            <label key={o.value} className="flex items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="text-slate-700">{o.label}</span>
            </label>
          ))
        )}
      </div>
      {helperText && <p className="text-[11px] text-slate-500">{helperText}</p>}
    </div>
  )
}
