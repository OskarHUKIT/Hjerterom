'use client'

// mobile-decision: Unified role bottom nav — one component for app, Finn, event, and ops shells at ≤768px.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { kommuneNavUsesAccountsLabel } from '@/app/lib/kommuneRoles'
import BottomSheet from '@/app/components/BottomSheet'
import NavBadge from '@/app/components/app-shell/NavBadge'
import {
  isMobileShellTabActive,
  MOBILE_SHELL_BREAKPOINT_PX,
  type MobileShellBadge,
  type MobileShellContext,
  type MobileShellTab,
} from '@/lib/mobileShellNavConfig'
import './mobile-shell.css'

export type MobileShellBadgeCounts = {
  messages: number
  notifications: number
  losInbox: number
  bookings: number
  trips: number
  terms: number
}

export type MobileShellProps = {
  context: MobileShellContext
  tabs: MobileShellTab[]
  moreItems?: MobileShellTab[]
  /** Extra rows in «Mer» sheet (landlord links, ops menu, etc.). */
  moreExtra?: ReactNode
  badgeFor?: (badge?: MobileShellBadge) => number
  navRole?: string | null
  hidden?: boolean
  ariaLabel?: string
  className?: string
}

export function useIsMobileShellViewport() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_SHELL_BREAKPOINT_PX}px)`)
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return isMobile
}

export function defaultBadgeFor(
  badge: MobileShellBadge | undefined,
  counts: MobileShellBadgeCounts
): number {
  if (!badge) return 0
  return counts[badge] ?? 0
}

function MobileMoreLinks({
  items,
  navRole,
  onNavigate,
}: {
  items: MobileShellTab[]
  navRole: string | null | undefined
  onNavigate: () => void
}) {
  const { t } = useLanguage()
  return (
    <>
      {items.map((item) => (
        <Link
          key={item.id}
          prefetch={false}
          href={item.href}
          className="button mobile-shell-more-link"
          onClick={onNavigate}
        >
          {item.id === 'users' && kommuneNavUsesAccountsLabel(navRole)
            ? t('navAccounts')
            : t(item.labelKey as Parameters<typeof t>[0])}
        </Link>
      ))}
    </>
  )
}

export default function MobileShell({
  context,
  tabs,
  moreItems = [],
  moreExtra,
  badgeFor,
  navRole = null,
  hidden = false,
  ariaLabel,
  className = '',
}: MobileShellProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const isMobile = useIsMobileShellViewport()
  const [moreOpen, setMoreOpen] = useState(false)

  const visible = isMobile && !hidden && tabs.length > 0

  useEffect(() => {
    if (!visible) {
      document.body.classList.remove('mobile-shell-active')
      return
    }
    document.body.classList.add('mobile-shell-active')
    return () => document.body.classList.remove('mobile-shell-active')
  }, [visible])

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  if (!visible) return null

  const resolveBadge = badgeFor ?? (() => 0)

  const labelFor = (item: MobileShellTab) =>
    t((item.shortLabelKey ?? item.labelKey) as Parameters<typeof t>[0])

  const moreTab = tabs.find((tab) => tab.variant === 'more')
  const navTabs = tabs.filter((tab) => tab.variant !== 'more')
  const hasMore = Boolean(moreTab) && (moreItems.length > 0 || moreExtra)
  const moreBadgeCount = moreItems.reduce(
    (sum, item) => sum + (item.badge ? resolveBadge(item.badge) : 0),
    0
  )

  return (
    <>
      <nav
        className={`mobile-shell-nav${className ? ` ${className}` : ''}`}
        aria-label={ariaLabel ?? t('mainNavigation')}
      >
        {navTabs.map((item) => {
          const active = isMobileShellTabActive(pathname, item)
          const Icon = item.icon
          const count = item.badge ? resolveBadge(item.badge) : 0
          const isElevated = item.variant === 'elevated'

          return (
            <Link
              key={item.id}
              prefetch={false}
              href={item.href}
              className={[
                'mobile-shell-tab',
                active ? 'mobile-shell-tab--active' : '',
                isElevated ? 'mobile-shell-tab--elevated' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={active ? 'page' : undefined}
              aria-label={isElevated ? labelFor(item) : undefined}
            >
              <span
                className={`mobile-shell-tab__icon${active ? ' mobile-shell-tab__icon--fill' : ''}`}
              >
                <Icon size={isElevated ? 24 : 22} aria-hidden />
                {count > 0 && !isElevated ? (
                  <NavBadge count={count} className="app-shell-nav-badge--mobile" />
                ) : null}
              </span>
              {!isElevated ? (
                <span className="mobile-shell-tab__label">{labelFor(item)}</span>
              ) : null}
            </Link>
          )
        })}

        {hasMore && moreTab ? (
          <button
            type="button"
            className={`mobile-shell-tab mobile-shell-tab--more${moreOpen ? ' mobile-shell-tab--active' : ''}`}
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
          >
            <span className="mobile-shell-tab__icon">
              <moreTab.icon size={22} aria-hidden />
              {moreBadgeCount > 0 ? (
                <NavBadge count={moreBadgeCount} className="app-shell-nav-badge--mobile" />
              ) : null}
            </span>
            <span className="mobile-shell-tab__label">{t('navMore')}</span>
          </button>
        ) : null}
      </nav>

      {moreOpen && (moreItems.length > 0 || moreExtra) ? (
        <BottomSheet
          open={moreOpen}
          title={t('navMore')}
          titleId={`mobile-shell-more-${context}`}
          closeLabel={t('close')}
          onClose={() => setMoreOpen(false)}
          zIndex={2000}
        >
          <div className="mobile-shell-more-sheet">
            {moreItems.length > 0 ? (
              <MobileMoreLinks
                items={moreItems}
                navRole={navRole}
                onNavigate={() => setMoreOpen(false)}
              />
            ) : null}
            {moreExtra}
          </div>
        </BottomSheet>
      ) : null}
    </>
  )
}
