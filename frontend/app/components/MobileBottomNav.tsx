'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { User as AuthUser } from '@supabase/supabase-js'
import { Bell, Globe, Menu, Moon, Sun } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { usePlatformMode } from '../../context/PlatformModeContext'
import { useTheme } from '../../context/ThemeContext'
import {
  isKommuneAdminRole,
  isKommuneStaffRole,
  kommuneNavUsesAccountsLabel,
} from '../lib/kommuneRoles'
import { navItemsFor, isNavActive, type NavAudience } from '../../lib/navConfig'
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
  const { flags: platformFlags } = usePlatformMode()
  const platformNav = {
    centralEvents: platformFlags.centralEvents,
    los: platformFlags.los,
  }
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

  const audience: NavAudience = kommune ? 'kommune' : 'landlord'
  const mobileTabs = navItemsFor(audience, 'mobileTab', {
    isAdmin: isKommuneAdminRole(navRole),
    platform: platformNav,
  })
  const mobileMoreItems = kommune
    ? navItemsFor('kommune', 'mobileMore', {
        isAdmin: isKommuneAdminRole(navRole),
        platform: platformNav,
      })
    : []

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

  const isActive = (href: string) => isNavActive(pathname, href)

  const labelFor = (labelKey: string, short?: string) =>
    t((short ?? labelKey) as Parameters<typeof t>[0])

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
        {mobileTabs.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          const label =
            item.id === 'users' && kommuneNavUsesAccountsLabel(navRole)
              ? t('navAccounts')
              : labelFor(item.labelKey, item.shortLabelKey)
          return (
            <Link
              key={item.id}
              prefetch={false}
              href={item.href}
              style={{
                ...tabStyle(active),
                ...(item.badge === 'notifications' ? { position: 'relative' as const } : {}),
              }}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={22} aria-hidden />
              <span style={{ textAlign: 'center' }}>{label}</span>
              {item.badge === 'notifications' && unreadCount > 0 && (
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
          )
        })}
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
            {mobileMoreItems.map((item) => (
              <Link
                key={item.id}
                prefetch={false}
                href={item.href}
                className="button"
                style={{
                  justifyContent: 'flex-start',
                  textDecoration: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onClick={() => setMoreOpen(false)}
              >
                {item.id === 'users' && kommuneNavUsesAccountsLabel(navRole)
                  ? t('navAccounts')
                  : t(item.labelKey as Parameters<typeof t>[0])}
              </Link>
            ))}
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
              href="/homeowner/agreements"
              className="button"
              style={{
                justifyContent: 'flex-start',
                textDecoration: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
              onClick={() => setMoreOpen(false)}
            >
              {t('landlordAgreementsTitle')}
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
