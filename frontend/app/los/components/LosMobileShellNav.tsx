'use client'

// mobile-decision: Los keeps Finn guest nav on mobile so Los-hjelp tab stays active when chatting full-screen.
import { useMemo } from 'react'
import { usePlatformMode } from '@/context/PlatformModeContext'
import MobileShell from '@/components/layout/mobile-shell'
import { mobileShellTabs } from '@/lib/mobileShellNavConfig'

export default function LosMobileShellNav() {
  const { flags } = usePlatformMode()

  const tabs = useMemo(
    () =>
      mobileShellTabs('finn', {
        los: flags.los,
      }),
    [flags.los]
  )

  if (!flags.los) return null

  return (
    <MobileShell
      context="finn"
      tabs={tabs}
      ariaLabel="Finn"
      className="los-mobile-shell-nav"
    />
  )
}
