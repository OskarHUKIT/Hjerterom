'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'
import { kommuneNavUsesAccountsLabel } from '@/app/lib/kommuneRoles'
import AppShellMobileNav from '@/app/components/app-shell/AppShellMobileNav'
import AppShellSidebarNav from '@/components/layout/app-shell-sidebar'
import AppShellTopbar from '@/components/layout/app-shell-topbar'
import { useSidebarCollapsed } from '@/components/layout/use-sidebar-collapsed'
import { useAppShellNav } from '@/app/components/app-shell/useAppShellNav'
import Logo from '@/app/components/Logo'
import ShellChromeControls from '@/app/components/design-system/ShellChromeControls'
import NavBadge from '@/app/components/app-shell/NavBadge'
import {
  appShellNavBadgeCount,
  isAppShellNavActive,
  type AppShellNavItem,
} from '@/lib/appShellNavConfig'
import '@/app/components/app-shell/app-shell.css'
import '@/app/components/homeowner-shell/homeowner-shell.css'
import MobilePageTransition from '@/components/layout/mobile-page-transition'

type AppShellProps = {
  children: React.ReactNode
}

function MobileSidebarOverlay({
  open,
  onClose,
  items,
  navRole,
  badgeCounts,
  logoHref,
}: {
  open: boolean
  onClose: () => void
  items: AppShellNavItem[]
  navRole: string | null
  badgeCounts: { notifications: number; messages: number; losInbox: number }
  logoHref: string
}) {
  const pathname = usePathname()
  const { t } = useLanguage()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  const labelFor = (item: AppShellNavItem) => {
    if (item.id === 'users' && kommuneNavUsesAccountsLabel(navRole)) {
      return t('navAccounts')
    }
    return t(item.labelKey as Parameters<typeof t>[0])
  }

  return (
    <>
      <button
        type="button"
        className="homeowner-sidebar-backdrop homeowner-sidebar-backdrop--open"
        aria-label={t('homeownerSidebarClose')}
        onClick={onClose}
      />
      <aside className="homeowner-sidebar homeowner-sidebar--overlay homeowner-sidebar--overlay-open">
        <div className="homeowner-sidebar-head">
          <Link prefetch={false} href={logoHref} className="homeowner-sidebar-brand" onClick={onClose}>
            <Logo />
          </Link>
          <button
            type="button"
            className="homeowner-sidebar-close-btn"
            onClick={onClose}
            aria-label={t('homeownerSidebarClose')}
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <nav className="homeowner-sidebar-nav" aria-label={t('appShellSidebarLabel')}>
          {items.map((item) => {
            const Icon = item.icon
            const active = isAppShellNavActive(pathname, item)
            const count = item.badge
              ? appShellNavBadgeCount(item.badge, badgeCounts)
              : 0
            return (
              <Link
                key={item.id}
                prefetch={false}
                href={item.href}
                className={`homeowner-sidebar-link${active ? ' homeowner-sidebar-link--active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={onClose}
              >
                <span className="homeowner-sidebar-link__icon-wrap">
                  <Icon size={20} aria-hidden />
                </span>
                <span className="homeowner-sidebar-link__label">{labelFor(item)}</span>
                {count > 0 ? (
                  <NavBadge count={count} className="homeowner-sidebar-badge" />
                ) : null}
              </Link>
            )
          })}
        </nav>
        <div className="homeowner-sidebar-foot">
          <ShellChromeControls className="homeowner-sidebar-chrome" />
        </div>
      </aside>
    </>
  )
}

/**
 * Unified authenticated shell for landlords and municipality staff.
 * Nav items come from `lib/appShellNavConfig.ts` (single source of truth).
 */
export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const {
    user,
    navRole,
    shellRole,
    sidebarItems,
    logoHref,
    hasSignedTerms,
    showLandlordFullNav,
    badgeFor,
    audience,
    badgeCounts,
    platform,
  } = useAppShellNav()
  const { collapsed, toggleCollapsed, hydrated } = useSidebarCollapsed()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  if (!user) return null

  const rootClass = `app-shell-root${collapsed && hydrated ? ' app-shell-root--collapsed' : ''}`

  return (
    <div className={rootClass}>
      <div className="app-shell-layout">
        <div className="app-shell-sidebar-slot">
          <AppShellSidebarNav
            items={sidebarItems}
            collapsed={collapsed && hydrated}
            onToggleCollapse={toggleCollapsed}
            navRole={navRole}
            badgeCounts={badgeCounts}
          />
        </div>

        <MobileSidebarOverlay
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          items={sidebarItems}
          navRole={navRole}
          badgeCounts={badgeCounts}
          logoHref={logoHref}
        />

        <div className="app-shell-main">
          <AppShellTopbar
            logoHref={logoHref}
            navRole={navRole}
            hasSignedTerms={hasSignedTerms}
            user={user}
            platform={platform}
            showMobileMenuButton
            onOpenMobileNav={() => setMobileNavOpen(true)}
          />
          <div id="main-content" tabIndex={-1} className="site-main app-shell-content">
            <MobilePageTransition>{children}</MobilePageTransition>
          </div>
          <AppShellMobileNav
            shellRole={shellRole}
            navRole={navRole}
            showLandlordMore={audience === 'landlord' && showLandlordFullNav}
            badgeFor={badgeFor}
            badgeCounts={badgeCounts}
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
