'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Map as MapIcon, MessageSquare } from 'lucide-react'
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          padding: '12px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          background: 'var(--bg-subtle)',
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: '0.85rem',
            padding: '4px 10px',
            borderRadius: 999,
            background: 'rgba(168, 85, 247, 0.15)',
            border: '1px solid rgba(168, 85, 247, 0.35)',
          }}
        >
          🎫 {t('eventStaffBadge')}
        </span>
        <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          {NAV.map(({ href, icon: Icon, labelKey }) => {
            const active = pathname === href || (href !== '/nav/event' && pathname?.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  color: active ? 'var(--text-main)' : 'var(--text-muted)',
                  background: active ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                }}
              >
                <Icon size={16} aria-hidden />
                {t(labelKey)}
              </Link>
            )
          })}
        </nav>
      </header>
      <main style={{ flex: 1, padding: 'var(--space-4)', width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
