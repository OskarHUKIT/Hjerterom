'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import AuthCard from '@/features/auth/components/AuthCard'

function safeRedirect(raw: string | null): string {
  if (typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')) return raw
  return '/finn/mine'
}

function FinnLoginContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const redirectTo = safeRedirect(searchParams.get('redirect'))

  const signupMode =
    searchParams.get('signup') === '1' || searchParams.get('signup') === 'true'

  return (
    <section>
      <div className="finn-card auth-card-finn-shell" style={{ maxWidth: 480, padding: 'var(--space-6)', margin: '0 auto' }}>
        <AuthCard context="guest" redirectTo={redirectTo} initialSignUp={signupMode} />
      </div>

      <p className="finn-card-meta" style={{ marginTop: 'var(--space-3)', textAlign: 'center' }}>
        <Link href="/finn" className="finn-footer-link">
          ← {t('finnNavSearch')}
        </Link>
      </p>
    </section>
  )
}

export default function FinnLoginClient() {
  return (
    <Suspense fallback={null}>
      <FinnLoginContent />
    </Suspense>
  )
}
