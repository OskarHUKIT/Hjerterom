'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { kommuneNavUsesAccountsLabel } from '@/app/lib/kommuneRoles'
import {
  isAppShellNavActive,
  type AppShellNavBadge,
  type AppShellNavItem,
} from '@/lib/appShellNavConfig'
import BottomSheet from '../BottomSheet'
import NavBadge from './NavBadge'

type AppShellMobileNavProps = {
  tabItems: AppShellNavItem[]
  moreItems: AppShellNavItem[]
  navRole: string | null
  showLandlordMore: boolean
  badgeFor: (badge?: AppShellNavBadge) => number
}

function MobileMoreLinks({
  items,
  navRole,
  onNavigate,
}: {
  items: AppShellNavItem[]
  navRole: string | null
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
          className="button app-shell-more-link"
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

export default function AppShellMobileNav({
  tabItems,
  moreItems,
  navRole,
  showLandlordMore,
  badgeFor,
}: AppShellMobileNavProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [isMobile, setIsMobile] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!isMobile) {
      document.body.classList.remove('app-shell-mobile-nav-active')
      return
    }
    document.body.classList.add('app-shell-mobile-nav-active')
    return () => document.body.classList.remove('app-shell-mobile-nav-active')
  }, [isMobile])

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  if (!isMobile) return null

  const labelFor = (item: AppShellNavItem) =>
    t((item.shortLabelKey ?? item.labelKey) as Parameters<typeof t>[0])

  const hasMore = moreItems.length > 0 || showLandlordMore
  const moreBadgeCount = moreItems.reduce(
    (sum, item) => sum + (item.badge ? badgeFor(item.badge) : 0),
    0
  )

  return (
    <>
      <nav className="app-shell-mobile-nav" aria-label={t('mainNavigation')}>
        {tabItems.map((item) => {
          const active = isAppShellNavActive(pathname, item)
          const Icon = item.icon
          const count = item.badge ? badgeFor(item.badge) : 0
          return (
            <Link
              key={item.id}
              prefetch={false}
              href={item.href}
              className={`app-shell-mobile-tab${active ? ' app-shell-mobile-tab--active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="app-shell-mobile-tab__icon">
                <Icon size={22} aria-hidden />
                {count > 0 ? (
                  <NavBadge count={count} className="app-shell-nav-badge--mobile" />
                ) : null}
              </span>
              <span className="app-shell-mobile-tab__label">{labelFor(item)}</span>
            </Link>
          )
        })}
        {hasMore ? (
          <button
            type="button"
            className={`app-shell-mobile-tab app-shell-mobile-tab--more${moreOpen ? ' app-shell-mobile-tab--active' : ''}`}
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
          >
            <span className="app-shell-mobile-tab__icon">
              <Menu size={22} aria-hidden />
              {moreBadgeCount > 0 ? (
                <NavBadge count={moreBadgeCount} className="app-shell-nav-badge--mobile" />
              ) : null}
            </span>
            <span className="app-shell-mobile-tab__label">{t('navMore')}</span>
          </button>
        ) : null}
      </nav>

      {moreOpen && moreItems.length > 0 ? (
        <BottomSheet
          open={moreOpen}
          title={t('navMore')}
          titleId="app-shell-mobile-more"
          closeLabel={t('close')}
          onClose={() => setMoreOpen(false)}
          zIndex={2000}
        >
          <div className="app-shell-more-sheet">
            <MobileMoreLinks
              items={moreItems}
              navRole={navRole}
              onNavigate={() => setMoreOpen(false)}
            />
            {navRole === 'kommune_ansatt' ? (
              <Link
                prefetch={false}
                href="/nav/kommune-access"
                className="button app-shell-more-link"
                onClick={() => setMoreOpen(false)}
              >
                {t('kommuneAccess')}
              </Link>
            ) : null}
          </div>
        </BottomSheet>
      ) : null}

      {moreOpen && showLandlordMore ? (
        <BottomSheet
          open={moreOpen}
          title={t('navMore')}
          titleId="app-shell-mobile-more-landlord"
          closeLabel={t('close')}
          onClose={() => setMoreOpen(false)}
          zIndex={2000}
        >
          <div className="app-shell-more-sheet">
            <Link
              prefetch={false}
              href="/homeowner/register"
              className="button app-shell-more-link"
              onClick={() => setMoreOpen(false)}
            >
              {t('registerNewProperty')}
            </Link>
            <Link
              prefetch={false}
              href="/homeowner/agreements"
              className="button app-shell-more-link"
              onClick={() => setMoreOpen(false)}
            >
              {t('landlordAgreementsTitle')}
            </Link>
            <Link
              prefetch={false}
              href="/homeowner/bookings"
              className="button app-shell-more-link"
              onClick={() => setMoreOpen(false)}
            >
              {t('homeownerNavBookings')}
            </Link>
            <Link
              prefetch={false}
              href="/homeowner/sign-terms"
              className="button app-shell-more-link"
              onClick={() => setMoreOpen(false)}
            >
              {t('signTermsNav')}
            </Link>
          </div>
        </BottomSheet>
      ) : null}
    </>
  )
}
