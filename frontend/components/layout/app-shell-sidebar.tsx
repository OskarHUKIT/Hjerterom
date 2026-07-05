'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { kommuneNavUsesAccountsLabel } from '@/app/lib/kommuneRoles'
import NavBadge from '@/app/components/app-shell/NavBadge'
import {
  appShellNavBadgeCount,
  isAppShellNavActive,
  type AppShellNavBadge,
  type AppShellNavItem,
} from '@/lib/appShellNavConfig'

type AppShellSidebarProps = {
  items: AppShellNavItem[]
  collapsed: boolean
  onToggleCollapse: () => void
  navRole: string | null
  badgeCounts: { notifications: number; messages: number; losInbox: number }
}

export default function AppShellSidebarNav({
  items,
  collapsed,
  onToggleCollapse,
  navRole,
  badgeCounts,
}: AppShellSidebarProps) {
  const pathname = usePathname()
  const { t } = useLanguage()

  const labelFor = (item: AppShellNavItem) => {
    if (item.id === 'users' && kommuneNavUsesAccountsLabel(navRole)) {
      return t('navAccounts')
    }
    return t(item.labelKey as Parameters<typeof t>[0])
  }

  const badgeFor = (badge?: AppShellNavBadge) =>
    badge ? appShellNavBadgeCount(badge, badgeCounts) : 0

  return (
    <aside
      className={`app-shell-sidebar${collapsed ? ' app-shell-sidebar--collapsed' : ''}`}
      aria-label={t('appShellSidebarLabel')}
    >
      <nav className="app-shell-sidebar-nav">
        {items.map((item) => {
          const Icon = item.icon
          const active = isAppShellNavActive(pathname, item)
          const count = badgeFor(item.badge)
          const label = labelFor(item)

          return (
            <Link
              key={item.id}
              prefetch={false}
              href={item.href}
              className={`app-shell-nav-link${active ? ' app-shell-nav-link--active' : ''}`}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? label : undefined}
            >
              <span className="app-shell-nav-link__icon-wrap">
                <Icon size={18} aria-hidden />
                {count > 0 && collapsed ? (
                  <NavBadge count={count} className="app-shell-nav-badge--dot" />
                ) : null}
              </span>
              {!collapsed ? (
                <>
                  <span className="app-shell-nav-link__label">{label}</span>
                  {count > 0 ? <NavBadge count={count} /> : null}
                </>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="app-shell-sidebar-foot">
        <button
          type="button"
          className="app-shell-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? t('appShellExpandSidebar') : t('appShellCollapseSidebar')}
          aria-expanded={!collapsed}
          title={collapsed ? t('appShellExpandSidebar') : t('appShellCollapseSidebar')}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} aria-hidden />
          ) : (
            <PanelLeftClose size={18} aria-hidden />
          )}
          {!collapsed ? (
            <span>
              {collapsed ? t('appShellExpandSidebar') : t('appShellCollapseSidebar')}
            </span>
          ) : null}
        </button>
      </div>
    </aside>
  )
}
