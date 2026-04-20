'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogIn, Presentation, ArrowRight, X } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { Button, buttonClassName } from './components/ui/Button'

export default function Home() {
  const { t } = useLanguage()
  const [showDemoPopup, setShowDemoPopup] = useState(false)

  return (
    <main className="home-landing container">
      <div className="home-landing-layout">
        <div className="hero-section">
          <h1 className="animate-delay-1 hero-title">{t('heroTitle')}</h1>
          <p className="animate-delay-2 hero-lead">{t('heroDesc')}</p>
        </div>

        <div className="grid-portal animate-delay-3">
        {/* Logg inn */}
        <div
          className="card portal-card portal-card-align-buttons"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-2)',
              color: 'var(--color-royal-blue)',
            }}
          >
            <LogIn size={28} />
          </div>
          <div className="portal-card-body">
            <h2>{t('homeLoginCardTitle')}</h2>
            <div className="portal-card-cta">
              <Link
                href="/login"
                className={buttonClassName('accent')}
                style={{ width: '100%', padding: 'var(--space-4)' }}
              >
                {t('homeLoginCardCta')} <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>

        {/* Be om demo */}
        <div
          className="card portal-card portal-card-align-buttons"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-2)',
              color: 'var(--color-royal-blue)',
            }}
          >
            <Presentation size={28} />
          </div>
          <div className="portal-card-body">
            <h2>{t('homeDemoCardTitle')}</h2>
            <div className="portal-card-cta">
              <Button
                type="button"
                variant="primary"
                onClick={() => setShowDemoPopup(true)}
                style={{ width: '100%', padding: 'var(--space-4)' }}
              >
                {t('homeDemoCardCta')} <ArrowRight size={18} />
              </Button>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Be om demo – popup med kontaktinfo */}
      {showDemoPopup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-popup-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
          }}
          onClick={() => setShowDemoPopup(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: 400,
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-lg, 0 10px 40px rgba(0,0,0,0.2))',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
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
                style={{
                  minHeight: 'auto',
                  padding: 4,
                  display: 'flex',
                }}
                aria-label={t('close')}
              >
                <X size={20} />
              </Button>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                fontSize: '0.95rem',
                marginTop: 'var(--space-2)',
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
