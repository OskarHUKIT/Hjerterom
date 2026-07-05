'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/LanguageContext'
import type { Locale } from '@/lib/translations'
import FeaturePortalGate from '@/app/components/FeaturePortalGate'
import ShellChromeControls from '@/app/components/design-system/ShellChromeControls'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import FinnBrandMark from './FinnBrandMark'
import FinnBottomNav from './FinnBottomNav'

const FINN_LOCALE_KEY = 'hjerterum-finn-locale'

function shellMode(pathname: string | null): 'app' | 'detail' | 'auth' {
  if (!pathname) return 'app'
  if (pathname.startsWith('/finn/login') || pathname.startsWith('/finn/vilkar')) return 'auth'
  if (
    pathname.startsWith('/finn/listing/') ||
    pathname.startsWith('/finn/book/') ||
    pathname.startsWith('/finn/arrangement/')
  ) {
    return 'detail'
  }
  return 'app'
}

async function fetchFinnUnreadHint(userId: string, email: string): Promise<number> {
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id')
    .or(`guest_user_id.eq.${userId},guest_email.eq.${email}`)
    .in('status', ['pending', 'accepted', 'paid', 'completed'])
    .limit(1)

  return (bookings ?? []).length > 0 ? 1 : 0
}

export default function FinnShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { locale, setLocale, t } = useLanguage()
  const mode = shellMode(pathname)

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['finn', 'unread-messages'],
    queryFn: async () => {
      const user = await getAuthUserDeduped()
      if (!user?.id || !user.email) return 0
      return fetchFinnUnreadHint(user.id, user.email)
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const shellClass = useMemo(() => {
    const parts = ['finn-shell', 'finn-shell--app']
    if (mode === 'detail') parts.push('finn-shell--detail')
    if (mode === 'auth') parts.push('finn-shell--auth')
    return parts.join(' ')
  }, [mode])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FINN_LOCALE_KEY)
      if (stored === 'no' || stored === 'en' || stored === 'se') {
        if (stored !== locale) setLocale(stored as Locale)
        return
      }
      setLocale('en')
      localStorage.setItem(FINN_LOCALE_KEY, 'en')
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Finn default runs once on shell mount
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(FINN_LOCALE_KEY, locale)
    } catch {
      /* ignore */
    }
  }, [locale])

  useEffect(() => {
    document.documentElement.setAttribute('data-finn-shell', 'true')
    return () => document.documentElement.removeAttribute('data-finn-shell')
  }, [])

  return (
    <div className={shellClass}>
      <header className="finn-header">
        <FinnBrandMark />
        <ShellChromeControls compact className="finn-chrome-controls" />
      </header>
      <main className="finn-main">
        <FeaturePortalGate feature="finn">{children}</FeaturePortalGate>
      </main>
      {mode === 'app' ? <FinnBottomNav unreadCount={unreadCount} /> : null}
      {mode === 'auth' ? (
        <footer className="finn-footer">
          <div className="finn-footer-links">
            <Link href="/finn/vilkar" className="finn-footer-link">
              {t('finnTermsLink')}
            </Link>
            <Link href="/" className="finn-footer-link">
              {t('finnFooterAppLink')}
            </Link>
          </div>
        </footer>
      ) : null}
    </div>
  )
}
