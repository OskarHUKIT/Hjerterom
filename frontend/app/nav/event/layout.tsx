'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CalendarDays, Building2, Inbox } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { isEventStaffRole } from '@/app/lib/eventStaffRoles'
import LoadingPlaceholder from '@/app/components/LoadingPlaceholder'

const NAV = [
  { href: '/nav/event', icon: Inbox, labelKey: 'eventNavDashboard' as const },
  { href: '/nav/event/inquiries', icon: CalendarDays, labelKey: 'eventNavInquiries' as const },
  { href: '/nav/event/listings', icon: Building2, labelKey: 'eventNavListings' as const },
]

export default function EventStaffLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)

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
      setAllowed(true)
      setReady(true)
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
      <main style={{ flex: 1, padding: 'var(--space-4)', maxWidth: 960, width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
