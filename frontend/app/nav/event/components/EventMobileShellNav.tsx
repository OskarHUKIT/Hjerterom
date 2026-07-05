'use client'

// mobile-decision: Event staff bottom nav on mobile — same config object pattern as kommune shell; header nav stays on desktop.
import { useMemo } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import MobileShell from '@/components/layout/mobile-shell'
import { mobileShellTabs } from '@/lib/mobileShellNavConfig'
import ShellChromeControls from '@/app/components/design-system/ShellChromeControls'

export default function EventMobileShellNav() {
  const { t } = useLanguage()
  const tabs = useMemo(() => mobileShellTabs('event', {}), [])

  const moreExtra = <ShellChromeControls variant="menu" />

  return (
    <MobileShell
      context="event"
      tabs={tabs}
      moreExtra={moreExtra}
      ariaLabel={t('eventStaffBadge')}
      className="event-mobile-shell-nav"
    />
  )
}
