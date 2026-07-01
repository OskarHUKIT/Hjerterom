'use client'

import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'
import FeaturePortalGate from '@/app/components/FeaturePortalGate'
import ShellChromeControls from '@/app/components/design-system/ShellChromeControls'

export default function LosShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage()

  return (
    <div className="los-shell">
      <header className="los-header">
        <div>
          <h1>{t('losTitle')}</h1>
          <p>{t('losSubtitle')}</p>
        </div>
        <div className="los-header-actions">
          <ShellChromeControls compact />
          <Link href="/" className="los-exit-link">
            {t('losExit')}
          </Link>
        </div>
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
