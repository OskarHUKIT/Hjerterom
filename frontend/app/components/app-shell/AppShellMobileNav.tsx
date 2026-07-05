'use client'

// mobile-decision: App-shell mobile nav delegates to unified MobileShell — config from mobileShellNavConfig.
import Link from 'next/link'
import { useMemo } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { usePlatformMode } from '@/context/PlatformModeContext'
import MobileShell, { defaultBadgeFor } from '@/components/layout/mobile-shell'
import ShellChromeControls from '@/app/components/design-system/ShellChromeControls'
import {
  appShellNavBadgeCount,
  type AppShellNavBadge,
  type AppShellRole,
} from '@/lib/appShellNavConfig'
import {
  appShellRoleToMobileContext,
  mobileShellMoreItems,
  mobileShellTabs,
} from '@/lib/mobileShellNavConfig'

type AppShellMobileNavProps = {
  shellRole: AppShellRole | null
  navRole: string | null
  showLandlordMore: boolean
  badgeFor: (badge?: AppShellNavBadge) => number
  badgeCounts: { notifications: number; messages: number; losInbox: number }
}

export default function AppShellMobileNav({
  shellRole,
  navRole,
  showLandlordMore,
  badgeFor,
  badgeCounts,
}: AppShellMobileNavProps) {
  const { t } = useLanguage()
  const { flags } = usePlatformMode()

  const platform = useMemo(
    () => ({
      social: flags.social,
      centralEvents: flags.centralEvents,
      los: flags.los,
      stripeBookings: flags.stripeBookings,
    }),
    [flags.social, flags.centralEvents, flags.los, flags.stripeBookings]
  )

  const context = appShellRoleToMobileContext(shellRole)
  if (!context) return null

  const tabs = mobileShellTabs(context, platform, {
    isAdmin: shellRole === 'municipality-admin',
  })
  const moreItems = mobileShellMoreItems(context, shellRole, platform, {
    isAdmin: shellRole === 'municipality-admin',
  })

  const shellBadgeFor = (badge?: Parameters<typeof defaultBadgeFor>[0]) => {
    if (badge === 'bookings') {
      return 0
    }
    if (badge === 'messages' || badge === 'notifications' || badge === 'losInbox') {
      return badgeFor(badge as AppShellNavBadge)
    }
    return defaultBadgeFor(badge, {
      messages: badgeCounts.messages,
      notifications: badgeCounts.notifications,
      losInbox: badgeCounts.losInbox,
      bookings: 0,
      trips: 0,
      terms: 0,
    })
  }

  const landlordMore = showLandlordMore ? (
    <>
      <Link prefetch={false} href="/homeowner/register" className="button mobile-shell-more-link">
        {t('registerNewProperty')}
      </Link>
      <Link prefetch={false} href="/homeowner/agreements" className="button mobile-shell-more-link">
        {t('landlordAgreementsTitle')}
      </Link>
      <Link prefetch={false} href="/homeowner/sign-terms" className="button mobile-shell-more-link">
        {t('signTermsNav')}
      </Link>
      <ShellChromeControls variant="menu" />
    </>
  ) : null

  const kommuneMore =
    context === 'kommune' ? (
      <>
        {navRole === 'kommune_ansatt' ? (
          <Link prefetch={false} href="/nav/kommune-access" className="button mobile-shell-more-link">
            {t('kommuneAccess')}
          </Link>
        ) : null}
        <ShellChromeControls variant="menu" />
      </>
    ) : null

  return (
    <MobileShell
      context={context}
      tabs={tabs}
      moreItems={moreItems}
      moreExtra={landlordMore ?? kommuneMore}
      badgeFor={shellBadgeFor}
      navRole={navRole}
    />
  )
}

export { appShellNavBadgeCount }
