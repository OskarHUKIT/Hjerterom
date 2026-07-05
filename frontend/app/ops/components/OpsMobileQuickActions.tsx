'use client'

import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'

export type OpsMobileQuickAction = {
  href: string
  label: string
  icon: LucideIcon
  accent?: 'accent' | 'success' | 'warning' | 'danger'
}

export default function OpsMobileQuickActions({ actions }: { actions: OpsMobileQuickAction[] }) {
  return (
    <div className="ops-mobile-quick-grid">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <Link
            key={action.href}
            href={action.href}
            className={`ops-mobile-quick-btn${action.accent ? ` ops-mobile-quick-btn--${action.accent}` : ''}`}
          >
            <Icon size={20} aria-hidden />
            <span>{action.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
