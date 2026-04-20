'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Logo from '../../components/Logo'
import { Button } from '../../components/ui/Button'
import { useLanguage } from '../../../context/LanguageContext'

function AuthCodeErrorInner() {
  const params = useSearchParams()
  const reason = params.get('reason')
  const { t } = useLanguage()

  const looksExpired = reason
    ? /expire|otp_expired|invalid.*link|has expired|code verifier not found|pkce/i.test(reason)
    : false
  const headline = looksExpired ? t('authLinkExpired') : t('updatePasswordNoSession')

  return (
    <main
      className="login-page"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        paddingBottom: 'max(var(--space-6), env(safe-area-inset-bottom))',
        background: 'var(--bg-app)',
      }}
    >
      <div
        className="card login-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: 'var(--space-8)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <Logo />
        </div>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            marginBottom: 'var(--space-3)',
            color: 'var(--text-main)',
          }}
        >
          {headline}
        </h1>
        {reason && !looksExpired ? (
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              marginBottom: 'var(--space-6)',
              lineHeight: 1.5,
            }}
          >
            {reason}
          </p>
        ) : null}
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <Link href="/login/forgot-password" style={{ display: 'block' }}>
            <Button variant="primary" style={{ width: '100%' }}>
              {t('forgotPasswordPageTitle')}
            </Button>
          </Link>
          <Link
            href="/login"
            style={{
              fontSize: '0.9rem',
              color: 'var(--color-accent)',
              fontWeight: 500,
            }}
          >
            {t('forgotPasswordBackToLogin')}
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-app)',
            color: 'var(--text-muted)',
          }}
        >
          …
        </main>
      }
    >
      <AuthCodeErrorInner />
    </Suspense>
  )
}
