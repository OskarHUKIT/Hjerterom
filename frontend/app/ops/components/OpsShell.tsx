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
  SlidersHorizontal,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLanguage } from '../../../context/LanguageContext'
import { usePlatformMode } from '../../../context/PlatformModeContext'
import { useOpsAccess } from '../../hooks/useOpsAccess'
import BottomSheet from '../../components/BottomSheet'
import OpsMobileNav from './OpsMobileNav'
import { OpsPageSkeleton } from './OpsSkeleton'

type NavItem = {
  href: string
  icon: typeof LayoutDashboard
  labelKey: 'opsNavDashboard' | 'opsNavPlatform' | 'opsNavEvents' | 'opsNavKommuner' | 'opsNavServiceAreas' | 'opsNavAccounts' | 'opsNavTerms' | 'opsNavHealth' | 'opsNavSecurity' | 'opsNavStats'
  exact?: boolean
  requiresCentralEvents?: boolean
}

const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/ops', icon: LayoutDashboard, labelKey: 'opsNavDashboard', exact: true },
  { href: '/ops/platform', icon: SlidersHorizontal, labelKey: 'opsNavPlatform' },
  { href: '/ops/events', icon: CalendarDays, labelKey: 'opsNavEvents', requiresCentralEvents: true },
  { href: '/ops/kommuner', icon: Building2, labelKey: 'opsNavKommuner' },
  { href: '/ops/service-areas', icon: Building2, labelKey: 'opsNavServiceAreas' },
  { href: '/ops/accounts', icon: Users, labelKey: 'opsNavAccounts' },
  { href: '/ops/terms', icon: FileText, labelKey: 'opsNavTerms' },
  { href: '/ops/health', icon: HeartPulse, labelKey: 'opsNavHealth' },
  { href: '/ops/security', icon: Shield, labelKey: 'opsNavSecurity' },
  { href: '/ops/stats', icon: BarChart3, labelKey: 'opsNavStats' },
]

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

function currentPageLabel(pathname: string, items: NavItem[], t: ReturnType<typeof useLanguage>['t']) {
  const match = items.find((item) => isActive(pathname, item.href, item.exact))
  return match ? t(match.labelKey) : t('opsConsoleTitle')
}

export default function OpsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const access = useOpsAccess()
  const { flags } = usePlatformMode()
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = useMemo(
    () =>
      ALL_NAV_ITEMS.filter(
        (item) => !item.requiresCentralEvents || flags.centralEvents
      ),
    [flags.centralEvents]
  )

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

  const pageTitle = currentPageLabel(pathname ?? '', navItems, t)

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
            {navItems.map((item) => {
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
            <div className="ops-topbar-org-slot">
              <Link href="/ops/platform" className="ops-topbar-mode-link">
                {flags.isHjerterumMode ? t('opsPlatformModeHjerterum') : t('opsPlatformModeBoly')}
              </Link>
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
          {navItems.map((item) => {
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
