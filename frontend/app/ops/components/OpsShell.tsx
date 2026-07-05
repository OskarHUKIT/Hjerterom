'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { usePlatformMode } from '@/context/PlatformModeContext'
import { useAuthGate } from '@/features/auth/hooks/useAuthGate'
import BottomSheet from '../../components/BottomSheet'
import OpsMobileNav from './OpsMobileNav'
import OpsSidebar from './OpsSidebar'
import { OpsPageSkeleton } from './OpsSkeleton'
import { Badge } from '@/components/ui/badge'
import { opsGetDashboardStats } from '@/app/lib/opsApi'
import { flattenOpsNav, isOpsNavActive } from '../lib/opsNav'
import { OPS_NAV_GROUPS } from '../lib/opsNav'
import { ArrowLeft } from 'lucide-react'

function currentPageLabel(
  pathname: string,
  centralEvents: boolean,
  t: ReturnType<typeof useLanguage>['t'],
) {
  const items = flattenOpsNav(centralEvents)
  const match = items.find((item) => isOpsNavActive(pathname, item.href, item.exact))
  return match ? t(match.labelKey) : t('opsConsoleTitle')
}

export default function OpsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const access = useAuthGate({ mode: 'ops' })
  const { flags } = usePlatformMode()
  const [menuOpen, setMenuOpen] = useState(false)
  const [termsPending, setTermsPending] = useState(0)

  useEffect(() => {
    if (access.data?.kind !== 'ok') return
    let cancelled = false
    void (async () => {
      try {
        const stats = await opsGetDashboardStats()
        if (!cancelled) setTermsPending(stats.terms_pending)
      } catch {
        /* non-blocking */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [access.data?.kind])

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

  const pageTitle = currentPageLabel(pathname ?? '', flags.centralEvents, t)

  return (
    <div className="ops-root">
      <div className="ops-shell">
        <OpsSidebar termsPending={termsPending} />

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
              <div className="ops-topbar-copy">
                <p className="ops-topbar-kicker">{t('opsConsoleKicker')}</p>
                <h2 className="ops-topbar-title">{pageTitle}</h2>
              </div>
            </div>
            <div className="ops-topbar-actions">
              {termsPending > 0 ? (
                <Link href="/ops/terms" className="ops-topbar-alert">
                  <Badge variant="destructive">
                    {t('opsPendingTermsCount').replace('{count}', String(termsPending))}
                  </Badge>
                </Link>
              ) : null}
              <Link href="/ops/platform" className="ops-topbar-mode-link">
                {flags.isHjerterumMode ? t('opsPlatformModulesActive') : t('opsPlatformSocialLive')}
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
        <nav className="ops-mobile-sheet-nav">
          {OPS_NAV_GROUPS.flatMap((group) =>
            group.items
              .filter((item) => !item.requiresCentralEvents || flags.centralEvents)
              .map((item) => {
                const Icon = item.icon
                const active = isOpsNavActive(pathname ?? '', item.href, item.exact)
                const badge = item.termsBadge ? termsPending : undefined
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`ops-nav-link${active ? ' ops-nav-link--active' : ''}`}
                  >
                    <Icon size={18} aria-hidden />
                    <span>{t(item.labelKey)}</span>
                    {badge != null && badge > 0 ? (
                      <Badge variant="destructive" className="ops-nav-link-badge">
                        {badge > 99 ? '99+' : badge}
                      </Badge>
                    ) : null}
                  </Link>
                )
              }),
          )}
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="ops-sidebar-exit"
            style={{ marginTop: 'var(--space-2)' }}
          >
            <ArrowLeft size={16} aria-hidden />
            {t('opsExitToApp')}
          </Link>
        </nav>
      </BottomSheet>
    </div>
  )
}
