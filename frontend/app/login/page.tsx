'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AuthCard from '@/features/auth/components/AuthCard'
import { LazyAuroraBackground } from '@/components/ui/lazy-aurora-background'
import { Compass, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import PortalCard from '../components/design-system/PortalCard'
import { useLanguage } from '../../context/LanguageContext'
import { usePlatformMode } from '../../context/PlatformModeContext'

function safeRedirect(raw: string | null): string | undefined {
  if (typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')) return raw
  return undefined
}

function LoginPageContent() {
  const { t } = useLanguage()
  const { flags } = usePlatformMode()
  const searchParams = useSearchParams()
  const redirectTo = safeRedirect(searchParams.get('redirect'))
  const signupMode =
    searchParams.get('signup') === '1' || searchParams.get('signup') === 'true'
  const portalCount = (flags.finn ? 1 : 0) + (flags.los ? 1 : 0)

  return (
    <main className="login-page">
      <div className="card login-card relative isolate overflow-hidden">
        <LazyAuroraBackground
          className="login-card__aurora"
          intensity={0.35}
          showRadialGradient={false}
        />
        <AuthCard
          context="landlord"
          redirectTo={redirectTo}
          initialSignUp={signupMode}
          showAurora={false}
        />
      </div>

      {flags.finn || flags.los ? (
        <div
          className={`hrt-login-portals${portalCount === 1 ? ' hrt-login-portals--single' : ''}`}
        >
          {flags.finn ? (
            <PortalCard
              icon={Compass}
              title={t('homeFeatureFinnTitle')}
              description={t('homeFeatureFinnDesc')}
              ctaLabel={t('homeFeatureGoTo')}
              href="/finn"
              variant="accent"
            />
          ) : null}
          {flags.los ? (
            <PortalCard
              icon={MessageCircle}
              title={t('homeFeatureLosTitle')}
              description={t('homeFeatureLosDesc')}
              ctaLabel={t('homeFeatureGoTo')}
              href="/los"
              variant="teal"
            />
          ) : null}
        </div>
      ) : null}

      {signupMode ? (
        <p className="finn-card-meta" style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
          <Link href="/homeowner/register">{t('createAccount')}</Link>
        </p>
      ) : null}
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="login-page"
          style={{
            minHeight: '100svh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="card" style={{ padding: 'var(--space-10)', minWidth: '360px' }} />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
