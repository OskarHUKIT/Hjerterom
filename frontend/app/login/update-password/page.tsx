'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import Logo from '../../components/Logo'
import { useLanguage } from '../../../context/LanguageContext'
import { Button } from '../../components/ui/Button'
import { devWarn } from '@/app/lib/appLogger'

const AUTH_NETWORK_MS = 25000

function withNetworkTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(() => {
      reject(Object.assign(new Error('AUTH_TIMEOUT'), { name: 'AuthTimeout' }))
    }, ms)
    Promise.resolve(promise).then(
      (v) => {
        window.clearTimeout(id)
        resolve(v)
      },
      (e) => {
        window.clearTimeout(id)
        reject(e)
      }
    )
  })
}

function isBrowserFetchNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    const m = (error.message || '').toLowerCase()
    return (
      m.includes('failed to fetch') ||
      m.includes('networkerror') ||
      m.includes('load failed') ||
      m.includes('network request failed')
    )
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const m = String((error as { message?: string }).message || '').toLowerCase()
    return m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed')
  }
  return false
}

function UpdatePasswordInner() {
  const { t } = useLanguage()
  const router = useRouter()
  const params = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState<boolean | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false

    let recoveryFlow = false

    /**
     * Kun PASSWORD_RECOVERY (glemt passord) skal vise skjemaet — ikke signup-bekreftelse eller vanlig innlogging.
     */
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY') {
        recoveryFlow = true
        setSessionReady(true)
      }
    })

    const check = async () => {
      if (!isSupabaseConfigured) {
        if (!cancelled) setSessionReady(false)
        return
      }

      /**
       * Token-hash-flyt: e-post-lenken peker på vår egen side med `?token_hash=...&type=recovery`
       * i stedet for Supabase sitt `/verify`-endepunkt. Dermed forbrukes ikke tokenet av
       * e-post-skannere (Microsoft Safe Links, Outlook m.fl.), som bare laster HTML og ikke JS.
       * Vi kaller `verifyOtp` her – det bytter tokenet inn i en faktisk sesjon, og fjerner
       * deretter parametrene fra URL-en slik at tilbake-knapp/refresh ikke prøver å bruke det igjen.
       */
      const tokenHash = params.get('token_hash')
      const otpType = params.get('type')
      const hashType =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type')
          : null
      const isRecoveryUrl = otpType === 'recovery' || hashType === 'recovery'

      if (tokenHash && otpType === 'recovery') {
        recoveryFlow = true
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        })
        if (cancelled) return
        if (!error) {
          window.history.replaceState({}, '', window.location.pathname)
          setSessionReady(true)
          return
        }
        devWarn('[Boly] Update password: verifyOtp failed', error)
        const target = new URL('/auth/auth-code-error', window.location.origin)
        target.searchParams.set('reason', error.message || 'verify_failed')
        window.location.replace(target.toString())
        return
      }

      for (let attempt = 0; attempt < 5 && !cancelled; attempt++) {
        const { data } = await supabase.auth.getSession()
        if (cancelled) return
        if (data.session?.user) {
          if (recoveryFlow || isRecoveryUrl) {
            setSessionReady(true)
          } else {
            router.replace('/login')
          }
          return
        }
        await new Promise((r) => setTimeout(r, 400))
      }
      if (!cancelled) setSessionReady(false)
    }
    void check()
    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [params])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (password !== confirm) {
      setMessage({ type: 'error', text: t('passwordMismatch') })
      return
    }

    setLoading(true)

    if (!isSupabaseConfigured) {
      setMessage({ type: 'error', text: t('pageLoadStuck') })
      setLoading(false)
      return
    }

    try {
      const { error } = await withNetworkTimeout(
        supabase.auth.updateUser({ password }),
        AUTH_NETWORK_MS
      )
      if (error) throw error
      await supabase.auth.signOut({ scope: 'local' })
      router.replace('/login?reset=success')
    } catch (error: unknown) {
      const err = error as { message?: string; name?: string }
      let text: string
      if (err?.name === 'AuthTimeout' || err?.message === 'AUTH_TIMEOUT') {
        text = t('loginAuthNoResponse')
      } else if (isBrowserFetchNetworkError(error)) {
        devWarn('[Boly] Update password: network error')
        text = t('loginAuthNetworkFailed')
      } else {
        text = err?.message || t('loginAuthNoResponse')
      }
      setMessage({ type: 'error', text })
    } finally {
      setLoading(false)
    }
  }

  if (sessionReady === null) {
    return (
      <main
        className="login-page"
        style={{
          minHeight: '100svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-app)',
        }}
      >
        <p style={{ color: 'var(--text-muted)' }}>{t('loadingPleaseWait')}</p>
      </main>
    )
  }

  if (!sessionReady) {
    return (
      <main
        className="login-page"
        style={{
          minHeight: '100svh',
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
            maxWidth: '420px',
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
          <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-6)' }}>
            {t('updatePasswordNoSession')}
          </p>
          <Button variant="primary" onClick={() => router.push('/login/forgot-password')} style={{ width: '100%' }}>
            {t('forgotPasswordPageTitle')}
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main
      className="login-page"
      style={{
            minHeight: '100svh',
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
          maxWidth: '420px',
          padding: 'var(--space-8)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'inline-block', marginBottom: 'var(--space-5)' }}>
            <Logo />
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: 'var(--space-2)',
              color: 'var(--text-main)',
            }}
          >
            {t('updatePasswordPageTitle')}
          </h1>
          <p style={{ color: 'var(--text-body)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            {t('updatePasswordPageDesc')}
          </p>
        </div>

        {message && (
          <div
            style={{
              padding: 'var(--space-4)',
              borderRadius: '12px',
              marginBottom: 'var(--space-6)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              fontSize: '0.9rem',
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--space-5)' }}>
          <div>
            <label className="label login-label" htmlFor="new-password">
              {t('password')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="new-password"
                name="password"
                type="password"
                className="input login-input"
                placeholder={t('loginPasswordMask')}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                style={{ paddingLeft: '2.75rem', marginBottom: 0 }}
              />
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
          </div>
          <div>
            <label className="label login-label" htmlFor="confirm-password">
              {t('confirmPasswordLabel')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="confirm-password"
                name="confirm"
                type="password"
                className="input login-input"
                placeholder={t('loginPasswordMask')}
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                style={{ paddingLeft: '2.75rem', marginBottom: 0 }}
              />
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: 'var(--space-4)',
              marginTop: 'var(--space-2)',
              fontSize: '1.05rem',
              fontWeight: 600,
            }}
          >
            {loading ? t('loadingPleaseWait') : t('updatePasswordSubmit')}
          </Button>
        </form>
      </div>
    </main>
  )
}

export default function UpdatePasswordPage() {
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
      <UpdatePasswordInner />
    </Suspense>
  )
}
