'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Compass, User } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import Logo from '@/app/components/Logo'
import FeaturePortalGate from '@/app/components/FeaturePortalGate'
import ShellChromeControls from '@/app/components/design-system/ShellChromeControls'

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

  return (
    <div className="finn-shell">
      <header className="finn-header">
        <Link href="/finn" className="finn-brand" aria-label={t('finnBrand')}>
          <Logo />
          <span className="finn-brand-text">{t('finnBrand')}</span>
        </Link>
        <div className="finn-header-end">
          <ShellChromeControls compact className="finn-header-chrome" />
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
        </div>
      </header>
      <main className="finn-main">
        <FeaturePortalGate feature="finn">{children}</FeaturePortalGate>
      </main>
      <footer className="finn-footer">
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
    </div>
  )
}
