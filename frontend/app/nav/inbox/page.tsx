// mobile-decision: Innboks stub — triage feed lands here in Phase 2; interim links keep kommune mobile loop unblocked.
'use client'

import Link from 'next/link'
import { CalendarDays, Inbox, MessageSquare, TimerOff } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { usePlatformMode } from '@/context/PlatformModeContext'
import MobilePageTransition from '@/components/layout/mobile-page-transition'

export default function NavInboxPage() {
  const { t } = useLanguage()
  const { flags } = usePlatformMode()

  const shortcuts = [
    flags.centralEvents
      ? {
          href: '/nav/event-inquiries',
          icon: CalendarDays,
          label: t('navEventInquiriesTitle'),
        }
      : null,
    flags.los
      ? {
          href: '/nav/los-inbox',
          icon: MessageSquare,
          label: t('navLosInboxTitle'),
        }
      : null,
    flags.social
      ? {
          href: '/nav/expired',
          icon: TimerOff,
          label: t('expired'),
        }
      : null,
  ].filter(Boolean) as { href: string; icon: typeof Inbox; label: string }[]

  return (
    <MobilePageTransition>
      <div className="container" style={{ paddingBlock: 'var(--space-6)', maxWidth: 640 }}>
        <header style={{ marginBottom: 'var(--space-6)' }}>
          <h1 className="fluid-h1" style={{ margin: '0 0 var(--space-2)' }}>
            {t('navInboxTitle')}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t('navInboxLead')}</p>
        </header>

        <div
          className="hrt-glass-panel"
          style={{
            padding: 'var(--space-5)',
            borderRadius: 16,
            marginBottom: 'var(--space-5)',
          }}
        >
          <p style={{ margin: 0, lineHeight: 1.5 }}>{t('navInboxPhase2Hint')}</p>
        </div>

        <nav aria-label={t('navInboxTitle')}>
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            {shortcuts.map(({ href, icon: Icon, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="button"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    gap: 'var(--space-3)',
                    minHeight: 56,
                    textDecoration: 'none',
                  }}
                >
                  <Icon size={20} aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </MobilePageTransition>
  )
}
