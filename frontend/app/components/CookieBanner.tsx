'use client'

import Link from 'next/link'
import { ArrowLeft, Cookie } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { useCookieConsent } from '../../context/CookieConsentContext'

/**
 * Samtykke til informasjonskapsler (GDPR art. 7 + ekomlova §2-7b / E-COM ACT 2025).
 *
 * Kravene som imøtekommes:
 *   1) Aktiv og spesifikk samtykke — ingen forhåndsavkrysning.
 *      «necessary» er forhåndslåst (true) fordi den faller utenfor samtykkekravet.
 *   2) «Avvis alle» skal være like lett som «Godta alle» — samme størrelse,
 *      plassering, visuell vekt (button-secondary vs button, men identisk
 *      min-width/flex/min-height).
 *   3) Granularitet — bruker kan velge kategori for kategori via «Tilpass valg».
 *   4) Ombestemmelse — fot-linken åpner banner igjen (reopenCookieSettings).
 */
export default function CookieBanner() {
  const { t } = useLanguage()
  const { ready, showBanner, acceptAll, rejectAll, savePreferences, categories } =
    useCookieConsent()
  const [expanded, setExpanded] = useState(false)
  const [localPrefs, setLocalPrefs] = useState({
    analytics: categories.analytics,
  })

  const toggleRowStyle = useMemo<React.CSSProperties>(
    () => ({
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: 'var(--space-3)',
      alignItems: 'start',
      padding: 'var(--space-3) 0',
      borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
    }),
    [],
  )

  if (!ready || !showBanner) return null

  return (
    <div
      role="region"
      aria-label={t('cookieBannerAriaLabel')}
      aria-labelledby="cookie-banner-title"
      className="cookie-banner"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10060,
        padding: 'var(--space-4)',
        paddingBottom: 'calc(var(--space-4) + env(safe-area-inset-bottom, 0px))',
        background: 'linear-gradient(to top, rgba(15, 23, 42, 0.97), rgba(15, 23, 42, 0.92))',
        borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.35)',
        maxHeight: '88dvh',
        overflowY: 'auto',
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: '56rem',
          margin: '0 auto',
          display: 'grid',
          gap: 'var(--space-4)',
          padding: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
          {expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label={t('cookieBack')}
              style={{
                marginTop: 2,
                background: 'transparent',
                border: 'none',
                color: 'var(--color-accent, #38bdf8)',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ArrowLeft size={22} aria-hidden />
            </button>
          ) : (
            <Cookie
              size={22}
              style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-accent, #38bdf8)' }}
              aria-hidden
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              id="cookie-banner-title"
              style={{
                margin: '0 0 var(--space-2)',
                fontSize: '1rem',
                fontWeight: 500,
                color: 'var(--text-main, #f8fafc)',
              }}
            >
              {t('cookieBannerTitle')}
            </h2>
            {!expanded && (
              <p
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  lineHeight: 1.55,
                  color: 'var(--text-body, #cbd5e1)',
                }}
              >
                {t('cookieBannerBody')}{' '}
                <Link
                  href="/personvern/"
                  style={{ color: 'var(--color-sky-blue, #7dd3fc)', textDecoration: 'underline' }}
                >
                  {t('cookiePrivacyLinkText')}
                </Link>
              </p>
            )}
          </div>
        </div>

        {expanded && (
          <div
            role="group"
            aria-labelledby="cookie-banner-title"
            style={{
              display: 'grid',
              gap: 0,
              padding: '0 var(--space-1)',
            }}
          >
            {/** Necessary — locked on; no checkbox, tydelig låst-badge. */}
            <div style={toggleRowStyle}>
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: 4,
                    fontSize: '0.95rem',
                  }}
                >
                  {t('cookieCategoryNecessary')}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-body)', lineHeight: 1.5 }}>
                  {t('cookieCategoryNecessaryDesc')}
                </div>
              </div>
              <div
                aria-hidden
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: 'rgba(45, 212, 191, 0.12)',
                  color: 'var(--color-teal, #2dd4bf)',
                  padding: '4px 10px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                  alignSelf: 'start',
                  border: '1px solid rgba(45, 212, 191, 0.3)',
                }}
              >
                {t('cookieCategoryNecessaryLocked')}
              </div>
            </div>

            <CategoryToggle
              name="analytics"
              checked={localPrefs.analytics}
              label={t('cookieCategoryAnalytics')}
              description={t('cookieCategoryAnalyticsDesc')}
              onChange={(v) => setLocalPrefs((prev) => ({ ...prev, analytics: v }))}
              rowStyle={toggleRowStyle}
            />
          </div>
        )}

        <div
          className="cookie-banner-actions"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
            alignItems: 'stretch',
            justifyContent: 'flex-end',
          }}
        >
          {!expanded && (
            <>
              <button
                type="button"
                className="button button-secondary"
                onClick={rejectAll}
                style={bannerBtnStyle}
              >
                {t('cookieRejectNonEssential')}
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setExpanded(true)}
                style={bannerBtnStyle}
              >
                {t('cookieCustomize')}
              </button>
              <button type="button" className="button" onClick={acceptAll} style={bannerBtnStyle}>
                {t('cookieAcceptAll')}
              </button>
            </>
          )}

          {expanded && (
            <>
              <button
                type="button"
                className="button button-secondary"
                onClick={rejectAll}
                style={bannerBtnStyle}
              >
                {t('cookieRejectNonEssential')}
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={acceptAll}
                style={bannerBtnStyle}
              >
                {t('cookieAcceptAll')}
              </button>
              <button
                type="button"
                className="button"
                onClick={() => savePreferences(localPrefs)}
                style={bannerBtnStyle}
              >
                {t('cookieSavePreferences')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const bannerBtnStyle: React.CSSProperties = {
  minHeight: 44,
  minWidth: 'min(100%, 180px)',
  flex: '1 1 auto',
}

function CategoryToggle(props: {
  name: string
  checked: boolean
  label: string
  description: string
  onChange: (v: boolean) => void
  rowStyle: React.CSSProperties
}) {
  const { name, checked, label, description, onChange, rowStyle } = props
  const id = `cookie-cat-${name}`
  return (
    <div style={rowStyle}>
      <div>
        <label
          htmlFor={id}
          style={{
            fontWeight: 600,
            color: 'var(--text-main)',
            marginBottom: 4,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'inline-block',
          }}
        >
          {label}
        </label>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-body)', lineHeight: 1.5 }}>
          {description}
        </div>
      </div>
      <label
        htmlFor={id}
        style={{
          position: 'relative',
          display: 'inline-block',
          width: 44,
          height: 26,
          flexShrink: 0,
          alignSelf: 'start',
          cursor: 'pointer',
        }}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={label}
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
        />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: checked
              ? 'var(--color-royal-blue, #3b82f6)'
              : 'rgba(148, 163, 184, 0.3)',
            borderRadius: 999,
            transition: 'background 0.2s',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
          }}
        />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: checked ? 22 : 3,
            top: 3,
            width: 18,
            height: 18,
            background: '#fff',
            borderRadius: '50%',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        />
      </label>
    </div>
  )
}
