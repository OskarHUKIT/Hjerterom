'use client'

import Link from 'next/link'
import { ChevronRight, Check, User, AlertTriangle, Megaphone } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatDateTimeNo } from '@/app/lib/dateFormat'
import type { OpsAuditItem } from '@/app/lib/opsApi'

function iconForAction(actionType: string): { Icon: LucideIcon; tone: 'success' | 'accent' | 'warning' | 'neutral' } {
  if (actionType.startsWith('SIGN_')) return { Icon: Check, tone: 'success' }
  if (actionType.includes('ROLE')) return { Icon: User, tone: 'accent' }
  if (actionType.includes('MODULE') || actionType.includes('DEGRADED')) {
    return { Icon: AlertTriangle, tone: 'warning' }
  }
  if (actionType.includes('BROADCAST')) return { Icon: Megaphone, tone: 'neutral' }
  return { Icon: Megaphone, tone: 'neutral' }
}

function actionTitle(actionType: string): string {
  return actionType.replace(/_/g, ' ')
}

export default function OpsMobileActivityFeed({
  items,
  title,
  viewAllHref,
  viewAllLabel,
  emptyLabel,
}: {
  items: OpsAuditItem[]
  title: string
  viewAllHref?: string
  viewAllLabel?: string
  emptyLabel?: string
}) {
  return (
    <section className="ops-mobile-activity">
      <div className="ops-mobile-activity-head">
        <p className="ops-label-uc">{title}</p>
        {viewAllHref && viewAllLabel ? (
          <Link href={viewAllHref} className="ops-mobile-activity-link">
            {viewAllLabel}
          </Link>
        ) : null}
      </div>
      <div className="ops-panel ops-panel--pad-md">
        {items.length === 0 ? (
          <p className="ops-meta py-2 text-center text-sm">{emptyLabel ?? '—'}</p>
        ) : (
          items.map((row) => {
            const { Icon, tone } = iconForAction(row.action_type)
            return (
              <div key={row.id} className="ops-activity-row">
                <div className={`ops-activity-row-icon ops-activity-row-icon--${tone}`}>
                  <Icon size={16} aria-hidden />
                </div>
                <div className="ops-activity-row-body">
                  <p className="ops-activity-row-title">{actionTitle(row.action_type)}</p>
                  <p className="ops-activity-row-meta">
                    {row.listing_address ??
                      (typeof row.details?.email === 'string' ? row.details.email : null) ??
                      '—'}{' '}
                    · <time dateTime={row.created_at}>{formatDateTimeNo(row.created_at)}</time>
                  </p>
                </div>
                <ChevronRight size={16} className="ops-activity-row-chevron" aria-hidden />
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
