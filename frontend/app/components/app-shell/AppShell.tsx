'use client'

import { useAppShellNav } from './useAppShellNav'
import { useSidebarCollapsed } from './useSidebarCollapsed'
import AppShellSidebar from './AppShellSidebar'
import AppShellTopbar from './AppShellTopbar'
import AppShellMobileNav from './AppShellMobileNav'
import './app-shell.css'

type AppShellProps = {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const {
    user,
    navRole,
    sidebarItems,
    mobileTabItems,
    mobileMoreItems,
    logoHref,
    hasSignedTerms,
    showLandlordFullNav,
    badgeFor,
    audience,
  } = useAppShellNav()
  const { collapsed, toggleCollapsed, hydrated } = useSidebarCollapsed()

  if (!user) return null

  return (
    <div
      className={`app-shell-root${collapsed && hydrated ? ' app-shell-root--collapsed' : ''}`}
    >
      <div className="app-shell-layout">
        <div className="app-shell-sidebar-slot">
          <AppShellSidebar
            items={sidebarItems}
            collapsed={collapsed && hydrated}
            onToggleCollapse={toggleCollapsed}
            navRole={navRole}
            badgeFor={badgeFor}
          />
        </div>
        <div className="app-shell-main">
          <AppShellTopbar
            logoHref={logoHref}
            navRole={navRole}
            sidebarItems={sidebarItems}
            hasSignedTerms={hasSignedTerms}
            user={user}
          />
          <div id="main-content" tabIndex={-1} className="site-main app-shell-content">
            {children}
          </div>
          <AppShellMobileNav
            tabItems={mobileTabItems}
            moreItems={mobileMoreItems}
            navRole={navRole}
            showLandlordMore={audience === 'landlord' && showLandlordFullNav}
            badgeFor={badgeFor}
          />
        </div>
      </div>
    </div>
  )
}

export function isAppShellRoute(pathname: string | null): boolean {
  if (!pathname) return false
  if (pathname === '/nav/event' || pathname.startsWith('/nav/event/')) return false
  if (pathname === '/nav' || pathname.startsWith('/nav/')) return true
  if (pathname === '/homeowner' || pathname.startsWith('/homeowner/')) return true
  return false
}
