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
  ArrowLeft,
  CalendarDays,
} from 'lucide-react'
import { useState } from 'react'
import { useLanguage } from '../../../context/LanguageContext'
import { useOpsAccess } from '../../hooks/useOpsAccess'
import BottomSheet from '../../components/BottomSheet'
import OpsMobileNav from './OpsMobileNav'
import { OpsPageSkeleton } from './OpsSkeleton'

const NAV_ITEMS = [
  { href: '/ops', icon: LayoutDashboard, labelKey: 'opsNavDashboard' as const, exact: true },
  { href: '/ops/events', icon: CalendarDays, labelKey: 'opsNavEvents' as const },
  { href: '/ops/kommuner', icon: Building2, labelKey: 'opsNavKommuner' as const },
  { href: '/ops/service-areas', icon: Building2, labelKey: 'opsNavServiceAreas' as const },
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

function currentPageLabel(pathname: string, t: ReturnType<typeof useLanguage>['t']) {
  const match = NAV_ITEMS.find((item) => isActive(pathname, item.href, 'exact' in item ? item.exact : undefined))
  return match ? t(match.labelKey) : t('opsConsoleTitle')
}

export default function OpsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const access = useOpsAccess()
  const [menuOpen, setMenuOpen] = useState(false)

  if (access.isLoading || access.data?.kind === 'unauthenticated') {
    return (
      <div className="ops-root">
        <div className="ops-content">
          <OpsPageSkeleton />
        </div>
      </div>
    )
  }

  if (access.data?.kind === 'forbidden') {
    return (
      <div className="ops-root ops-access-denied">
        <p>{t('opsAccessDenied')}</p>
      </div>
    )
  }

  const pageTitle = currentPageLabel(pathname ?? '', t)

  return (
    <div className="ops-root">
      <div className="ops-shell">
        <aside className="ops-sidebar" aria-label={t('opsConsoleTitle')}>
          <div className="ops-sidebar-brand">
            <p className="ops-sidebar-kicker">{t('opsConsoleKicker')}</p>
            <h1 className="ops-sidebar-title">{t('opsConsoleTitle')}</h1>
            <p className="ops-sidebar-sub">{t('opsConsoleSubtitle')}</p>
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
          <div className="ops-sidebar-foot">
            <Link href="/" className="ops-sidebar-exit">
              <ArrowLeft size={16} aria-hidden />
              {t('opsExitToApp')}
            </Link>
          </div>
        </aside>

        <div className="ops-main">
          <header className="ops-topbar">
            <div className="ops-topbar-left">
              <button
                type="button"
                className="ops-mobile-menu-btn ops-mobile-only"
                onClick={() => setMenuOpen(true)}
                aria-label={t('opsOpenMenu')}
              >
                <Menu size={22} />
              </button>
              <h2 className="ops-topbar-title">{pageTitle}</h2>
            </div>
            <div className="ops-topbar-org-slot" title={t('opsOrgFilterFutureHint')}>
              {t('opsOrgFilterFuture')}
            </div>
          </header>

          <div className="ops-content">{children}</div>
          <OpsMobileNav onOpenMenu={() => setMenuOpen(true)} />
        </div>
      </div>

      <BottomSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={t('opsConsoleTitle')}
        closeLabel={t('close')}
      >
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(pathname ?? '', item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`ops-nav-link${active ? ' ops-nav-link--active' : ''}`}
              >
                <Icon size={18} aria-hidden />
                <span>{t(item.labelKey)}</span>
              </Link>
            )
          })}
          <Link href="/" onClick={() => setMenuOpen(false)} className="ops-sidebar-exit" style={{ marginTop: 'var(--space-2)' }}>
            <ArrowLeft size={16} aria-hidden />
            {t('opsExitToApp')}
          </Link>
        </nav>
      </BottomSheet>
    </div>
  )
}
