'use client'

import type { ReactNode } from 'react'

type OpsPanelProps = {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'none'
  title?: string
  description?: string
  actions?: ReactNode
}

const padClass = {
  none: '',
  sm: 'ops-panel--pad-sm',
  md: 'ops-panel--pad-md',
  lg: 'ops-panel--pad-lg',
} as const

export default function OpsPanel({
  children,
  className,
  padding = 'md',
  title,
  description,
  actions,
}: OpsPanelProps) {
  return (
    <section className={['ops-panel', padClass[padding], className].filter(Boolean).join(' ')}>
      {title || actions ? (
        <div className="ops-panel-head">
          <div>
            {title ? <h2 className="ops-panel-title">{title}</h2> : null}
            {description ? <p className="ops-panel-desc">{description}</p> : null}
          </div>
          {actions ? <div className="ops-panel-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
