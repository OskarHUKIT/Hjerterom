'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  LogIn,
  Presentation,
  ArrowRight,
  X,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { Button, buttonClassName } from './components/ui/Button'

export default function Home() {
  const { t } = useLanguage()
  const [showDemoPopup, setShowDemoPopup] = useState(false)

  return (
    <main className="home-landing container">
      <div className="home-landing-layout">
        <div className="hero-section">
          <div className="hero-badge animate-delay-1">
            <ShieldCheck size={15} aria-hidden />
            {t('heroBadge')}
          </div>
          <h1 className="animate-delay-1 hero-title">{t('heroTitle')}</h1>
          <p className="animate-delay-2 hero-lead">{t('heroDesc')}</p>
        </div>

        <div className="grid-portal animate-delay-3">
          <article className="card portal-card portal-card-align-buttons">
            <div className="portal-card-icon portal-card-icon--login" aria-hidden>
              <LogIn size={26} />
            </div>
            <div className="portal-card-body">
              <h2>{t('homeLoginCardTitle')}</h2>
              <p className="portal-card-desc text-sm">{t('homeLoginCardDesc')}</p>
              <div className="portal-card-cta">
                <Link
                  href="/login"
                  className={buttonClassName('primary')}
                  style={{ width: '100%', padding: 'var(--space-4)' }}
                  aria-label={t('homeLoginCardLinkAria')}
                >
                  {t('homeLoginCardCta')} <ArrowRight size={18} aria-hidden />
                </Link>
              </div>
            </div>
          </article>

          <article className="card portal-card portal-card-align-buttons">
            <div className="portal-card-icon portal-card-icon--demo" aria-hidden>
              <Presentation size={26} />
            </div>
            <div className="portal-card-body">
              <h2>{t('homeDemoCardTitle')}</h2>
              <p className="portal-card-desc text-sm">{t('homeDemoCardDesc')}</p>
              <div className="portal-card-cta">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowDemoPopup(true)}
                  style={{ width: '100%', padding: 'var(--space-4)' }}
                >
                  {t('homeDemoCardCta')} <ArrowRight size={18} />
                </Button>
              </div>
            </div>
          </article>
        </div>

        <section className="trust-section animate-delay-3" aria-label={t('securityTitle')}>
          <div className="trust-section-item">
            <h3>
              <span className="trust-section-icon" aria-hidden>
                <ShieldCheck size={18} />
              </span>
              {t('securityTitle')}
            </h3>
            <p>{t('securityDesc')}</p>
          </div>
          <div className="trust-section-item">
            <h3>
              <span className="trust-section-icon" aria-hidden>
                <Sparkles size={18} />
              </span>
              {t('improvementTitle')}
            </h3>
            <p>{t('improvementDesc')}</p>
          </div>
        </section>
      </div>

      {showDemoPopup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-popup-title"
          className="pwa-prompt-overlay"
          onClick={() => setShowDemoPopup(false)}
        >
          <div className="pwa-prompt-card" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-4)',
              }}
            >
              <h3 id="demo-popup-title" style={{ margin: 0, fontSize: '1.25rem' }}>
                {t('homeDemoCardTitle')}
              </h3>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDemoPopup(false)}
                style={{ minHeight: 'auto', padding: 4, display: 'flex' }}
                aria-label={t('close')}
              >
                <X size={20} />
              </Button>
            </div>
            <p className="text-sm" style={{ marginBottom: 'var(--space-4)' }}>
              {t('homeDemoPopupIntro')}
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                fontSize: '0.95rem',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  Tina Olsen, Nav Narvik
                </div>
                <a href="mailto:Tina.Olsen@nav.no" style={{ color: 'var(--color-accent)' }}>
                  Tina.Olsen@nav.no
                </a>
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  Lars Utstøl, GAMECHANGING
                </div>
                <a href="mailto:utstol@gamechanging.no" style={{ color: 'var(--color-accent)' }}>
                  utstol@gamechanging.no
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
