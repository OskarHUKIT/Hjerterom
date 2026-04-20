'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
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

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/login/update-password')}`

    try {
      const { error } = await withNetworkTimeout(
        supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo }),
        AUTH_NETWORK_MS
      )
      if (error) throw error
      setMessage({ type: 'success', text: t('passwordResetEmailSent') })
    } catch (error: unknown) {
      const err = error as { message?: string; name?: string }
      let text: string
      if (err?.name === 'AuthTimeout' || err?.message === 'AUTH_TIMEOUT') {
        text = t('loginAuthNoResponse')
      } else if (isBrowserFetchNetworkError(error)) {
        devWarn(
          '[Boly] Forgot password: request failed before response:',
          process.env.NEXT_PUBLIC_SUPABASE_URL || '(missing)'
        )
        text = t('loginAuthNetworkFailed')
      } else {
        text = err?.message || t('loginAuthNoResponse')
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
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        paddingLeft: 'max(var(--space-6), env(safe-area-inset-left))',
        paddingRight: 'max(var(--space-6), env(safe-area-inset-right))',
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
