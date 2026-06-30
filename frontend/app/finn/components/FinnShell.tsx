'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Compass, User } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import Logo from '@/app/components/Logo'

const FINN_NAV = [
  { href: '/finn', labelKey: 'finnNavSearch', icon: Compass },
  { href: '/finn/arrangement', labelKey: 'finnNavEvents', icon: CalendarDays },
  { href: '/finn/mine', labelKey: 'finnNavMine', icon: User },
] as const

function isFinnActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  if (href === '/finn') return pathname === '/finn' || pathname === '/finn/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function FinnShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t } = useLanguage()

  /** Consumer portal is always light — avoids dark-theme token bleed from app shell. */
  useEffect(() => {
    const root = document.documentElement
    const prevTheme = root.getAttribute('data-theme')
    root.setAttribute('data-finn-shell', 'true')
    root.setAttribute('data-theme', 'light')
    return () => {
      root.removeAttribute('data-finn-shell')
      if (prevTheme) root.setAttribute('data-theme', prevTheme)
      else root.setAttribute('data-theme', 'dark')
    }
  }, [])

  return (
    <div className="finn-shell">
      <header className="finn-header">
        <Link href="/finn" className="finn-brand" aria-label={t('finnBrand')}>
          <Logo />
          <span className="finn-brand-text">{t('finnBrand')}</span>
        </Link>
        <nav className="finn-nav" aria-label={t('finnMainNav')}>
          {FINN_NAV.map(({ href, labelKey, icon: Icon }) => {
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
      <main className="finn-main">{children}</main>
      <footer className="finn-footer">
        <p>{t('finnFooterTagline')}</p>
        <Link href="/" className="finn-footer-link">
          {t('finnFooterAppLink')}
        </Link>
      </footer>
    </div>
  )
}
