'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { usePlatformMode } from '@/context/PlatformModeContext'
import { useAuthGate } from '@/features/auth/hooks/useAuthGate'
import MobilePageTransition from '@/components/layout/mobile-page-transition'
import OpsMobileNav from './OpsMobileNav'
import OpsMobileTopBar from './OpsMobileTopBar'
import OpsSidebar from './OpsSidebar'
import OpsBadge from './OpsBadge'
import { CommandPaletteTrigger } from '@/components/layout/command-palette-provider'
import { OpsPageSkeleton } from './OpsSkeleton'
import { opsGetDashboardStats } from '@/app/lib/opsApi'
import { flattenOpsNav, isOpsNavActive } from '../lib/opsNav'

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

          <OpsMobileTopBar title={pageTitle} />

          <div className="ops-content">
            <MobilePageTransition>{children}</MobilePageTransition>
          </div>
          <OpsMobileNav termsPending={termsPending} />
        </div>
      </div>
    </div>
  )
}
