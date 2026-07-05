'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, LogOut, Shield, ShieldCheck, User } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/app/lib/supabase'
import { devInfo, logError } from '@/app/lib/appLogger'
import { isKommuneStaffRole } from '@/app/lib/kommuneRoles'
import { useLanguage } from '@/context/LanguageContext'

export type UserMenuProps = {
  user: SupabaseUser
  navRole: string | null
  hasSignedTerms?: boolean
  /** Where to send the user after logout (default `/`). */
  logoutRedirect?: string
  className?: string
}

/**
 * Shared authenticated user menu — theme/locale live in ShellChromeControls;
 * this dropdown exposes account links and a visible Log out action.
 */
export default function UserMenu({
  user,
  navRole,
  hasSignedTerms = false,
  logoutRedirect = '/',
  className,
}: UserMenuProps) {
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
      window.location.assign(logoutRedirect)
    })()
  }

  const roleLabel =
    navRole === 'kommune_ansatt'
      ? t('kommune')
      : navRole === 'kommune_admin'
        ? t('kommuneAdminRole')
        : navRole === 'event_ansatt'
          ? t('eventStaffBadge')
          : navRole === 'leietaker'
            ? t('finnNavMine')
            : t('landlord')

  return (
    <>
      <div className={`app-shell-user-menu${className ? ` ${className}` : ''}`} ref={menuRef}>
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
            {!isKommuneStaffRole(navRole) && navRole !== 'leietaker' && navRole !== 'event_ansatt' ? (
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
      {logoutPending ? (
        <div className="app-shell-logout-overlay" role="status" aria-live="assertive" aria-busy="true">
          <div className="card app-shell-logout-card">{t('logoutRedirecting')}</div>
        </div>
      ) : null}
    </>
  )
}
