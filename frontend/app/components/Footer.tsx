'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Mail, Info, Shield, Activity, Cookie, FileText } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import { useCookieConsent } from '../../context/CookieConsentContext'

export default function Footer() {
  const { t } = useLanguage()
  const { theme } = useTheme()
  const { reopenCookieSettings } = useCookieConsent()
  const narvikLogoSrc = theme === 'light' ? '/Logonavnarvik.png' : '/Logonavnarvikhvit.png'

  const [gameChangingFailed, setGameChangingFailed] = useState(false)
  const [narvikLogoFailed, setNarvikLogoFailed] = useState(false)

  useEffect(() => {
    setNarvikLogoFailed(false)
  }, [narvikLogoSrc])

  return (
    <footer className="footer">
      <div className="container" style={{ padding: 'var(--space-8) var(--space-4)' }}>
        <div className="footer-grid">
          {/* Logo Section */}
          <div className="footer-section">
            <div className="footer-brand-block">
              <p className="footer-developed-credit">
                {t('footerDevelopedLine1')}
                <br />
                {t('footerDevelopedLine2')}
              </p>
              <div className="footer-logos-row">
                <div className="footer-logo-container">
                  {gameChangingFailed ? (
                    <span
                      style={{
                        display: 'inline-block',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        padding: 'var(--space-2) 0',
                      }}
                    >
                      Game Changing
                    </span>
                  ) : (
                    <Image
                      src="/logo-gamechanging.png"
                      alt="Game Changing"
                      width={360}
                      height={120}
                      sizes="(max-width: 480px) 90vw, 360px"
                      style={{
                        height: '100px',
                        width: 'auto',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                      onError={() => setGameChangingFailed(true)}
                    />
                  )}
                </div>
                <div
                  className="footer-logo-container"
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  {narvikLogoFailed ? (
                    <span
                      style={{
                        fontWeight: 600,
                        color: 'var(--text-main)',
                      }}
                    >
                      Narvik
                    </span>
                  ) : (
                    <Image
                      src={narvikLogoSrc}
                      alt="Narvik kommune"
                      width={400}
                      height={160}
                      sizes="(max-width: 480px) 90vw, 400px"
                      style={{
                        height: '140px',
                        width: 'auto',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                      onError={() => setNarvikLogoFailed(true)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="footer-section">
            <h3
              style={{
                fontSize: '1rem',
                color: 'var(--text-main)',
                marginBottom: 'var(--space-4)',
              }}
            >
              {t('contactUs')}
            </h3>
            <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
              <a href="mailto:info@bolynorge.no" className="footer-link">
                <Mail size={16} /> info@bolynorge.no
              </a>
            </div>
          </div>

          {/* Legal Section */}
          <div className="footer-section">
            <h3
              style={{
                fontSize: '1rem',
                color: 'var(--text-main)',
                marginBottom: 'var(--space-4)',
              }}
            >
              {t('info')}
            </h3>
            <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
              <p
                style={{
                  margin: '0 0 var(--space-2)',
                  fontSize: '0.875rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.45,
                  maxWidth: '22rem',
                }}
              >
                {t('footerTermsScopeNote')}
              </p>
              <Link
                href="/brukervilkar/"
                className="footer-link"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
              >
                <FileText size={16} /> {t('footerTermsAgreementLink')}
              </Link>
              <Link
                href="/personvern/"
                className="footer-link"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
              >
                <Shield size={16} /> {t('privacy')}
              </Link>
              <button
                type="button"
                className="footer-link"
                onClick={() => reopenCookieSettings()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  font: 'inherit',
                  color: 'inherit',
                  textAlign: 'left',
                }}
              >
                <Cookie size={16} aria-hidden /> {t('footerCookieSettings')}
              </button>
              <Link
                href="/om-boly/"
                className="footer-link"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
              >
                <Info size={16} /> {t('aboutBoly')}
              </Link>
              <Link
                href="/diagnostics"
                className="footer-link hide-on-mobile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  marginTop: 'var(--space-2)',
                }}
              >
                <Activity size={16} /> {t('footerDiagnostics')}
              </Link>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 'var(--space-8)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--border-subtle)',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
          }}
        >
          {t('copyright')}
        </div>
      </div>
    </footer>
  )
}
