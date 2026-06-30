'use client'

import type { ReactNode } from 'react'
import { Info } from 'lucide-react'

type Props = {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

export default function EmptyState({ title, description, action, icon, className }: Props) {
  return (
    <div
      className={className ? `ds-empty card ${className}` : 'ds-empty card'}
      role="status"
    >
      <div className="ds-empty-icon" aria-hidden>
        {icon ?? <Info size={28} />}
      </div>
      <p className="ds-empty-title">{title}</p>
      {description ? <p className="ds-empty-desc">{description}</p> : null}
      {action ? <div className="ds-empty-action">{action}</div> : null}
    </div>
  )
}
