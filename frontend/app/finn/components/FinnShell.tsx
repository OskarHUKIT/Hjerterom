'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Compass, User } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/LanguageContext'
import type { Locale } from '@/lib/translations'
import Logo from '@/app/components/Logo'
import FeaturePortalGate from '@/app/components/FeaturePortalGate'
import ShellChromeControls from '@/app/components/design-system/ShellChromeControls'
import UserMenu from '@/components/layout/user-menu'
import { useAuthSession } from '@/context/AuthSessionContext'
import { usePlatformMode } from '@/context/PlatformModeContext'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import FinnBrandMark from './FinnBrandMark'
import FinnBottomNav from './FinnBottomNav'

const FINN_LOCALE_KEY = 'hjerterum-finn-locale'

const FINN_DESKTOP_NAV = [
  { href: '/finn', labelKey: 'finnNavSearch', icon: Compass },
  { href: '/finn/arrangement', labelKey: 'finnNavEvents', icon: CalendarDays },
  { href: '/finn/mine', labelKey: 'finnNavMine', icon: User },
] as const

function isFinnActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  if (href === '/finn') return pathname === '/finn' || pathname === '/finn/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

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
  const { t, locale, setLocale } = useLanguage()
  const { user } = useAuthSession()
  const { flags } = usePlatformMode()
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
    const parts = ['finn-shell']
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
      {/* Desktop header — unchanged from pre-mobile rebuild */}
      <header className="finn-header finn-desktop-only hrt-glass-header">
        <Link href="/finn" className="finn-brand" aria-label={t('finnBrand')}>
          <Logo />
          <span className="finn-brand-text">{t('finnBrand')}</span>
        </Link>
        <ShellChromeControls compact className="finn-chrome-controls" />
        {user ? (
          <UserMenu
            user={user}
            navRole="leietaker"
            logoutRedirect="/finn"
            logoutScope="global"
            className="finn-user-menu"
          />
        ) : null}
        <nav className="finn-nav finn-nav--desktop" aria-label={t('finnMainNav')}>
          {FINN_DESKTOP_NAV.filter(({ href }) => {
            if (href === '/finn/mine') return true
            return flags.finn
          }).map(({ href, labelKey, icon: Icon }) => {
            const active = isFinnActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                className={`finn-nav-link${active ? ' finn-nav-link--active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={18} aria-hidden />
                <span>{t(labelKey)}</span>
              </Link>
            )
          })}
        </nav>
      </header>

      {/* Mobile header */}
      <header className="finn-header finn-mobile-only">
        <FinnBrandMark />
        <div className="finn-mobile-header-actions">
          <ShellChromeControls compact className="finn-chrome-controls" />
          {user ? (
            <UserMenu
              user={user}
              navRole="leietaker"
              logoutRedirect="/finn"
              logoutScope="global"
              className="finn-user-menu"
            />
          ) : null}
        </div>
      </header>

      <main className="finn-main">
        <FeaturePortalGate feature="finn">{children}</FeaturePortalGate>
      </main>

      {mode === 'app' ? (
        <div className="finn-mobile-only">
          <FinnBottomNav unreadCount={unreadCount} />
        </div>
      ) : null}

      <footer className="finn-footer finn-desktop-only">
        <p>{t('finnFooterTagline')}</p>
        <div className="finn-footer-links">
          <Link href="/finn/vilkar" className="finn-footer-link">
            {t('finnTermsLink')}
          </Link>
          <Link href="/" className="finn-footer-link">
            {t('finnFooterAppLink')}
          </Link>
        </div>
      </footer>

      {mode === 'auth' ? (
        <footer className="finn-footer finn-mobile-only">
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
