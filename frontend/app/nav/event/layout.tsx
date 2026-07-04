'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CalendarDays, Map as MapIcon, MessageSquare } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { isEventStaffRole } from '@/app/lib/eventStaffRoles'
import ShellChromeControls from '@/app/components/design-system/ShellChromeControls'
import LoadingPlaceholder from '@/app/components/LoadingPlaceholder'

const NAV = [
  { href: '/nav/event/database', icon: MapIcon, labelKey: 'eventNavDatabase' as const },
  { href: '/nav/event/inquiries', icon: CalendarDays, labelKey: 'eventNavInquiries' as const },
  { href: '/nav/event/messages', icon: MessageSquare, labelKey: 'eventNavMessages' as const },
]

export default function EventStaffLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [eventNames, setEventNames] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        router.replace('/login?redirect=/nav/event')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', auth.user.id)
        .maybeSingle()
      if (cancelled) return
      if (!isEventStaffRole(profile?.role)) {
        router.replace('/')
        return
      }

      const { data: staffRows } = await supabase
        .from('central_event_staff')
        .select('event_id')
        .eq('profile_id', auth.user.id)

      const eventIds = (staffRows ?? []).map((r) => r.event_id)
      let names: string[] = []
      if (eventIds.length > 0) {
        const { data: events } = await supabase
          .from('central_events')
          .select('name')
          .in('id', eventIds)
        names = (events ?? [])
          .map((e) => e.name)
          .filter((name): name is string => typeof name === 'string' && name.length > 0)
      }

      if (!cancelled) {
        setEventNames(names)
        setAllowed(true)
        setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  if (!ready) {
    return (
      <div style={{ padding: 'var(--space-6)' }}>
        <LoadingPlaceholder />
      </div>
    )
  }

  if (!allowed) return null

  const badgeLabel =
    eventNames.length > 0
      ? `${t('eventStaffBadge')} · ${eventNames.join(', ')}`
      : t('eventStaffBadge')

  return (
    <div className="event-staff-shell">
      <header className="event-staff-header">
        <span className="event-staff-badge">🎫 {badgeLabel}</span>
        <nav className="event-staff-nav" aria-label={t('eventStaffNavAria')}>
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
        <ShellChromeControls compact className="event-staff-chrome" />
      </header>
      <main className="event-staff-main">{children}</main>
    </div>
  )
}
