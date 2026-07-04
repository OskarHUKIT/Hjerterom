'use client'

import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type OpsQuickAction = {
  href: string
  label: string
  description: string
  icon: LucideIcon
  accent?: 'default' | 'primary' | 'success' | 'warning'
}

export default function OpsQuickActionGrid({ actions }: { actions: OpsQuickAction[] }) {
  return (
    <div className="ops-quick-action-grid">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <Link key={action.href} href={action.href} className="ops-quick-action-link">
            <Card
              size="sm"
              className={cn(
                'ops-quick-action-card group h-full',
                action.accent && `ops-quick-action-card--${action.accent}`,
              )}
            >
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="ops-quick-action-icon" aria-hidden>
                    <Icon size={20} />
                  </span>
                  <ArrowUpRight
                    size={16}
                    className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </div>
                <CardTitle className="text-base">{action.label}</CardTitle>
                <CardDescription className="line-clamp-2">{action.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
