import React from 'react'

export const MiniBarGraphic: React.FC = () => {
  const bars = [
    { label: 'Jul', height: 28, active: false },
    { label: 'Aug', height: 42, active: false },
    { label: 'Sep', height: 60, active: false },
    { label: 'Oct', height: 50, active: false },
    { label: 'Nov', height: 78, active: true },
    { label: 'Dec', height: 68, active: false },
  ]

  return (
    <div className="w-full h-20 flex items-end justify-between gap-2 px-2 pt-2">
      {bars.map((bar, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
          <div
            className={`w-full rounded-t-md transition-all ${
              bar.active ? 'bg-[#6366F1] shadow-sm' : 'bg-[#C7D2FE] hover:bg-[#A5B4FC]'
            }`}
            style={{ height: `${bar.height}%` }}
          />
          <span className="text-[10px] text-slate-400 font-medium">{bar.label}</span>
        </div>
      ))}
    </div>
  )
}
