'use client'

/**
 * Auth-callback som client component.
 *
 * Vi må utføre `exchangeCodeForSession` i nettleseren fordi PKCE `code_verifier` lagres i
 * browserens `localStorage` av `@supabase/supabase-js` når flyten startes (f.eks.
 * `resetPasswordForEmail` eller `signUp`). Hvis vi bytter koden på server-siden får vi
 * "PKCE code verifier not found in storage".
 *
 * Håndterer både:
 *  - `?code=...` (PKCE) → kall `exchangeCodeForSession`
 *  - `?error_description=...` / `?error=...` → videresend til /auth/auth-code-error
 *  - Hash-baserte tokens (`#access_token=...`) → Supabase-klienten plukker dette opp
 *    automatisk via `detectSessionInUrl`; vi venter en runde og går videre.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useLanguage } from '../../../context/LanguageContext'

function AuthCallbackInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { t } = useLanguage()
  const [status, setStatus] = useState<'working' | 'error'>('working')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const code = params.get('code')
      const tokenHash = params.get('token_hash')
      const otpType = params.get('type')
      const errorDescription = params.get('error_description') || params.get('error')
      const next = params.get('next') || '/'

      if (errorDescription) {
        const target = new URL('/auth/auth-code-error', window.location.origin)
        target.searchParams.set('reason', errorDescription)
        window.location.replace(target.toString())
        return
      }

      if (!isSupabaseConfigured) {
        if (!cancelled) setStatus('error')
        return
      }

      /**
       * Token-hash-flyt for signup- og email-change-bekreftelse. Bruker samme mønster som
       * passord-reset: e-post-lenken peker på vår domenet og verifiseres kun når JS kjører,
       * så e-post-skannere ikke forbruker tokenet.
       */
      if (tokenHash && (otpType === 'signup' || otpType === 'email_change' || otpType === 'magiclink' || otpType === 'invite')) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        })
        if (cancelled) return
        if (error) {
          const target = new URL('/auth/auth-code-error', window.location.origin)
          target.searchParams.set('reason', error.message || 'verify_failed')
          window.location.replace(target.toString())
          return
        }
        router.replace(next.startsWith('/') ? next : '/')
        return
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (cancelled) return
        if (error) {
          const target = new URL('/auth/auth-code-error', window.location.origin)
          target.searchParams.set('reason', error.message || 'exchange_failed')
          window.location.replace(target.toString())
          return
        }
        router.replace(next.startsWith('/') ? next : '/')
        return
      }

      /**
       * Ingen `code` i URL. Supabase kan ha levert hash-tokens (`#access_token=...`) som
       * klienten leser inn av seg selv. Gi den et lite øyeblikk og sjekk sesjonen.
       */
      for (let attempt = 0; attempt < 6 && !cancelled; attempt++) {
        const { data } = await supabase.auth.getSession()
        if (data.session?.user) {
          router.replace(next.startsWith('/') ? next : '/')
          return
        }
        await new Promise((r) => setTimeout(r, 300))
      }
      if (!cancelled) {
        router.replace('/login/update-password')
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [params, router])

  return (
    <main
      style={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        color: 'var(--text-muted)',
        padding: 'var(--space-6)',
        textAlign: 'center',
      }}
    >
      <div>
        {status === 'working' ? (
          <p style={{ fontSize: '1rem' }}>{t('loadingPleaseWait')}</p>
        ) : (
          <p style={{ fontSize: '1rem' }}>{t('updatePasswordNoSession')}</p>
        )}
      </div>
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: '100svh',
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
      <AuthCallbackInner />
    </Suspense>
  )
}
