'use client'

// mobile-decision: Ops mobile nav — Dashboard · Accounts · elevated Send alert · Events · Mer (user needs CRUD on phone).
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { usePlatformMode } from '@/context/PlatformModeContext'
import MobileShell from '@/components/layout/mobile-shell'
import { mobileShellTabs } from '@/lib/mobileShellNavConfig'
import { OPS_NAV_GROUPS } from '../lib/opsNav'
import OpsBadge from './OpsBadge'

type OpsMobileNavProps = {
  onOpenMenu?: () => void
  termsPending?: number
}

export default function OpsMobileNav({ termsPending = 0 }: OpsMobileNavProps) {
  const { t } = useLanguage()
  const { flags } = usePlatformMode()

  const tabs = useMemo(
    () =>
      mobileShellTabs('ops', {
        centralEvents: flags.centralEvents,
      }),
    [flags.centralEvents]
  )

  const moreExtra = (
    <>
      {OPS_NAV_GROUPS.map((group) => {
        const items = group.items.filter(
          (item) => !item.requiresCentralEvents || flags.centralEvents
        )
        if (items.length === 0) return null
        return (
          <div key={group.groupKey} className="ops-mobile-sheet-group">
            <p className="ops-label-uc ops-mobile-sheet-group-label">{t(group.groupKey)}</p>
            {items.map((item) => {
              const badge = item.termsBadge ? termsPending : undefined
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="button mobile-shell-more-link"
                  style={{ justifyContent: 'space-between' }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {t(item.labelKey)}
                    {badge != null && badge > 0 ? (
                      <OpsBadge tone="warning" dot>
                        {badge > 99 ? '99+' : badge}
                      </OpsBadge>
                    ) : null}
                  </span>
                  <ChevronRight size={16} aria-hidden />
                </Link>
              )
            })}
          </div>
        )
      })}
      <Link href="/" className="button mobile-shell-more-link">
        {t('opsExitToApp')}
      </Link>
    </>
  )

  return (
    <MobileShell
      context="ops"
      tabs={tabs}
      moreExtra={moreExtra}
      badgeFor={(badge) => (badge === 'terms' ? termsPending : 0)}
      ariaLabel={t('opsConsoleTitle')}
      className="ops-mobile-shell-nav"
    />
  )
}
