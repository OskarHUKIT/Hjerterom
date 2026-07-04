'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  LogOut,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { devInfo, logError } from '@/app/lib/appLogger'
import { isKommuneStaffRole } from '@/app/lib/kommuneRoles'
import { useLanguage } from '@/context/LanguageContext'
import Logo from '../Logo'
import ShellChromeControls from '../design-system/ShellChromeControls'
import { isNavActive, type NavItemDef } from '@/lib/navConfig'

type AppShellTopbarProps = {
  logoHref: string
  navRole: string | null
  sidebarItems: NavItemDef[]
  hasSignedTerms: boolean
  user: NonNullable<ReturnType<typeof import('@/context/AuthSessionContext').useAuthSession>['user']>
}

function pageTitleFromPath(
  pathname: string | null,
  items: NavItemDef[],
  t: ReturnType<typeof useLanguage>['t']
): string {
  const match = items.find((item) => isNavActive(pathname, item.href))
  if (match) return t(match.labelKey as Parameters<typeof t>[0])
  if (pathname?.startsWith('/homeowner/register')) return t('registerNewProperty')
  if (pathname?.startsWith('/homeowner/agreements')) return t('landlordAgreementsTitle')
  if (pathname?.startsWith('/homeowner/sign-terms')) return t('signTermsNav')
  return t('housingBank')
}

export default function AppShellTopbar({
  logoHref,
  navRole,
  sidebarItems,
  hasSignedTerms,
  user,
}: AppShellTopbarProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutPending, setLogoutPending] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const closeMenu = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('click', closeMenu)
    return () => window.removeEventListener('click', closeMenu)
  }, [menuOpen])

  const pageTitle = pageTitleFromPath(pathname, sidebarItems, t)

  const handleLogout = () => {
    setLogoutPending(true)
    setMenuOpen(false)
    devInfo('[Boly/auth] logout: local signOut + redirect')
    void (async () => {
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch (e) {
        logError('signOut:', e)
      }
      window.location.assign('/')
    })()
  }

  const roleLabel =
    navRole === 'kommune_ansatt'
      ? t('kommune')
      : navRole === 'kommune_admin'
        ? t('kommuneAdminRole')
        : t('landlord')

  return (
    <>
      <header className="app-shell-topbar">
        <div className="app-shell-topbar__left">
          <Link prefetch={false} href={logoHref} className="app-shell-topbar__logo">
            <Logo />
          </Link>
          <h1 className="app-shell-topbar__title">{pageTitle}</h1>
        </div>
        <div className="app-shell-topbar__right">
          <ShellChromeControls compact className="app-shell-topbar-chrome" />
          <div className="app-shell-user-menu" ref={menuRef}>
            <button
              type="button"
              id="app-shell-user-menu-trigger"
              className="app-shell-user-trigger"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-controls="app-shell-user-menu-dropdown"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <User size={18} aria-hidden />
              <span className="app-shell-user-trigger__name">
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
              {navRole ? (
                <span className="app-shell-user-trigger__role">({roleLabel})</span>
              ) : null}
              <ChevronDown
                size={14}
                aria-hidden
                className={`app-shell-user-trigger__chevron${menuOpen ? ' app-shell-user-trigger__chevron--open' : ''}`}
              />
            </button>
            {menuOpen ? (
              <div
                id="app-shell-user-menu-dropdown"
                className="app-shell-user-dropdown"
                role="region"
                aria-label={t('userPanel')}
              >
                <p className="app-shell-user-dropdown__kicker">{t('userPanel')}</p>
                {!isKommuneStaffRole(navRole) ? (
                  <Link
                    prefetch={false}
                    href="/homeowner/sign-terms"
                    className="app-shell-user-dropdown__item"
                    onClick={() => setMenuOpen(false)}
                  >
                    <ShieldCheck size={16} aria-hidden />
                    {hasSignedTerms ? t('signedAgreement') : t('signTerms')}
                  </Link>
                ) : null}
                <Link
                  prefetch={false}
                  href="/settings/privacy"
                  className="app-shell-user-dropdown__item"
                  onClick={() => setMenuOpen(false)}
                >
                  <Shield size={16} aria-hidden />
                  {t('settingsPrivacyLink')}
                </Link>
                <button
                  type="button"
                  className="app-shell-user-dropdown__item app-shell-user-dropdown__item--logout"
                  onClick={() => void handleLogout()}
                >
                  <LogOut size={16} aria-hidden />
                  {t('logOut')}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      {logoutPending ? (
        <div className="app-shell-logout-overlay" role="status" aria-live="assertive" aria-busy="true">
          <div className="card app-shell-logout-card">{t('logoutRedirecting')}</div>
        </div>
      ) : null}
    </>
  )
}
