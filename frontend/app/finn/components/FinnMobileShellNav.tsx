'use client'

// mobile-decision: Finn bottom nav uses unified MobileShell — Utforsk · Kart · Turer · Los · Profil per approved IA.
import { useMemo } from 'react'
import { usePlatformMode } from '@/context/PlatformModeContext'
import MobileShell from '@/components/layout/mobile-shell'
import { mobileShellTabs } from '@/lib/mobileShellNavConfig'

type FinnMobileShellNavProps = {
  unreadCount?: number
  hidden?: boolean
}

export default function FinnMobileShellNav({ unreadCount = 0, hidden = false }: FinnMobileShellNavProps) {
  const { flags } = usePlatformMode()

  const tabs = useMemo(
    () =>
      mobileShellTabs('finn', {
        los: flags.los,
      }),
    [flags.los]
  )

  return (
    <MobileShell
      context="finn"
      tabs={tabs}
      hidden={hidden}
      badgeFor={(badge) => (badge === 'trips' ? unreadCount : 0)}
      ariaLabel="Finn"
      className="finn-mobile-shell-nav"
    />
  )
}
