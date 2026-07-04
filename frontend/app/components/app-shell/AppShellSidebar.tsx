'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import {
  isNavActive,
  type NavItemDef,
  type NavBadge as NavBadgeKind,
} from '@/lib/navConfig'
import { kommuneNavUsesAccountsLabel } from '@/app/lib/kommuneRoles'
import NavBadge from './NavBadge'

type AppShellSidebarProps = {
  items: NavItemDef[]
  collapsed: boolean
  onToggleCollapse: () => void
  navRole: string | null
  badgeFor: (badge?: NavBadgeKind) => number
}

export default function AppShellSidebar({
  items,
  collapsed,
  onToggleCollapse,
  navRole,
  badgeFor,
}: AppShellSidebarProps) {
  const pathname = usePathname()
  const { t } = useLanguage()

  const labelFor = (item: NavItemDef) => {
    if (item.id === 'users' && kommuneNavUsesAccountsLabel(navRole)) {
      return t('navAccounts')
    }
    return t(item.labelKey as Parameters<typeof t>[0])
  }

  return (
    <aside
      className={`app-shell-sidebar${collapsed ? ' app-shell-sidebar--collapsed' : ''}`}
      aria-label={t('appShellSidebarLabel')}
    >
      <nav className="app-shell-sidebar-nav">
        {items.map((item) => {
          const Icon = item.icon
          const active = isNavActive(pathname, item.href)
          const count = item.badge ? badgeFor(item.badge) : 0
          return (
            <Link
              key={item.id}
              prefetch={false}
              href={item.href}
              className={`app-shell-nav-link${active ? ' app-shell-nav-link--active' : ''}`}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? labelFor(item) : undefined}
            >
              <span className="app-shell-nav-link__icon-wrap">
                <Icon size={18} aria-hidden />
                {count > 0 && collapsed ? (
                  <NavBadge count={count} className="app-shell-nav-badge--dot" />
                ) : null}
              </span>
              {!collapsed ? (
                <>
                  <span className="app-shell-nav-link__label">{labelFor(item)}</span>
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
        >
          {collapsed ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
          {!collapsed ? (
            <span>{collapsed ? t('appShellExpandSidebar') : t('appShellCollapseSidebar')}</span>
          ) : null}
        </button>
      </div>
    </aside>
  )
}
