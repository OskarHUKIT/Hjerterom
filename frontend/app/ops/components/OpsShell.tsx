'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { usePlatformMode } from '@/context/PlatformModeContext'
import { useAuthGate } from '@/features/auth/hooks/useAuthGate'
import BottomSheet from '../../components/BottomSheet'
import OpsMobileNav from './OpsMobileNav'
import OpsMobileTopBar from './OpsMobileTopBar'
import OpsSidebar from './OpsSidebar'
import OpsBadge from './OpsBadge'
import { CommandPaletteTrigger } from '@/components/layout/command-palette-provider'
import { OpsPageSkeleton } from './OpsSkeleton'
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
    <div className="ops-root ops-root--mobile-grid">
      <div className="ops-shell">
        <OpsSidebar termsPending={termsPending} />

        <div className="ops-main">
          <header className="ops-topbar ops-desktop-only">
            <div className="ops-topbar-left">
              <div className="ops-topbar-copy">
                <p className="ops-topbar-kicker">{t('opsConsoleKicker')}</p>
                <h2 className="ops-topbar-title">{pageTitle}</h2>
              </div>
            </div>
            <div className="ops-topbar-actions">
              <CommandPaletteTrigger compact className="ops-topbar-search" />
              {termsPending > 0 ? (
                <Link href="/ops/terms" className="ops-topbar-alert">
                  <OpsBadge tone="warning" dot>
                    {t('opsPendingTermsCount').replace('{count}', String(termsPending))}
                  </OpsBadge>
                </Link>
              ) : null}
              <Link href="/ops/platform" className="ops-topbar-mode-link">
                {flags.isHjerterumMode ? t('opsPlatformModulesActive') : t('opsPlatformSocialLive')}
              </Link>
            </div>
          </header>

          <OpsMobileTopBar title={pageTitle} onOpenMenu={() => setMenuOpen(true)} />

          <div className="ops-content">{children}</div>
          <OpsMobileNav onOpenMenu={() => setMenuOpen(true)} termsPending={termsPending} />
        </div>
      </div>

      <BottomSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={t('opsMoreNav')}
        closeLabel={t('close')}
      >
        <div className="ops-mobile-sheet">
          {OPS_NAV_GROUPS.map((group) => {
            const items = group.items.filter(
              (item) => !item.requiresCentralEvents || flags.centralEvents,
            )
            if (items.length === 0) return null
            return (
              <div key={group.groupKey} className="ops-mobile-sheet-group">
                <p className="ops-label-uc ops-mobile-sheet-group-label">{t(group.groupKey)}</p>
                {items.map((item) => {
                  const active = isOpsNavActive(pathname ?? '', item.href, item.exact)
                  const badge = item.termsBadge ? termsPending : undefined
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`ops-mobile-sheet-link${active ? ' ops-mobile-sheet-link--active' : ''}`}
                    >
                      <span className="ops-mobile-sheet-link-label">
                        {t(item.labelKey)}
                        {badge != null && badge > 0 ? (
                          <OpsBadge tone="warning" dot>
                            {badge > 99 ? '99+' : badge}
                          </OpsBadge>
                        ) : null}
                      </span>
                      <ChevronRight size={16} aria-hidden className="ops-mobile-sheet-chevron" />
                    </Link>
                  )
                })}
              </div>
            )
          })}
          <div className="ops-mobile-sheet-group">
            <p className="ops-label-uc ops-mobile-sheet-group-label">{t('opsExitToApp')}</p>
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="ops-mobile-sheet-link ops-mobile-sheet-link--exit"
            >
              <span className="ops-mobile-sheet-link-label">{t('opsExitToApp')}</span>
              <ArrowLeft size={16} aria-hidden className="ops-mobile-sheet-chevron" />
            </Link>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
