'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import Link from 'next/link'
import { Mail, Lock, UserPlus, LogIn, User, Phone } from 'lucide-react'
import Logo from '../components/Logo'
import FieldInput from '../components/design-system/FieldInput'
import { useLanguage } from '../../context/LanguageContext'
import { bolyLocaleToSignicatUi } from '../lib/signicatLocale'
import { getLandlordPostLoginHref } from '../lib/landlordNavGate'
import { Button } from '../components/ui/Button'
import { devWarn } from '@/app/lib/appLogger'
import { resolveEmailSignUpOutcome } from '../lib/authSignUp'
import { ensureOwnProfile } from '../lib/ensureProfile'

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
  const signupMode =
    searchParams.get('signup') === '1' || searchParams.get('signup') === 'true'
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(signupMode)
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
    if (signupMode) setIsSignUp(true)
  }, [signupMode])

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
      const home = await getLandlordPostLoginHref(supabase, session.user.id, session.user.email, {
        reuseProfileRole: r,
      })
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
        const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/homeowner/register')}`
        const { data, error } = await withNetworkTimeout(
          supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo,
              data: {
                full_name: fullName.trim() || undefined,
                contact_phone: contactPhone.trim() || undefined,
                provider: 'email',
              },
            },
          }),
          AUTH_NETWORK_MS
        )

        const outcome = await resolveEmailSignUpOutcome(
          supabase,
          data,
          error,
          { email, password },
          emailRedirectTo
        )

        if (outcome.kind === 'failed') {
          throw Object.assign(new Error(outcome.message), { name: 'AuthError' })
        }

        if (outcome.kind === 'created_needs_confirm') {
          setMessage({ type: 'success', text: t('checkEmail') })
          return
        }

        if (outcome.kind === 'resend_confirmation') {
          setMessage({ type: 'success', text: t('checkEmailResent') })
          return
        }

        if (outcome.kind === 'email_taken') {
          setIsSignUp(false)
          setMessage({ type: 'error', text: t('signUpEmailAlreadyRegistered') })
          return
        }

        // created_signed_in | signed_in_existing — same redirect as login
        let user: SupabaseUser | null = data.user ?? null
        if (outcome.kind === 'signed_in_existing') {
          const {
            data: { user: u },
          } = await withNetworkTimeout(supabase.auth.getUser(), AUTH_NETWORK_MS)
          user = u
        }
        if (!user) {
          setMessage({ type: 'error', text: t('loginAuthNoResponse') })
          return
        }
        await ensureOwnProfile(supabase)
        const { data: profile } = await withNetworkTimeout(
          supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
          AUTH_NETWORK_MS
        )
        const r = profile?.role ?? user.user_metadata?.role
        const home = await getLandlordPostLoginHref(supabase, user.id, user.email, {
          reuseProfileRole: r,
        })
        router.push(home)
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
        if (user) {
          await ensureOwnProfile(supabase)
        }
        if (redirectTo === '/' || !redirectTo) {
          const { data: profile } = user
            ? await withNetworkTimeout(
                supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
                AUTH_NETWORK_MS
              )
            : { data: null }
          const r = profile?.role ?? user?.user_metadata?.role
          const home = await getLandlordPostLoginHref(supabase, user!.id, user!.email, {
            reuseProfileRole: r,
          })
          router.push(home)
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
        text = `${t('loginAuthNetworkFailed')} (${typeof window !== 'undefined' ? window.location.origin : ''})`
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
    <main className="login-page">
      <div className="card login-card">
        <div className="hrt-login-header">
          <Logo />
          <h1>{isSignUp ? t('createAccount') : t('welcomeBack')}</h1>
          <p>{isSignUp ? t('createAccountDesc') : t('loginDesc')}</p>
        </div>

        {message ? (
          <div
            className={`hrt-alert${message.type === 'success' ? ' hrt-alert--success' : ' hrt-alert--error'}`}
            role="alert"
          >
            {message.text}
          </div>
        ) : null}

        <form onSubmit={handleAuth} className="hrt-login-form">
          {isSignUp ? (
            <>
              <FieldInput
                label={t('fullName')}
                name="full_name"
                type="text"
                id="login-full-name"
                placeholder={t('loginPlaceholderFullName')}
                required={isSignUp}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                icon={<User size={18} />}
              />
              <FieldInput
                label={t('phone')}
                name="phone"
                type="tel"
                id="login-phone"
                placeholder={t('loginPlaceholderPhone')}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                autoComplete="tel"
                icon={<Phone size={18} />}
              />
            </>
          ) : null}
          <FieldInput
            label={t('email')}
            name="email"
            type="email"
            id="login-email"
            placeholder={t('loginPlaceholderEmail')}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            icon={<Mail size={18} />}
          />
          <FieldInput
            label={t('password')}
            name="password"
            type="password"
            id="login-password"
            placeholder={t('loginPasswordMask')}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            icon={<Lock size={18} />}
          />

          <Button type="submit" variant="primary" disabled={loading} className="hrt-login-submit">
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

        <div className="hrt-login-footer">
          <p>
            {isSignUp ? t('alreadyHaveAccount') : t('noAccount')}{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              type="button"
              className="hrt-link-button"
            >
              {isSignUp ? t('loginHere') : t('signUpHere')}
            </button>
          </p>
        </div>

        {!isSignUp ? (
          <div className="hrt-login-forgot">
            <Link href="/login/forgot-password">{t('forgotPassword')}</Link>
          </div>
        ) : null}
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
