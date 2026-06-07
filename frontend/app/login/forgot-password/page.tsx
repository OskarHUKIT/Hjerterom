'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import Logo from '../../components/Logo'
import { useLanguage } from '../../../context/LanguageContext'
import { Button } from '../../components/ui/Button'
import { devWarn } from '@/app/lib/appLogger'

/**
 * Password recovery can exceed normal login time (email pipeline, cold Auth).
 * Browser test on production showed HTTP 504 on /auth/v1/recover — retries help transient gateway timeouts.
 */
const RECOVER_ATTEMPT_MS = 90_000
const RECOVER_MAX_ATTEMPTS = 3

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
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

function isRetriablePasswordResetError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const status = (err as { status?: number }).status
    if (status === 504 || status === 502 || status === 503) return true
    const msg = String((err as { message?: string }).message || '')
    if (/504|502|503|gateway|timeout|timed out|temporar|rate limit/i.test(msg)) return true
  }
  if (err instanceof Error && err.name === 'AuthTimeout') return true
  if (err && typeof err === 'object' && (err as { message?: string }).message === 'AUTH_TIMEOUT')
    return true
  return isBrowserFetchNetworkError(err)
}

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

export default function ForgotPasswordPage() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (!isSupabaseConfigured) {
      setMessage({ type: 'error', text: t('pageLoadStuck') })
      setLoading(false)
      return
    }

    /**
     * redirectTo må være på Supabase allow-list (uten query-streng er enklest).
     * E-postmalen bør peke direkte på appen med token_hash — se supabase/templates/recovery.html.
     */
    const redirectTo = `${window.location.origin}/login/update-password`

    try {
      let lastError: unknown = null
      for (let attempt = 1; attempt <= RECOVER_MAX_ATTEMPTS; attempt++) {
        try {
          const { error } = await withNetworkTimeout(
            supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo }),
            RECOVER_ATTEMPT_MS
          )
          if (!error) {
            setMessage({ type: 'success', text: t('passwordResetEmailSent') })
            return
          }
          lastError = error
          if (attempt < RECOVER_MAX_ATTEMPTS && isRetriablePasswordResetError(error)) {
            devWarn('[Boly] Forgot password: retry after API error', attempt, error)
            await sleep(1200 * attempt)
            continue
          }
          throw error
        } catch (e) {
          lastError = e
          if (attempt < RECOVER_MAX_ATTEMPTS && isRetriablePasswordResetError(e)) {
            devWarn('[Boly] Forgot password: retry after exception', attempt, e)
            await sleep(1200 * attempt)
            continue
          }
          throw e
        }
      }
      throw lastError ?? new Error('password reset failed')
    } catch (error: unknown) {
      const err = error as { message?: string; name?: string; status?: number }
      let text: string
      const st = err?.status
      if (st === 504 || st === 502 || st === 503) {
        text = t('forgotPasswordGatewayError')
      } else if (err?.name === 'AuthTimeout' || err?.message === 'AUTH_TIMEOUT') {
        text = t('forgotPasswordAuthNoResponse')
      } else if (isBrowserFetchNetworkError(error)) {
        devWarn(
          '[Boly] Forgot password: request failed before response:',
          process.env.NEXT_PUBLIC_SUPABASE_URL || '(missing)'
        )
        text = t('forgotPasswordAuthNetworkFailed')
      } else {
        text = err?.message || t('forgotPasswordAuthNoResponse')
      }
      setMessage({ type: 'error', text })
    } finally {
      setLoading(false)
    }
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
        paddingLeft: 'max(var(--space-6), env(safe-area-inset-left))',
        paddingRight: 'max(var(--space-6), env(safe-area-inset-right))',
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
            {t('forgotPasswordPageTitle')}
          </h1>
          <p style={{ color: 'var(--text-body)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            {t('forgotPasswordPageDesc')}
          </p>
        </div>

        {message && (
          <div
            style={{
              padding: 'var(--space-4)',
              borderRadius: '12px',
              marginBottom: 'var(--space-6)',
              background:
                message.type === 'success' ? 'rgba(45, 212, 191, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${message.type === 'success' ? 'var(--color-teal)' : '#ef4444'}`,
              color: message.type === 'success' ? 'var(--color-teal)' : '#ef4444',
              fontSize: '0.9rem',
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--space-5)' }}>
          <div>
            <label className="label login-label" htmlFor="forgot-email">
              {t('email')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="forgot-email"
                name="email"
                type="email"
                className="input login-input"
                placeholder={t('loginPlaceholderEmail')}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                style={{ paddingLeft: '2.75rem', marginBottom: 0 }}
              />
              <Mail
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
            {loading ? t('loadingPleaseWait') : t('forgotPasswordSubmit')}
          </Button>
        </form>

        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <Link
            href="/login"
            style={{
              fontSize: '0.95rem',
              color: 'var(--color-accent)',
              fontWeight: 600,
            }}
          >
            {t('forgotPasswordBackToLogin')}
          </Link>
        </div>
      </div>
    </main>
  )
}
