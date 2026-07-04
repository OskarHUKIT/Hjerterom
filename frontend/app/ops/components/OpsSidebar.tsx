'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { usePlatformMode } from '@/context/PlatformModeContext'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  OPS_NAV_GROUPS,
  isOpsNavActive,
  type OpsNavItem,
} from '../lib/opsNav'

const SIDEBAR_COLLAPSED_KEY = 'ops-sidebar-collapsed'

function NavLink({
  item,
  active,
  collapsed,
  badge,
  onNavigate,
}: {
  item: OpsNavItem
  active: boolean
  collapsed: boolean
  badge?: number
  onNavigate?: () => void
}) {
  const { t } = useLanguage()
  const Icon = item.icon
  const label = t(item.labelKey)

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={cn(
        'ops-nav-link',
        active && 'ops-nav-link--active',
        collapsed && 'ops-nav-link--collapsed',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <span className="ops-nav-link-icon" aria-hidden>
        <Icon size={18} />
      </span>
      {!collapsed ? <span className="ops-nav-link-label">{label}</span> : null}
      {!collapsed && badge != null && badge > 0 ? (
        <Badge variant="destructive" className="ops-nav-link-badge">
          {badge > 99 ? '99+' : badge}
        </Badge>
      ) : null}
      {collapsed && badge != null && badge > 0 ? (
        <span className="ops-nav-link-dot" aria-hidden />
      ) : null}
    </Link>
  )

  return link
}

export default function OpsSidebar({
  termsPending = 0,
  onNavigate,
}: {
  termsPending?: number
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { flags } = usePlatformMode()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')
    } catch {
      /* ignore */
    }
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const groups = useMemo(
    () =>
      OPS_NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => !item.requiresCentralEvents || flags.centralEvents,
        ),
      })).filter((g) => g.items.length > 0),
    [flags.centralEvents],
  )

  return (
    <aside
      className={cn('ops-sidebar', collapsed && 'ops-sidebar--collapsed')}
      aria-label={t('opsConsoleTitle')}
    >
        <div className="ops-sidebar-brand">
          {!collapsed ? (
            <>
              <p className="ops-sidebar-kicker">{t('opsConsoleKicker')}</p>
              <h1 className="ops-sidebar-title">{t('opsConsoleTitle')}</h1>
              <p className="ops-sidebar-sub">{t('opsConsoleSubtitle')}</p>
            </>
          ) : (
            <p className="ops-sidebar-mark" aria-hidden>
              OP
            </p>
          )}
        </div>

        <ScrollArea className="ops-sidebar-scroll">
          <nav className="ops-sidebar-nav">
            {groups.map((group) => (
              <div key={group.groupKey} className="ops-nav-group">
                {!collapsed ? (
                  <p className="ops-nav-group-label">{t(group.groupKey)}</p>
                ) : (
                  <div className="ops-nav-group-divider" aria-hidden />
                )}
                <div className="ops-nav-group-items">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={isOpsNavActive(pathname ?? '', item.href, item.exact)}
                      collapsed={collapsed}
                      badge={item.termsBadge ? termsPending : undefined}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        <div className="ops-sidebar-foot">
          <Link
            href="/"
            onClick={onNavigate}
            className={cn('ops-sidebar-exit', collapsed && 'ops-sidebar-exit--collapsed')}
          >
            <ArrowLeft size={16} aria-hidden />
            {!collapsed ? <span>{t('opsExitToApp')}</span> : null}
          </Link>
          {mounted ? (
            <button
              type="button"
              className="ops-sidebar-collapse-btn"
              onClick={toggleCollapsed}
              aria-label={collapsed ? t('opsSidebarExpand') : t('opsSidebarCollapse')}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          ) : null}
        </div>
      </aside>
  )
}
