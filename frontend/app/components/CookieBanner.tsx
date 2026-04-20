'use client'

import Link from 'next/link'
import { Cookie } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useCookieConsent } from '../../context/CookieConsentContext'

/**
 * Samtykke til informasjonskapsler (GDPR / e-privacy).
 * «Kun nødvendige» og «Godta alle» like fremtredende; lenke til personvern.
 */
export default function CookieBanner() {
  const { t } = useLanguage()
  const { ready, showBanner, acceptNecessary, acceptAll } = useCookieConsent()

  if (!ready || !showBanner) return null

  return (
    <div
      role="region"
      aria-label={t('cookieBannerAriaLabel')}
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
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: '56rem',
          margin: '0 auto',
          display: 'grid',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
          <Cookie
            size={22}
            style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-accent, #38bdf8)' }}
            aria-hidden
          />
          <div>
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
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
            alignItems: 'stretch',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            className="button button-secondary"
            onClick={acceptNecessary}
            style={{
              minHeight: 44,
              minWidth: 'min(100%, 200px)',
              flex: '1 1 auto',
            }}
          >
            {t('cookieRejectNonEssential')}
          </button>
          <button
            type="button"
            className="button"
            onClick={acceptAll}
            style={{
              minHeight: 44,
              minWidth: 'min(100%, 200px)',
              flex: '1 1 auto',
            }}
          >
            {t('cookieAcceptAll')}
          </button>
        </div>
      </div>
    </div>
  )
}
