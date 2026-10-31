import React from 'react'

export const MiniSplineGraphic: React.FC = () => {
  return (
    <div className="w-full h-20 relative flex items-center justify-center">
      <svg
        viewBox="0 0 200 65"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id="splineArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818CF8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#818CF8" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gradient Area Fill */}
        <path
          d="M 10 52 C 40 48, 60 56, 85 45 C 110 34, 130 38, 150 24 C 170 10, 185 14, 195 8 L 195 65 L 10 65 Z"
          fill="url(#splineArea)"
        />

        {/* Smooth Spline Line */}
        <path
          d="M 10 52 C 40 48, 60 56, 85 45 C 110 34, 130 38, 150 24 C 170 10, 185 14, 195 8"
          stroke="#6366F1"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Circular Node Points matching reference */}
        {[
          { cx: 10, cy: 52 },
          { cx: 45, cy: 50 },
          { cx: 85, cy: 45 },
          { cx: 115, cy: 36 },
          { cx: 150, cy: 24 },
          { cx: 175, cy: 12 },
          { cx: 195, cy: 8 },
        ].map((pt, i) => (
          <g key={i}>
            <circle cx={pt.cx} cy={pt.cy} r="3" fill="#FFFFFF" stroke="#6366F1" strokeWidth="2" />
          </g>
        ))}
      </svg>
    </div>
  )
}
