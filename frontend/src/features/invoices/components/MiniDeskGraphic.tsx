import React from 'react'

export const MiniDeskGraphic: React.FC = () => {
  return (
    <div className="relative w-full h-20 overflow-hidden rounded-xl bg-gradient-to-b from-slate-50 to-slate-100/80 border border-slate-100 flex items-end justify-center px-4 pt-1">
      <svg
        viewBox="0 0 240 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full max-w-[200px]"
      >
        {/* Soft background warm gradient / window glow */}
        <ellipse cx="120" cy="40" rx="90" ry="35" fill="#EEF2FF" />
        <ellipse cx="180" cy="30" rx="30" ry="25" fill="#FEF3C7" opacity="0.6" />

        {/* Desk Surface */}
        <rect x="10" y="66" width="220" height="6" rx="3" fill="#D1D5DB" />
        <rect x="14" y="70" width="212" height="2" rx="1" fill="#9CA3AF" />

        {/* Minimalist Potted Plant (Left) */}
        {/* Pot */}
        <path d="M 38 52 L 44 66 L 30 66 L 36 52 Z" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1" />
        {/* Plant Leaves */}
        <ellipse cx="37" cy="46" rx="5" ry="8" fill="#10B981" />
        <ellipse cx="32" cy="48" rx="4" ry="7" transform="rotate(-25 32 48)" fill="#059669" />
        <ellipse cx="42" cy="48" rx="4" ry="7" transform="rotate(25 42 48)" fill="#34D399" />
        <ellipse cx="37" cy="40" rx="3" ry="6" fill="#10B981" />

        {/* Laptop (Center) */}
        {/* Screen Bezel */}
        <rect x="85" y="28" width="56" height="36" rx="3" fill="#1E293B" />
        {/* Display screen */}
        <rect x="88" y="31" width="50" height="30" rx="1.5" fill="#3B82F6" opacity="0.9" />
        {/* Chart / UI on laptop screen */}
        <line x1="93" y1="52" x2="101" y2="44" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="101" y1="44" x2="110" y2="48" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="110" y1="48" x2="120" y2="38" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="120" y1="38" x2="132" y2="42" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        {/* Laptop Keyboard Base */}
        <path d="M 80 66 L 85 64 L 141 64 L 146 66 Z" fill="#94A3B8" />
        <rect x="106" y="65" width="14" height="1" rx="0.5" fill="#64748B" />

        {/* Coffee Cup / Mug */}
        <rect x="154" y="58" width="8" height="8" rx="1.5" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
        <path d="M 162 60 C 164 60, 164 64, 162 64" stroke="#CBD5E1" strokeWidth="1" fill="none" />
        {/* Steam */}
        <path d="M 158 54 Q 159 52 158 50" stroke="#CBD5E1" strokeWidth="0.8" fill="none" strokeLinecap="round" />

        {/* Modern Desk Task Lamp (Right) */}
        {/* Base */}
        <ellipse cx="188" cy="65" rx="8" ry="2" fill="#334155" />
        {/* Lamp Arm angled */}
        <path d="M 188 65 L 186 38 L 174 28" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Joint knob */}
        <circle cx="186" cy="38" r="2" fill="#64748B" />
        {/* Lamp Shade cone */}
        <path d="M 168 24 L 180 26 L 170 34 Z" fill="#1E293B" />
        {/* Light beam / glow cone */}
        <polygon points="171,32 155,65 178,65" fill="#FEF3C7" opacity="0.35" />
      </svg>
    </div>
  )
}
