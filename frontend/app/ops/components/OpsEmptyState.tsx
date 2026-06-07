'use client'

import type { ReactNode } from 'react'

export default function OpsEmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="ops-empty" role="status">
      <p className="ops-empty-title">{title}</p>
      {description ? <p className="ops-empty-desc">{description}</p> : null}
      {action ? <div className="ops-empty-action">{action}</div> : null}
    </div>
  )
}
