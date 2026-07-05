'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Map as MapIcon, MessageSquare, Ticket } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import LoadingPlaceholder from '@/app/components/LoadingPlaceholder'
import ShellChromeControls from '@/app/components/design-system/ShellChromeControls'
import ShellLogoutButton from '@/app/components/design-system/ShellLogoutButton'
import { CommandPaletteTrigger } from '@/components/layout/command-palette-provider'
import MobilePageTransition from '@/components/layout/mobile-page-transition'
import { useAuthGate } from '@/features/auth/hooks/useAuthGate'
import EventMobileShellNav from './components/EventMobileShellNav'

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
      <header className="event-staff-header hrt-glass-header event-staff-header--desktop">
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
        <div className="event-staff-header-actions">
          <CommandPaletteTrigger compact />
          <ShellChromeControls compact className="event-staff-chrome" />
          <ShellLogoutButton compact />
        </div>
      </header>

      <header className="event-staff-header-mobile event-staff-header--mobile">
        <span className="event-staff-badge">
          <Ticket size={14} aria-hidden />
          {t('eventStaffBadge')}
        </span>
        <div className="event-staff-header-actions">
          <CommandPaletteTrigger compact />
          <ShellChromeControls compact className="event-staff-chrome" />
          <ShellLogoutButton compact />
        </div>
      </header>

      <main className="event-staff-main">
        <MobilePageTransition>{children}</MobilePageTransition>
      </main>

      <EventMobileShellNav />
    </div>
  )
}
