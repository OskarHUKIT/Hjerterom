'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  Shield,
  BarChart3,
  Menu,
  Building2,
  HeartPulse,
} from 'lucide-react'
import { useState } from 'react'
import { useLanguage } from '../../../context/LanguageContext'
import { useOpsAccess } from '../../hooks/useOpsAccess'
import LoadingPlaceholder from '../../components/LoadingPlaceholder'
import BottomSheet from '../../components/BottomSheet'
import OpsMobileNav from './OpsMobileNav'

const NAV_ITEMS = [
  { href: '/ops', icon: LayoutDashboard, labelKey: 'opsNavDashboard' as const, exact: true },
  { href: '/ops/kommuner', icon: Building2, labelKey: 'opsNavKommuner' as const },
  { href: '/ops/accounts', icon: Users, labelKey: 'opsNavAccounts' as const },
  { href: '/ops/terms', icon: FileText, labelKey: 'opsNavTerms' as const },
  { href: '/ops/health', icon: HeartPulse, labelKey: 'opsNavHealth' as const },
  { href: '/ops/security', icon: Shield, labelKey: 'opsNavSecurity' as const },
  { href: '/ops/stats', icon: BarChart3, labelKey: 'opsNavStats' as const },
]

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function OpsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const access = useOpsAccess()
  const [menuOpen, setMenuOpen] = useState(false)

  if (access.isLoading || access.data?.kind === 'unauthenticated') {
    return (
      <main className="container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingPlaceholder minHeight={120} />
      </main>
    )
  }

  if (access.data?.kind === 'forbidden') {
    return (
      <main className="container" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <p>{t('opsAccessDenied')}</p>
      </main>
    )
  }

  return (
    <div className="ops-shell">
      <aside className="ops-sidebar" aria-label={t('opsConsoleTitle')}>
        <div className="ops-sidebar-head">
          <p className="ops-sidebar-kicker">{t('opsConsoleKicker')}</p>
          <h1 className="ops-sidebar-title">{t('opsConsoleTitle')}</h1>
        </div>
        <nav className="ops-sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(pathname ?? '', item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`ops-nav-link${active ? ' ops-nav-link--active' : ''}`}
              >
                <Icon size={18} aria-hidden />
                <span>{t(item.labelKey)}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="ops-main">
        <header className="ops-mobile-topbar">
          <button
            type="button"
            className="ops-mobile-menu-btn"
            onClick={() => setMenuOpen(true)}
            aria-label={t('opsOpenMenu')}
          >
            <Menu size={22} />
          </button>
          <span className="ops-mobile-topbar-title">{t('opsConsoleTitle')}</span>
        </header>
        <div className="ops-content">{children}</div>
        <OpsMobileNav />
      </div>

      <BottomSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={t('opsConsoleTitle')}
        closeLabel={t('close')}
      >
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(pathname ?? '', item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`ops-nav-link${active ? ' ops-nav-link--active' : ''}`}
                style={{ borderRadius: 10 }}
              >
                <Icon size={18} aria-hidden />
                <span>{t(item.labelKey)}</span>
              </Link>
            )
          })}
        </nav>
      </BottomSheet>
    </div>
  )
}
