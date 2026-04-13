'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { User as AuthUser } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import Logo from './Logo'
import {
  User,
  LogOut,
  LogIn,
  ChevronDown,
  ShieldCheck,
  Bell,
  Menu,
  X,
  MessageSquare,
  Sun,
  Moon,
  Globe,
  Building2,
  Home,
} from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import {
  isKommuneAdminRole,
  isKommuneStaffRole,
  kommuneNavUsesAccountsLabel,
} from '../lib/kommuneRoles'
import { getLandlordPostLoginHref } from '../lib/landlordNavGate'

export default function Header() {
  const router = useRouter()
  const { t, locale, setLocale } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasSignedTerms, setHasSignedTerms] = useState(false)
  /** Når utleier mangler aktiv avtale: logo/pekere til register eller signering (fra getLandlordPostLoginHref). */
  const [landlordBootstrapHref, setLandlordBootstrapHref] = useState('/homeowner/register')
  const [role, setRole] = useState<string | null>(null)
  const [kommuneCanEdit, setKommuneCanEdit] = useState<boolean | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  /** Samme breakpoint som header (768px): forenklet kommune-nav på små skjermer. */
  const [isMobileLayout, setIsMobileLayout] = useState(false)

  const fetchHeaderData = async (
    userId: string,
    metadata: AuthUser['user_metadata'],
    email?: string | null
  ) => {
    try {
      // Sjekk både metadata (raskt) og database (sikkert)
      const metadataRole = metadata?.role

      const [profileRes, agreementRes] = await Promise.all([
        supabase.from('profiles').select('role, kommune_can_edit').eq('id', userId).maybeSingle(),
        supabase
          .from('user_agreements')
          .select('*')
          .eq('user_id', userId)
          .eq('is_terminated', false)
          .maybeSingle(),
      ])

      // Profil i DB er kilden; metadata kan være utdatert og gi feil nav-etikett.
      const userRole = profileRes.data?.role || metadataRole || 'homeowner'
      setRole(userRole)
      setKommuneCanEdit(profileRes.data?.kommune_can_edit ?? null)
      setHasSignedTerms(!!agreementRes.data)

      if (isKommuneStaffRole(userRole) || agreementRes.data) {
        setLandlordBootstrapHref('/homeowner/manage')
      } else {
        const href = await getLandlordPostLoginHref(supabase, userId, email ?? null, {
          reuseProfileRole: userRole,
        })
        setLandlordBootstrapHref(href)
      }

      // Hent unread count – kun varsler som er til brukeren (owner_id)
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'unread')
        .eq('owner_id', userId)

      setUnreadCount(count ?? 0)
    } catch (err) {
      console.error('Error fetching header data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const timeoutId = setTimeout(() => {
      if (!cancelled) setLoading(false)
    }, 8000)

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchHeaderData(session.user.id, session.user.user_metadata)
        } else {
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchHeaderData(session.user.id, session.user.user_metadata, session.user.email)
      } else {
        setHasSignedTerms(false)
        setLandlordBootstrapHref('/homeowner/register')
        setRole(null)
        setKommuneCanEdit(null)
        setUnreadCount(0)
        setLoading(false)
      }
    })

    // Close menu when clicking outside
    const closeMenu = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.user-menu-trigger')) {
        setIsMenuOpen(false)
      }
    }
    window.addEventListener('click', closeMenu)

    // Close mobile nav on resize
    const handleResize = () => {
      if (window.innerWidth > 768) setIsMobileNavOpen(false)
    }
    window.addEventListener('resize', handleResize)

    const mq = window.matchMedia('(max-width: 768px)')
    const syncMobileLayout = () => setIsMobileLayout(mq.matches)
    syncMobileLayout()
    mq.addEventListener('change', syncMobileLayout)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      subscription.unsubscribe()
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('resize', handleResize)
      mq.removeEventListener('change', syncMobileLayout)
    }
  }, [])

  const checkAgreement = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_agreements')
        .select('*')
        .eq('user_id', userId)
        .eq('is_terminated', false)
        .maybeSingle()

      setHasSignedTerms(!!data)
    } catch (err) {
      console.error('Error checking agreement:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setIsMenuOpen(false)
    closeMobileNav()
    try {
      // Global signOut() can hang on slow/unreachable API; local clears session immediately.
      await supabase.auth.signOut({ scope: 'local' })
    } catch (e) {
      console.error('signOut:', e)
    }
    // Full navigation so logout works even if client router or auth listeners are stuck.
    window.location.assign('/')
  }

  const closeMobileNav = () => setIsMobileNavOpen(false)

  /** Under første lasting er `role` fra DB fortsatt null; bruk JWT-metadata så vi ikke viser utleier-nav for kommune. */
  const metadataRoleStr =
    user?.user_metadata && typeof user.user_metadata.role === 'string'
      ? user.user_metadata.role
      : null
  const navRoleForLinks = role ?? (loading ? metadataRoleStr : null)

  const kommuneMobileNav = isKommuneStaffRole(navRoleForLinks) && isMobileLayout

  const showLandlordFullNav =
    Boolean(user) &&
    navRoleForLinks != null &&
    !isKommuneStaffRole(navRoleForLinks) &&
    hasSignedTerms

  const logoHref = !user
    ? '/'
    : isKommuneStaffRole(navRoleForLinks)
      ? '/nav/database'
      : hasSignedTerms
        ? '/homeowner/manage'
        : landlordBootstrapHref

  const navContent = (
    <>
      {isKommuneStaffRole(navRoleForLinks) && (
        <>
          {kommuneMobileNav ? (
            <Link
              href="/nav/database"
              className="nav-link"
              onClick={closeMobileNav}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              aria-label={t('housingBank')}
              title={t('housingBank')}
            >
              <Building2 size={22} />
            </Link>
          ) : (
            <>
              <Link href="/nav/database" className="nav-link" onClick={closeMobileNav}>
                {t('housingBank')}
              </Link>
              <Link href="/nav/users" className="nav-link" onClick={closeMobileNav}>
                {kommuneNavUsesAccountsLabel(navRoleForLinks) ? t('navAccounts') : t('navLandlords')}
              </Link>
              <Link href="/nav/messages" className="nav-link" onClick={closeMobileNav}>
                {t('messages')}
              </Link>
              <Link href="/nav/expired" className="nav-link" onClick={closeMobileNav}>
                {t('expired')}
              </Link>
              {isKommuneAdminRole(navRoleForLinks) && (
                <Link href="/nav/terms-documents" className="nav-link" onClick={closeMobileNav}>
                  {t('termsDocumentsNav')}
                </Link>
              )}
            </>
          )}
        </>
      )}

      {user && (isKommuneStaffRole(navRoleForLinks) || showLandlordFullNav) && (
        <Link
          href="/nav/notifications"
          className="nav-link"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}
          onClick={closeMobileNav}
        >
          <Bell size={18} />
          <span className="nav-text">{t('notifications')}</span>
          {unreadCount > 0 && (
            <span
              style={{
                background: '#ef4444',
                color: 'white',
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: 800,
                minWidth: '18px',
                textAlign: 'center',
              }}
            >
              {unreadCount}
            </span>
          )}
        </Link>
      )}

      {showLandlordFullNav && (
        <Link
          href="/nav/messages"
          className="nav-link"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={closeMobileNav}
        >
          <MessageSquare size={18} />
          <span className="nav-text">{t('messages')}</span>
        </Link>
      )}

      {showLandlordFullNav && (
        <Link href="/homeowner/manage" className="nav-link" onClick={closeMobileNav}>
          {t('myProperties')}
        </Link>
      )}

      {loading ? (
        <div style={{ width: '100px' }}></div>
      ) : user ? (
        <div
          style={{ position: 'relative', marginLeft: 'var(--space-4)' }}
          className="user-menu-trigger"
        >
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="button-login"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              background: isMenuOpen ? 'var(--bg-app)' : 'var(--bg-app)',
              border: '1px solid var(--border-subtle)',
              padding: 'var(--space-2) var(--space-4)',
              minHeight: 'var(--touch-target)',
              borderRadius: '10px',
              color: 'var(--text-main)',
              cursor: 'pointer',
            }}
          >
            <User size={18} />
            <span
              style={{
                fontSize: '0.9rem',
                maxWidth: '150px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.user_metadata?.full_name || user.email?.split('@')[0]}
              {role && (
                <span style={{ opacity: 0.5, marginLeft: '6px', fontSize: '0.75rem' }}>
                  (
                  {role === 'kommune_ansatt'
                    ? t('kommune')
                    : role === 'kommune_admin'
                      ? t('kommuneAdminRole')
                      : t('landlord')}
                  )
                </span>
              )}
            </span>
            <ChevronDown
              size={14}
              style={{
                transform: isMenuOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </button>

          {isMenuOpen && (
            <div
              className="user-menu"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 'var(--space-2)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                borderRadius: '12px',
                padding: 'var(--space-2)',
                minWidth: '220px',
                boxShadow: 'var(--shadow-xl)',
                zIndex: 1000,
                backdropFilter: 'blur(16px)',
              }}
            >
              <div
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                <p className="text-sm" style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                  {t('userPanel')}
                </p>
              </div>

              <Link
                href="/homeowner/sign-terms"
                className="menu-item"
                onClick={() => {
                  setIsMenuOpen(false)
                  closeMobileNav()
                }}
              >
                <ShieldCheck size={16} /> {hasSignedTerms ? t('signedAgreement') : t('signTerms')}
              </Link>

              <div style={{ padding: 'var(--space-2) var(--space-4)' }}>
                <p
                  className="text-sm"
                  style={{
                    fontWeight: 600,
                    color: 'var(--color-accent)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  {t('settings')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Globe size={14} style={{ opacity: 0.7 }} />
                    <select
                      value={locale}
                      onChange={(e) => setLocale(e.target.value as 'no' | 'se' | 'en')}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        minHeight: 'var(--touch-target)',
                        borderRadius: 6,
                        background: 'var(--bg-app)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
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
                      fontSize: '0.85rem',
                    }}
                  >
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    {theme === 'dark' ? t('lightMode') : t('darkMode')}
                  </button>
                </div>
              </div>

              <div
                style={{
                  height: '1px',
                  background: 'var(--border-subtle)',
                  margin: 'var(--space-2) 0',
                }}
              ></div>

              <button
                type="button"
                onClick={() => void handleLogout()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  width: '100%',
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  textAlign: 'left',
                }}
                className="menu-item-logout"
              >
                <LogOut size={16} /> {t('logOut')}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className="header-guest-toolbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginLeft: 'var(--space-2)',
          }}
        >
          <div
            className="header-guest-lang-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              height: 'var(--touch-target-sm)',
              flexShrink: 0,
            }}
            aria-label={t('language')}
          >
            <Globe
              size={18}
              style={{ opacity: 0.85, color: 'var(--text-muted)', flexShrink: 0 }}
              aria-hidden
            />
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as 'no' | 'se' | 'en')}
              className="header-guest-lang-select"
              style={{
                margin: 0,
                height: 'var(--touch-target-sm)',
                minHeight: 'var(--touch-target-sm)',
                boxSizing: 'border-box',
                padding: '0 10px',
                borderRadius: 8,
                background: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                lineHeight: 1.2,
                maxWidth: '150px',
              }}
            >
              <option value="no">{t('norwegian')}</option>
              <option value="se">{t('sami')}</option>
              <option value="en">{t('english')}</option>
            </select>
          </div>
          <Link
            href="/login"
            className="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              padding: '0 var(--space-5)',
              minHeight: 'var(--touch-target-sm)',
              height: 'var(--touch-target-sm)',
              boxSizing: 'border-box',
              borderRadius: '10px',
            }}
            onClick={closeMobileNav}
          >
            <LogIn size={16} style={{ marginRight: '6px' }} /> {t('logIn')}
          </Link>
        </div>
      )}
    </>
  )

  return (
    <header className="header">
      <div
        className="header-inner container"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 var(--space-4)',
          paddingLeft: 'max(var(--space-4), env(safe-area-inset-left))',
          paddingRight: 'max(var(--space-4), env(safe-area-inset-right))',
        }}
      >
        <Link
          href={logoHref}
          style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          onClick={closeMobileNav}
        >
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav
          className="header-nav-desktop"
          style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}
        >
          {navContent}
        </nav>

        {/* Mobile: gjester får språk + hamburger; innloggede får snarveier + hamburger */}
        <div
          className="header-mobile-actions"
          style={{ display: 'none', alignItems: 'center', gap: 'var(--space-2)' }}
        >
          {!loading && !user && (
            <div
              className="header-guest-lang"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                height: 'var(--touch-target)',
                flexShrink: 0,
              }}
              aria-label={t('language')}
            >
              <Globe
                size={20}
                style={{ opacity: 0.85, color: 'var(--text-muted)', flexShrink: 0 }}
                aria-hidden
              />
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as 'no' | 'se' | 'en')}
                className="header-guest-lang-select"
                style={{
                  margin: 0,
                  height: 'var(--touch-target)',
                  minHeight: 'var(--touch-target)',
                  boxSizing: 'border-box',
                  padding: '0 8px',
                  borderRadius: 8,
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '0.8rem',
                  lineHeight: 1.2,
                  maxWidth: 'min(130px, 28vw)',
                }}
              >
                <option value="no">{t('norwegian')}</option>
                <option value="se">{t('sami')}</option>
                <option value="en">{t('english')}</option>
              </select>
            </div>
          )}
          {user && (
            <>
              {isKommuneStaffRole(navRoleForLinks) && (
                <Link
                  href="/nav/messages"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    color: 'white',
                    textDecoration: 'none',
                  }}
                  aria-label={t('messages')}
                  title={t('messages')}
                  onClick={closeMobileNav}
                >
                  <MessageSquare size={22} />
                </Link>
              )}
              {showLandlordFullNav && (
                <Link
                  href="/homeowner/manage"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    color: 'white',
                    textDecoration: 'none',
                  }}
                  aria-label={t('myProperties')}
                  title={t('myProperties')}
                  onClick={closeMobileNav}
                >
                  <Home size={22} />
                </Link>
              )}
              {user && (isKommuneStaffRole(navRoleForLinks) || showLandlordFullNav) && (
                <Link
                  href="/nav/notifications"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    color: 'white',
                    position: 'relative',
                    textDecoration: 'none',
                  }}
                  aria-label={t('notifications')}
                  onClick={closeMobileNav}
                >
                  <Bell size={22} />
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        background: '#ef4444',
                        color: 'white',
                        fontSize: '0.65rem',
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
              )}
            </>
          )}
          <button
            className="header-hamburger"
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            aria-label={isMobileNavOpen ? t('closeMenu') : t('openMenu')}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              color: 'white',
              cursor: 'pointer',
            }}
          >
            {isMobileNavOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile nav overlay */}
      <div
        className="header-nav-mobile"
        style={{
          display: isMobileNavOpen ? 'flex' : 'none',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          padding: 'var(--space-4)',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {navContent}
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .header-nav-desktop {
            display: none !important;
          }
          .header-mobile-actions {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .header-nav-mobile {
            display: none !important;
          }
        }
        /* Gjest: språk i topplinjen; ikke gjenta globus i mobil-drawer */
        @media (max-width: 768px) {
          .header-nav-mobile .header-guest-lang-row {
            display: none !important;
          }
          .header-nav-mobile .header-guest-toolbar {
            flex-direction: column;
            align-items: stretch;
            margin-left: 0 !important;
          }
        }
        .menu-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          width: 100%;
          padding: var(--space-3) var(--space-4);
          color: var(--text-main);
          text-decoration: none;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: background 0.2s;
        }
        .menu-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .menu-item-logout:hover {
          background: rgba(239, 68, 68, 0.1) !important;
        }
      `}</style>
    </header>
  )
}
