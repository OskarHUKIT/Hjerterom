'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'
import Footer from './Footer'
import AppShell, { isAppShellRoute } from './app-shell/AppShell'
import { useAppShellNav } from './app-shell/useAppShellNav'

function isFinnRoute(pathname: string | null): boolean {
  return pathname === '/finn' || (pathname?.startsWith('/finn/') ?? false)
}

function isLosRoute(pathname: string | null): boolean {
  return pathname === '/los' || (pathname?.startsWith('/los/') ?? false)
}

function isOpsRoute(pathname: string | null): boolean {
  return pathname === '/ops' || (pathname?.startsWith('/ops/') ?? false)
}

function isEventStaffRoute(pathname: string | null): boolean {
  return pathname === '/nav/event' || (pathname?.startsWith('/nav/event/') ?? false)
}

function AppShellOrClassic({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { eligible, loading } = useAppShellNav()
  const useShell = isAppShellRoute(pathname) && eligible

  if (useShell) {
    return <AppShell>{children}</AppShell>
  }

  return (
    <>
      <Header />
      <div id="main-content" tabIndex={-1} className="site-main">
        {children}
      </div>
      {!loading || !isAppShellRoute(pathname) ? <Footer /> : null}
    </>
  )
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const ops = isOpsRoute(pathname)
  const finn = isFinnRoute(pathname)
  const los = isLosRoute(pathname)
  const eventStaff = isEventStaffRoute(pathname)

  if (ops || finn || los || eventStaff) {
    return (
      <div
        id="main-content"
        tabIndex={-1}
        className={`site-main${ops ? ' site-main--ops' : finn ? ' site-main--finn' : los ? ' site-main--los' : ' site-main--event'}`}
      >
        {children}
      </div>
    )
  }

  return <AppShellOrClassic>{children}</AppShellOrClassic>
}
