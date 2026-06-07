'use client'

import type { ReactNode } from 'react'

type OpsPageHeaderProps = {
  title: string
  lead?: ReactNode
  actions?: ReactNode
  breadcrumb?: ReactNode
}

export default function OpsPageHeader({ title, lead, actions, breadcrumb }: OpsPageHeaderProps) {
  return (
    <header className="ops-page-header">
      {breadcrumb ? <div className="ops-page-breadcrumb">{breadcrumb}</div> : null}
      <div className="ops-page-header-row">
        <div className="ops-page-header-copy">
          <h1 className="ops-page-title">{title}</h1>
          {lead ? <p className="ops-page-lead">{lead}</p> : null}
        </div>
        {actions ? <div className="ops-page-header-actions">{actions}</div> : null}
      </div>
    </header>
  )
}
