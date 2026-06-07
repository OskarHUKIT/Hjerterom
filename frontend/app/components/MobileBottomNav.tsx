'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { User as AuthUser } from '@supabase/supabase-js'
import { Bell, Building2, Globe, Home, Menu, MessageSquare, Moon, Sun } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import {
  isKommuneAdminRole,
  isKommuneStaffRole,
  kommuneNavUsesAccountsLabel,
} from '../lib/kommuneRoles'
import BottomSheet from './BottomSheet'

type MobileBottomNavProps = {
  user: AuthUser | null
  /** Profil/metadata-rolle for navigasjon (samme som Header). */
  navRole: string | null
  loading: boolean
  unreadCount: number
  /** Utleier med signert avtale – vis utleier-faner. */
  showLandlordFullNav: boolean
}

function MobileBottomNavAppearanceControls() {
  const { t, locale, setLocale } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        paddingTop: 'var(--space-4)',
        marginTop: 'var(--space-2)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <p
        className="text-sm"
        style={{ fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}
      >
        {t('settings')}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Globe size={18} style={{ opacity: 0.75, flexShrink: 0 }} aria-hidden />
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as 'no' | 'se' | 'en')}
          aria-label={t('language')}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '10px 12px',
            minHeight: 'var(--touch-target)',
            borderRadius: 8,
            background: 'var(--bg-app)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-main)',
            fontSize: '0.9rem',
          }}
        >
          <option value="no">{t('norwegian')}</option>
          <option value="se">{t('sami')}</option>
          <option value="en">{t('english')}</option>
        </select>
      </div>
      <button
        type="button"
        onClick={toggleTheme}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          width: '100%',
          padding: '10px 12px',
          minHeight: 'var(--touch-target)',
          borderRadius: 8,
          background: 'var(--bg-app)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-main)',
          cursor: 'pointer',
          fontSize: '0.9rem',
        }}
      >
        {theme === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
        {theme === 'dark' ? t('lightMode') : t('darkMode')}
      </button>
    </div>
  )
}

export default function MobileBottomNav({
  user,
  navRole,
  loading,
  unreadCount,
  showLandlordFullNav,
}: MobileBottomNavProps) {
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

  const kommune = isKommuneStaffRole(navRole)
  const visible = Boolean(user && !loading && isMobile && (kommune || showLandlordFullNav))

  useEffect(() => {
    if (!visible) {
      document.body.classList.remove('mobile-bottom-nav-active')
      return
    }
    document.body.classList.add('mobile-bottom-nav-active')
    return () => document.body.classList.remove('mobile-bottom-nav-active')
  }, [visible])

  useEffect(() => {
    if (!visible) setMoreOpen(false)
  }, [visible, pathname])

  if (!visible) return null

  const tabStyle = (active: boolean) => ({
    flex: '1 1 0',
    minWidth: 0,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 4,
    padding: '8px 4px',
    borderRadius: 10,
    textDecoration: 'none' as const,
    color: active ? 'var(--color-sky-blue)' : 'var(--text-muted)',
    fontSize: '0.65rem',
    fontWeight: 600 as const,
    lineHeight: 1.2,
  })

  const isActive = (prefix: string) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)

  return (
    <>
      <nav
        aria-label={t('mainNavigation')}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 160,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-around',
          gap: 4,
          padding:
            '6px max(8px, env(safe-area-inset-left)) calc(6px + env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-right))',
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border-subtle)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
        }}
      >
        {kommune ? (
          <>
            <Link
              prefetch={false}
              href="/nav/database"
              style={tabStyle(isActive('/nav/database'))}
              aria-current={isActive('/nav/database') ? 'page' : undefined}
            >
              <Building2 size={22} aria-hidden />
              <span style={{ textAlign: 'center' }}>{t('housingBank')}</span>
            </Link>
            <Link
              prefetch={false}
              href="/nav/messages"
              style={tabStyle(isActive('/nav/messages'))}
              aria-current={isActive('/nav/messages') ? 'page' : undefined}
            >
              <MessageSquare size={22} aria-hidden />
              <span style={{ textAlign: 'center' }}>{t('messages')}</span>
            </Link>
            <Link
              prefetch={false}
              href="/nav/notifications"
              style={{ ...tabStyle(isActive('/nav/notifications')), position: 'relative' }}
              aria-current={isActive('/nav/notifications') ? 'page' : undefined}
            >
              <Bell size={22} aria-hidden />
              <span style={{ textAlign: 'center' }}>{t('notifications')}</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: '18%',
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '0.6rem',
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    fontWeight: 800,
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              style={{
                ...tabStyle(moreOpen),
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                font: 'inherit',
              }}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
            >
              <Menu size={22} aria-hidden />
              <span style={{ textAlign: 'center' }}>{t('navMore')}</span>
            </button>
          </>
        ) : (
          <>
            <Link
              prefetch={false}
              href="/homeowner/manage"
              style={tabStyle(isActive('/homeowner/manage'))}
              aria-current={isActive('/homeowner/manage') ? 'page' : undefined}
            >
              <Home size={22} aria-hidden />
              <span style={{ textAlign: 'center' }}>{t('myPropertiesTabShort')}</span>
            </Link>
            <Link
              prefetch={false}
              href="/nav/messages"
              style={tabStyle(isActive('/nav/messages'))}
              aria-current={isActive('/nav/messages') ? 'page' : undefined}
            >
              <MessageSquare size={22} aria-hidden />
              <span style={{ textAlign: 'center' }}>{t('messages')}</span>
            </Link>
            <Link
              prefetch={false}
              href="/nav/notifications"
              style={{ ...tabStyle(isActive('/nav/notifications')), position: 'relative' }}
              aria-current={isActive('/nav/notifications') ? 'page' : undefined}
            >
              <Bell size={22} aria-hidden />
              <span style={{ textAlign: 'center' }}>{t('notifications')}</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: '18%',
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '0.6rem',
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    fontWeight: 800,
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              style={{
                ...tabStyle(moreOpen),
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                font: 'inherit',
              }}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
            >
              <Menu size={22} aria-hidden />
              <span style={{ textAlign: 'center' }}>{t('navMore')}</span>
            </button>
          </>
        )}
      </nav>

      {kommune && moreOpen && (
        <BottomSheet
          open={moreOpen}
          title={t('navMore')}
          titleId="mobile-nav-more-kommune"
          closeLabel={t('close')}
          onClose={() => setMoreOpen(false)}
          zIndex={2000}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <Link
              prefetch={false}
              href="/nav/users"
              className="button"
              style={{
                justifyContent: 'flex-start',
                textDecoration: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
              onClick={() => setMoreOpen(false)}
            >
              {kommuneNavUsesAccountsLabel(navRole) ? t('navAccounts') : t('navLandlords')}
            </Link>
            <Link
              prefetch={false}
              href="/nav/expired"
              className="button"
              style={{
                justifyContent: 'flex-start',
                textDecoration: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
              onClick={() => setMoreOpen(false)}
            >
              {t('expired')}
            </Link>
            {isKommuneAdminRole(navRole) && (
              <Link
                prefetch={false}
                href="/nav/terms-documents"
                className="button"
                style={{
                  justifyContent: 'flex-start',
                  textDecoration: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onClick={() => setMoreOpen(false)}
              >
                {t('termsDocumentsNav')}
              </Link>
            )}
            {navRole === 'kommune_ansatt' && (
              <Link
                prefetch={false}
                href="/nav/kommune-access"
                className="button"
                style={{
                  justifyContent: 'flex-start',
                  textDecoration: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onClick={() => setMoreOpen(false)}
              >
                {t('kommuneAccess')}
              </Link>
            )}
            <MobileBottomNavAppearanceControls />
          </div>
        </BottomSheet>
      )}

      {!kommune && showLandlordFullNav && moreOpen && (
        <BottomSheet
          open={moreOpen}
          title={t('navMore')}
          titleId="mobile-nav-more-landlord"
          closeLabel={t('close')}
          onClose={() => setMoreOpen(false)}
          zIndex={2000}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <Link
              prefetch={false}
              href="/homeowner/register"
              className="button"
              style={{
                justifyContent: 'flex-start',
                textDecoration: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
              onClick={() => setMoreOpen(false)}
            >
              {t('registerNewProperty')}
            </Link>
            <Link
              prefetch={false}
              href="/homeowner/sign-terms"
              className="button"
              style={{
                justifyContent: 'flex-start',
                textDecoration: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
              onClick={() => setMoreOpen(false)}
            >
              {t('signTermsNav')}
            </Link>
            <MobileBottomNavAppearanceControls />
          </div>
        </BottomSheet>
      )}
    </>
  )
}
