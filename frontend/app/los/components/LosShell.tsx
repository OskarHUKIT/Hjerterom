'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import FeaturePortalGate from '@/app/components/FeaturePortalGate'

export default function LosShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage()

  useEffect(() => {
    document.documentElement.setAttribute('data-los-shell', 'true')
    return () => document.documentElement.removeAttribute('data-los-shell')
  }, [])

  return (
    <div className="los-shell">
      <header className="los-header">
        <div>
          <h1>{t('losTitle')}</h1>
          <p>{t('losSubtitle')}</p>
        </div>
        <Link href="/" style={{ color: 'var(--los-accent)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
          {t('losExit')}
        </Link>
      </header>
      <main className="los-main">
        <FeaturePortalGate feature="los">{children}</FeaturePortalGate>
      </main>
      <footer className="los-footer">
        <Link href="/los/personvern">{t('losPrivacyLink')}</Link>
      </footer>
    </div>
  )
}
