import React from 'react'

interface MiniPayoutGraphicProps {
  onPayout?: () => void
}

export const MiniPayoutGraphic: React.FC<MiniPayoutGraphicProps> = ({ onPayout }) => {
  return (
    <div className="w-full h-20 flex items-center justify-between gap-2 pt-2">
      <div className="flex items-center gap-1.5 flex-1 overflow-x-auto py-1">
        {/* Visa */}
        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-100 min-w-[58px] hover:border-slate-200 transition-colors">
          <span className="text-[9px] text-slate-400 font-mono">•••• 4242</span>
          <span className="text-[10px] font-bold text-slate-700 tracking-tight">Visa</span>
        </div>

        {/* Stripe - Highlighted Active Card */}
        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gradient-to-tr from-[#4F46E5] to-[#6366F1] text-white shadow-sm shadow-indigo-500/20 min-w-[62px]">
          <span className="text-[9px] text-indigo-200 font-mono">•••• 6789</span>
          <span className="text-[10px] font-extrabold tracking-tight">Stripe</span>
        </div>

        {/* PayPal */}
        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-100 min-w-[58px] hover:border-slate-200 transition-colors">
          <span className="text-[9px] text-slate-400 font-mono">•••• 1234</span>
          <span className="text-[10px] font-bold text-slate-700 tracking-tight">PayPal</span>
        </div>
      </div>

      <button
        onClick={onPayout}
        type="button"
        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm whitespace-nowrap active:scale-95"
      >
        Payout now
      </button>
    </div>
  )
}
