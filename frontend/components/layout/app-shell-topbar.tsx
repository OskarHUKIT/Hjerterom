'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import Logo from '@/app/components/Logo'
import ShellChromeControls from '@/app/components/design-system/ShellChromeControls'
import UserMenu from '@/components/layout/user-menu'
import { CommandPaletteTrigger } from '@/components/layout/command-palette-provider'
import {
  appShellNavItems,
  isAppShellNavActive,
  resolveAppShellRole,
  type AppShellNavItem,
  type AppShellPlatformFlags,
} from '@/lib/appShellNavConfig'

type AppShellTopbarProps = {
  logoHref: string
  navRole: string | null
  hasSignedTerms: boolean
  user: NonNullable<
    ReturnType<typeof import('@/context/AuthSessionContext').useAuthSession>['user']
  >
  platform: AppShellPlatformFlags
  onOpenMobileNav?: () => void
  showMobileMenuButton?: boolean
}

function pageTitleFromNav(
  pathname: string | null,
  navRole: string | null,
  hasSignedTerms: boolean,
  platform: AppShellPlatformFlags,
  t: ReturnType<typeof useLanguage>['t']
): string {
  const shellRole = resolveAppShellRole(navRole, hasSignedTerms)
  const items = appShellNavItems(shellRole, { platform })
  const match = items.find((item) => isAppShellNavActive(pathname, item))
  if (match) return t(match.labelKey as Parameters<typeof t>[0])

  if (pathname?.startsWith('/homeowner/register')) return t('registerNewProperty')
  if (pathname?.startsWith('/homeowner/agreements')) return t('landlordAgreementsTitle')
  if (pathname?.startsWith('/homeowner/bookings')) return t('homeownerNavBookings')
  if (pathname?.startsWith('/homeowner/sign-terms')) return t('signTermsNav')
  if (pathname?.startsWith('/homeowner/listings/')) return t('myProperties')
  if (pathname?.startsWith('/nav/kommune-access')) return t('kommuneAccess')
  return t('housingBank')
}

export default function AppShellTopbar({
  logoHref,
  navRole,
  hasSignedTerms,
  user,
  platform,
  onOpenMobileNav,
  showMobileMenuButton,
}: AppShellTopbarProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const pageTitle = pageTitleFromNav(pathname, navRole, hasSignedTerms, platform, t)

  return (
    <header className="app-shell-topbar hrt-glass-header">
      <div className="app-shell-topbar__left">
        {showMobileMenuButton ? (
          <button
            type="button"
            className="homeowner-topbar-menu-btn"
            aria-label={t('homeownerSidebarOpen')}
            onClick={() => onOpenMobileNav?.()}
          >
            <Menu size={20} aria-hidden />
          </button>
        ) : null}
        <Link prefetch={false} href={logoHref} className="app-shell-topbar__logo">
          <Logo />
        </Link>
        <h1 className="app-shell-topbar__title">{pageTitle}</h1>
      </div>
      <div className="app-shell-topbar__right">
        <CommandPaletteTrigger compact />
        <ShellChromeControls compact className="app-shell-topbar-chrome" />
        <UserMenu user={user} navRole={navRole} hasSignedTerms={hasSignedTerms} />
      </div>
    </header>
  )
}

export { pageTitleFromNav }
