'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import FeaturePortalGate from '@/app/components/FeaturePortalGate'
import ShellChromeControls from '@/app/components/design-system/ShellChromeControls'
import MobilePageTransition from '@/components/layout/mobile-page-transition'
import LosMobileShellNav from './LosMobileShellNav'

export default function LosShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage()

  useEffect(() => {
    document.documentElement.setAttribute('data-los-shell', 'true')
    return () => document.documentElement.removeAttribute('data-los-shell')
  }, [])

  return (
    <div className="los-shell">
      <header className="los-header hrt-glass-header">
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
        <FeaturePortalGate feature="los">
          <MobilePageTransition>{children}</MobilePageTransition>
        </FeaturePortalGate>
      </main>
      <footer className="los-footer los-footer--desktop">
        <Link href="/los/personvern">{t('losPrivacyLink')}</Link>
      </footer>
      <LosMobileShellNav />
    </div>
  )
}
