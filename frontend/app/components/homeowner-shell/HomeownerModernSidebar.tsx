'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { usePlatformMode } from '@/context/PlatformModeContext'
import Logo from '@/app/components/Logo'
import ShellChromeControls from '@/app/components/design-system/ShellChromeControls'
import NavBadge from '@/app/components/app-shell/NavBadge'
import {
  homeownerNavItems,
  isHomeownerNavActive,
  type HomeownerNavBadge,
} from '@/lib/homeownerNavConfig'
import './homeowner-shell.css'

type HomeownerModernSidebarProps = {
  collapsed: boolean
  hydrated: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
  badgeFor: (badge?: HomeownerNavBadge) => number
  logoHref: string
  mode: 'desktop' | 'mobile-overlay'
}

export default function HomeownerModernSidebar({
  collapsed,
  hydrated,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  badgeFor,
  logoHref,
  mode,
}: HomeownerModernSidebarProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { flags } = usePlatformMode()
  const items = homeownerNavItems({ stripeBookings: flags.stripeBookings })
  const isCollapsed = collapsed && hydrated && mode === 'desktop'

  const nav = (
    <nav className="homeowner-sidebar-nav" aria-label={t('homeownerSidebarLabel')}>
      {items.map((item) => {
        const Icon = item.icon
        const active = isHomeownerNavActive(pathname, item.href)
        const count = item.badge ? badgeFor(item.badge) : 0
        const label = t(item.labelKey as Parameters<typeof t>[0])

        return (
          <Link
            key={item.id}
            prefetch={false}
            href={item.href}
            className={`homeowner-sidebar-link${active ? ' homeowner-sidebar-link--active' : ''}`}
            aria-current={active ? 'page' : undefined}
            title={isCollapsed ? label : undefined}
            onClick={onCloseMobile}
          >
            <span className="homeowner-sidebar-link__icon-wrap">
              <Icon size={20} aria-hidden />
              {count > 0 && isCollapsed ? (
                <NavBadge count={count} className="homeowner-sidebar-badge--dot" />
              ) : null}
            </span>
            {!isCollapsed ? (
              <>
                <span className="homeowner-sidebar-link__label">{label}</span>
                {count > 0 ? <NavBadge count={count} className="homeowner-sidebar-badge" /> : null}
              </>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )

  const footer = (
    <div className="homeowner-sidebar-foot">
      <ShellChromeControls className="homeowner-sidebar-chrome" />
      {mode === 'desktop' ? (
        <button
          type="button"
          className="homeowner-sidebar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? t('appShellExpandSidebar') : t('appShellCollapseSidebar')}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? t('appShellExpandSidebar') : t('appShellCollapseSidebar')}
        >
          {isCollapsed ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
          {!isCollapsed ? (
            <span>{isCollapsed ? t('appShellExpandSidebar') : t('appShellCollapseSidebar')}</span>
          ) : null}
        </button>
      ) : null}
    </div>
  )

  if (mode === 'mobile-overlay') {
    return (
      <>
        <button
          type="button"
          className={`homeowner-sidebar-backdrop${mobileOpen ? ' homeowner-sidebar-backdrop--open' : ''}`}
          aria-label={t('homeownerSidebarClose')}
          onClick={onCloseMobile}
          tabIndex={mobileOpen ? 0 : -1}
        />
        <aside
          className={`homeowner-sidebar homeowner-sidebar--overlay${mobileOpen ? ' homeowner-sidebar--overlay-open' : ''}`}
          aria-hidden={!mobileOpen}
        >
          <div className="homeowner-sidebar-head">
            <Link prefetch={false} href={logoHref} className="homeowner-sidebar-brand" onClick={onCloseMobile}>
              <Logo />
            </Link>
            <button
              type="button"
              className="homeowner-sidebar-close-btn"
              onClick={onCloseMobile}
              aria-label={t('homeownerSidebarClose')}
            >
              <X size={20} aria-hidden />
            </button>
          </div>
          {nav}
          {footer}
        </aside>
      </>
    )
  }

  return (
    <aside
      className={`homeowner-sidebar${isCollapsed ? ' homeowner-sidebar--collapsed' : ''}`}
      aria-label={t('homeownerSidebarLabel')}
    >
      <div className="homeowner-sidebar-head">
        <Link prefetch={false} href={logoHref} className="homeowner-sidebar-brand" title={t('myProperties')}>
          <Logo />
        </Link>
      </div>
      {nav}
      {footer}
    </aside>
  )
}
