'use client'

import { usePathname } from 'next/navigation'
import { useAppShellNav } from './useAppShellNav'
import { useSidebarCollapsed } from './useSidebarCollapsed'
import AppShellSidebar from './AppShellSidebar'
import AppShellTopbar from './AppShellTopbar'
import AppShellMobileNav from './AppShellMobileNav'
import HomeownerModernSidebar from '../homeowner-shell/HomeownerModernSidebar'
import { useHomeownerSidebarState } from '../homeowner-shell/useHomeownerSidebarState'
import { isHomeownerShellRoute } from '../homeowner-shell/isHomeownerShellRoute'
import type { HomeownerNavBadge } from '@/lib/homeownerNavConfig'
import './app-shell.css'
import '../homeowner-shell/homeowner-shell.css'

type AppShellProps = {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const homeownerShell = isHomeownerShellRoute(pathname)
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
    badgeCounts,
  } = useAppShellNav()
  const { collapsed, toggleCollapsed, hydrated } = useSidebarCollapsed()
  const homeownerSidebar = useHomeownerSidebarState()

  const useHomeownerSidebar = homeownerShell && audience === 'landlord'

  const homeownerBadgeFor = (badge?: HomeownerNavBadge) => {
    if (badge === 'messages') return badgeCounts.messages
    return 0
  }

  if (!user) return null

  const rootClass = useHomeownerSidebar
    ? `app-shell-root homeowner-shell-root${homeownerSidebar.collapsed && homeownerSidebar.hydrated ? ' homeowner-shell-root--collapsed' : ''}`
    : `app-shell-root${collapsed && hydrated ? ' app-shell-root--collapsed' : ''}`

  const layoutClass = useHomeownerSidebar ? 'app-shell-layout homeowner-shell-layout' : 'app-shell-layout'

  return (
    <div className={rootClass}>
      <div className={layoutClass}>
        {useHomeownerSidebar ? (
          <>
            <div className="homeowner-sidebar-slot">
              <HomeownerModernSidebar
                mode="desktop"
                collapsed={homeownerSidebar.collapsed}
                hydrated={homeownerSidebar.hydrated}
                onToggleCollapse={homeownerSidebar.toggleCollapsed}
                mobileOpen={false}
                onCloseMobile={homeownerSidebar.closeMobile}
                badgeFor={homeownerBadgeFor}
                logoHref={logoHref}
              />
            </div>
            <HomeownerModernSidebar
              mode="mobile-overlay"
              collapsed={false}
              hydrated
              onToggleCollapse={homeownerSidebar.toggleCollapsed}
              mobileOpen={homeownerSidebar.mobileOpen}
              onCloseMobile={homeownerSidebar.closeMobile}
              badgeFor={homeownerBadgeFor}
              logoHref={logoHref}
            />
          </>
        ) : (
          <div className="app-shell-sidebar-slot">
            <AppShellSidebar
              items={sidebarItems}
              collapsed={collapsed && hydrated}
              onToggleCollapse={toggleCollapsed}
              navRole={navRole}
              badgeFor={badgeFor}
            />
          </div>
        )}
        <div className="app-shell-main">
          <AppShellTopbar
            logoHref={logoHref}
            navRole={navRole}
            sidebarItems={sidebarItems}
            hasSignedTerms={hasSignedTerms}
            user={user}
            hideChromeControls={useHomeownerSidebar}
            showHomeownerMenuButton={useHomeownerSidebar}
            onOpenHomeownerMenu={homeownerSidebar.openMobile}
          />
          <div id="main-content" tabIndex={-1} className="site-main app-shell-content">
            {children}
          </div>
          {!useHomeownerSidebar ? (
            <AppShellMobileNav
              tabItems={mobileTabItems}
              moreItems={mobileMoreItems}
              navRole={navRole}
              showLandlordMore={audience === 'landlord' && showLandlordFullNav}
              badgeFor={badgeFor}
            />
          ) : null}
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
