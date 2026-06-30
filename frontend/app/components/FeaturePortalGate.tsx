'use client'

import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'
import { usePlatformMode } from '@/context/PlatformModeContext'
import { Button } from '@/app/components/ui/Button'

type FeaturePortalGateProps = {
  feature: 'finn' | 'los'
  children: React.ReactNode
}

/** Blocks Finn/Los portals when disabled in platform settings. */
export default function FeaturePortalGate({ feature, children }: FeaturePortalGateProps) {
  const { t } = useLanguage()
  const { flags, isLoading } = usePlatformMode()

  if (isLoading) {
    return (
      <div className="container" style={{ padding: 'var(--space-10)', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>{t('loadingPleaseWait')}</p>
      </div>
    )
  }

  const enabled = feature === 'finn' ? flags.finn : flags.los
  if (enabled) return <>{children}</>

  return (
    <div className="container" style={{ padding: 'clamp(2rem, 8vh, 4rem) var(--space-4)' }}>
      <div className="card" style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-8)', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.35rem', marginBottom: 'var(--space-3)' }}>
          {feature === 'finn' ? t('platformFinnDisabledTitle') : t('platformLosDisabledTitle')}
        </h1>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: 'var(--space-6)' }}>
          {t('platformFeatureDisabledDesc')}
        </p>
        <Link href="/">
          <Button variant="primary">{t('goHome')}</Button>
        </Link>
      </div>
    </div>
  )
}
