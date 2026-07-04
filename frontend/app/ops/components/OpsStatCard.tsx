'use client'

import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export type OpsStatAccent = 'default' | 'primary' | 'success' | 'warning' | 'info'

type OpsStatCardProps = {
  label: string
  value: number | string
  icon?: LucideIcon
  delta?: number | null
  deltaLabel?: string
  href?: string
  accent?: OpsStatAccent
  className?: string
}

/** 21st-inspired KPI card for ops dashboard (NPD-5 #20 pattern). */
export default function OpsStatCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  href,
  accent = 'default',
  className,
}: OpsStatCardProps) {
  const deltaTone =
    delta == null || delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down'
  const deltaText =
    delta == null
      ? null
      : (deltaLabel ?? (delta > 0 ? `+${delta}` : delta === 0 ? '0' : String(delta)))

  const card = (
    <Card
      size="sm"
      className={cn(
        'ops-stat-card group transition-all',
        `ops-stat-card--${accent}`,
        href && 'ops-stat-card--interactive',
        className,
      )}
    >
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon ? (
          <span className="ops-stat-card-icon" aria-hidden>
            <Icon size={16} />
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div className="flex items-end justify-between gap-2">
          <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight">{value}</CardTitle>
          {deltaText != null ? (
            <Badge
              variant="outline"
              className={cn(
                'tabular-nums',
                deltaTone === 'up' && 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
                deltaTone === 'down' && 'border-red-500/40 text-red-600 dark:text-red-400',
              )}
            >
              {deltaText}
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="ops-stat-card-link">
        {card}
      </Link>
    )
  }

  return card
}
