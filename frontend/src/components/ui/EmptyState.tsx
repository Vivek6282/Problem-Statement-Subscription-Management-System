import React from 'react'
import { FolderOpen } from 'lucide-react'
import { Button } from './Button'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div className="py-14 px-6 text-center flex flex-col items-center justify-center border border-slate-200 rounded-2xl bg-white">
      <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-4">
        {icon || <FolderOpen className="w-5 h-5" />}
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="text-xs leading-relaxed text-slate-500 max-w-sm mt-1 mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

