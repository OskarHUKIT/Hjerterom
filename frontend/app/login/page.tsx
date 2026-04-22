'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import Link from 'next/link'
import { Mail, Lock, UserPlus, LogIn, User, Phone } from 'lucide-react'
import Logo from '../components/Logo'
import { useLanguage } from '../../context/LanguageContext'
import { bolyLocaleToSignicatUi } from '../lib/signicatLocale'
import { isKommuneStaffRole } from '../lib/kommuneRoles'
import { Button } from '../components/ui/Button'
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

/** Browser `fetch` failed before HTTP status (offline, DNS, CORS, blocked, wrong URL). */
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

function LoginPageContent() {
  const { t, locale } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const emailNotConfirmedReason = searchParams.get('reason') === 'email_not_confirmed'
  const passwordResetSuccess = searchParams.get('reset') === 'success'
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [bankIdRedirecting, setBankIdRedirecting] = useState(false)

  useEffect(() => {
    if (emailNotConfirmedReason) {
      setMessage({ type: 'error', text: t('loginEmailNotConfirmed') })
    }
  }, [emailNotConfirmedReason, t])

  useEffect(() => {
    if (passwordResetSuccess) {
      setMessage({ type: 'success', text: t('loginPasswordResetSuccess') })
    }
  }, [passwordResetSuccess, t])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user || cancelled) return
      if (session.user.email && session.user.email_confirmed_at == null) {
        await supabase.auth.signOut({ scope: 'local' })
        if (!cancelled) {
          setMessage({ type: 'error', text: t('loginEmailNotConfirmed') })
        }
        return
      }
      const raw = redirectTo
      const safeRedirect =
        typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : null
      if (safeRedirect && safeRedirect !== '/') {
        router.replace(safeRedirect)
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()
      if (cancelled) return
      const r = profile?.role ?? session.user.user_metadata?.role
      const home = isKommuneStaffRole(r) ? '/nav/database' : '/homeowner/manage'
      router.replace(home)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [router, redirectTo, t])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (!isSupabaseConfigured) {
      setMessage({ type: 'error', text: t('pageLoadStuck') })
      setLoading(false)
      return
    }

    try {
      if (isSignUp) {
        const { error } = await withNetworkTimeout(
          supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
              data: {
                full_name: fullName.trim() || undefined,
                contact_phone: contactPhone.trim() || undefined,
                provider: 'email',
              },
            },
          }),
          AUTH_NETWORK_MS
        )
        if (error) throw error
        setMessage({ type: 'success', text: t('checkEmail') })
      } else {
        const { data: signInData, error } = await withNetworkTimeout(
          supabase.auth.signInWithPassword({
            email,
            password,
          }),
          AUTH_NETWORK_MS
        )
        if (error) throw error
        let user: SupabaseUser | null = signInData.user ?? null
        if (!user) {
          const {
            data: { user: u },
          } = await withNetworkTimeout(supabase.auth.getUser(), AUTH_NETWORK_MS)
          user = u
        }
        if (redirectTo === '/' || !redirectTo) {
          const { data: profile } = user
            ? await withNetworkTimeout(
                supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
                AUTH_NETWORK_MS
              )
            : { data: null }
          const r = profile?.role ?? user?.user_metadata?.role
          router.push(isKommuneStaffRole(r) ? '/nav/database' : '/homeowner/manage')
        } else {
          router.push(redirectTo)
        }
      }
    } catch (error: unknown) {
      const err = error as { message?: string; name?: string }
      let text: string
      if (err?.name === 'AuthTimeout' || err?.message === 'AUTH_TIMEOUT') {
        text = t('loginAuthNoResponse')
      } else if (isBrowserFetchNetworkError(error)) {
        devWarn(
          '[Boly] Login: request failed before response. Check NEXT_PUBLIC_SUPABASE_URL is reachable from the browser:',
          process.env.NEXT_PUBLIC_SUPABASE_URL || '(missing)'
        )
        text = t('loginAuthNetworkFailed')
      } else {
        const raw = (err?.message || '').toLowerCase()
        if (
          raw.includes('email not confirmed') ||
          raw.includes('not confirmed') ||
          raw.includes('email_not_confirmed')
        ) {
          text = t('loginEmailNotConfirmed')
        } else {
          text = err?.message || t('loginAuthNoResponse')
        }
      }
      setMessage({ type: 'error', text })
    } finally {
      setLoading(false)
    }
  }

  /** BankID login button removed from UI; logic kept for possible re-enable. */
  const handleBankIDLogin = (e: React.MouseEvent) => {
    e.preventDefault()
    if (bankIdRedirecting) return
    setBankIdRedirecting(true)
    const returnTo = encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')
    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
    if (!base) {
      setMessage({
        type: 'error',
        text: 'NEXT_PUBLIC_SUPABASE_URL mangler – kan ikke starte BankID.',
      })
      setBankIdRedirecting(false)
      return
    }
    const uiLocales = bolyLocaleToSignicatUi(locale)
    const url = `${base}/functions/v1/auth-signicat?return_to=${returnTo}&ui_locales=${encodeURIComponent(uiLocales)}`
    window.location.assign(url)
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
            {isSignUp ? t('createAccount') : t('welcomeBack')}
          </h1>
          <p style={{ color: 'var(--text-body)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            {isSignUp ? t('createAccountDesc') : t('loginDesc')}
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

        <form onSubmit={handleAuth} style={{ display: 'grid', gap: 'var(--space-5)' }}>
          {isSignUp && (
            <>
              <div>
                <label className="label login-label" htmlFor="login-full-name">
                  {t('fullName')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="login-full-name"
                    name="full_name"
                    type="text"
                    className="input login-input"
                    placeholder={t('loginPlaceholderFullName')}
                    required={isSignUp}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    style={{ paddingLeft: '2.75rem', marginBottom: 0 }}
                  />
                  <User
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
                <label className="label login-label" htmlFor="login-phone">
                  {t('phone')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="login-phone"
                    name="phone"
                    type="tel"
                    className="input login-input"
                    placeholder={t('loginPlaceholderPhone')}
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    autoComplete="tel"
                    style={{ paddingLeft: '2.75rem', marginBottom: 0 }}
                  />
                  <Phone
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
            </>
          )}
          <div>
            <label className="label login-label" htmlFor="login-email">
              {t('email')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-email"
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

          <div>
            <label className="label login-label" htmlFor="login-password">
              {t('password')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                name="password"
                type="password"
                className="input login-input"
                placeholder={t('loginPasswordMask')}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
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
            {loading ? (
              isSignUp ? (
                <UserPlus size={20} style={{ opacity: 0.8 }} />
              ) : (
                <LogIn size={20} style={{ opacity: 0.8 }} />
              )
            ) : isSignUp ? (
              <UserPlus size={20} />
            ) : (
              <LogIn size={20} />
            )}
            {loading ? t('loadingPleaseWait') : isSignUp ? t('createAccount') : t('logIn')}
          </Button>
        </form>

        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center', fontSize: '0.95rem' }}>
          <p style={{ color: 'var(--text-body)' }}>
            {isSignUp ? t('alreadyHaveAccount') : t('noAccount')}{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-accent)',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
                textUnderlineOffset: 2,
              }}
            >
              {isSignUp ? t('loginHere') : t('signUpHere')}
            </button>
          </p>
        </div>

        {!isSignUp && (
          <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
            <Link href="/login/forgot-password" style={{ fontSize: '0.9rem', color: 'var(--color-accent)' }}>
              {t('forgotPassword')}
            </Link>
          </div>
        )}
      </div>
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
