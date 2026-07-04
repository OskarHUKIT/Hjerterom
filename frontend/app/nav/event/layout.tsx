'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Map as MapIcon, MessageSquare, Ticket } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import LoadingPlaceholder from '@/app/components/LoadingPlaceholder'
import { useAuthGate } from '@/features/auth/hooks/useAuthGate'

const NAV = [
  { href: '/nav/event/database', icon: MapIcon, labelKey: 'eventNavDatabase' as const },
  { href: '/nav/event/inquiries', icon: CalendarDays, labelKey: 'eventNavInquiries' as const },
  { href: '/nav/event/messages', icon: MessageSquare, labelKey: 'eventNavMessages' as const },
]

export default function EventStaffLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage()
  const pathname = usePathname()
  const { data: access, isPending } = useAuthGate({
    mode: 'event-staff',
    loginRedirect: '/nav/event',
    redirectForbidden: true,
  })

  if (isPending || !access || access.kind !== 'ok') {
    return (
      <div style={{ padding: 'var(--space-6)' }}>
        <LoadingPlaceholder />
      </div>
    )
  }

  return (
    <div className="event-staff-shell">
      <header className="event-staff-header">
        <span className="event-staff-badge">
          <Ticket size={14} aria-hidden />
          {t('eventStaffBadge')}
        </span>
        <nav className="event-staff-nav" aria-label={t('eventNavDatabase')}>
          {NAV.map(({ href, icon: Icon, labelKey }) => {
            const active = pathname === href || (href !== '/nav/event' && pathname?.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`event-staff-nav-link${active ? ' event-staff-nav-link--active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={16} aria-hidden />
                {t(labelKey)}
              </Link>
            )
          })}
        </nav>
      </header>
      <main className="event-staff-main">{children}</main>
    </div>
  )
}
