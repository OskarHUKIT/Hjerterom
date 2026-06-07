'use client'

import type { ReactNode } from 'react'

export default function OpsToolbar({
  children,
  futureOrgSlot,
}: {
  children: ReactNode
  /** Reserved for multi-tenant SaaS: organization / client filter */
  futureOrgSlot?: ReactNode
}) {
  return (
    <div className="ops-toolbar">
      <div className="ops-toolbar-filters">{children}</div>
      {futureOrgSlot ? <div className="ops-toolbar-org">{futureOrgSlot}</div> : null}
    </div>
  )
}
