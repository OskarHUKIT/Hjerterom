'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTimeNo } from '@/app/lib/dateFormat'
import type { OpsAuditItem } from '@/app/lib/opsApi'

function actionLabel(actionType: string): string {
  return actionType.replace(/_/g, ' ').toLowerCase()
}

export default function OpsActivityFeed({
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
    <Card className="ops-activity-feed">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        {viewAllHref && viewAllLabel ? (
          <Link href={viewAllHref} className="ops-link text-sm font-medium">
            {viewAllLabel}
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <p className="ops-meta py-4 text-center text-sm">{emptyLabel ?? '—'}</p>
        ) : (
          <ol className="ops-activity-list">
            {items.map((row, index) => (
              <li
                key={row.id}
                className={cn('ops-activity-item', index === items.length - 1 && 'ops-activity-item--last')}
              >
                <span className="ops-activity-dot" aria-hidden />
                <div className="ops-activity-body">
                  <p className="ops-activity-title">{actionLabel(row.action_type)}</p>
                  <time className="ops-activity-time" dateTime={row.created_at}>
                    {formatDateTimeNo(row.created_at)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
