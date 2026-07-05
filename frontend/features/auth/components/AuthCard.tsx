'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { LogIn, Mail, Lock, Phone, User, UserPlus } from 'lucide-react'
import { supabase, isSupabaseConfigured, getAuthUserDeduped } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import FieldInput from '@/app/components/design-system/FieldInput'
import ShellChromeControls from '@/app/components/design-system/ShellChromeControls'
import { Button } from '@/app/components/ui/Button'
import Logo from '@/app/components/Logo'
import { LazyAuroraBackground } from '@/components/ui/lazy-aurora-background'
import { resolveEmailSignUpOutcome } from '@/app/lib/authSignUp'
import { ensureOwnProfile } from '@/app/lib/ensureProfile'
import { ensureGuestProfile } from '@/app/lib/ensureGuestProfile'
import {
  type AuthContext,
  friendlyAuthErrorMessage,
  resolvePostLoginHref,
} from '@/features/auth/lib/postLoginRouting'

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

export type AuthCardProps = {
  context: AuthContext
  /** Post-login redirect when no role-specific home applies. */
  redirectTo?: string
  /** Compact layout for dialog embedding (no logo row). */
  compact?: boolean
  /** Open sign-up form initially (e.g. ?signup=1). */
  initialSignUp?: boolean
  /** Called after successful sign-in instead of router navigation. */
  onAuthenticated?: (user: SupabaseUser) => void | Promise<void>
  className?: string
}

export default function AuthCard({
  context,
  redirectTo,
  compact = false,
  initialSignUp = false,
  onAuthenticated,
  className,
}: AuthCardProps) {
  const { t, setLocale } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()

  const defaultRedirect = redirectTo ?? (context === 'guest' ? '/finn/mine' : '/')
  const signupRedirect =
    context === 'guest' ? defaultRedirect : '/homeowner/register'

  const [sessionUser, setSessionUser] = useState<SupabaseUser | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(initialSignUp)

  useEffect(() => {
    if (initialSignUp) setIsSignUp(true)
  }, [initialSignUp])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [showMagicLink, setShowMagicLink] = useState(false)

  /** Login pages use device locale, not the previous account's profile preference. */
  useEffect(() => {
    const stored = localStorage.getItem('boly-locale')
    if (stored === 'no' || stored === 'se' || stored === 'en') {
      setLocale(stored)
    }
  }, [setLocale])

  useEffect(() => {
    if (compact) return
    if (searchParams.get('reason') === 'email_not_confirmed') {
      setMessage({ type: 'error', text: t('loginEmailNotConfirmed') })
    }
    if (searchParams.get('reset') === 'success') {
      setMessage({ type: 'success', text: t('loginPasswordResetSuccess') })
    }
  }, [compact, searchParams, t])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const user = await getAuthUserDeduped()
      if (cancelled) return
      if (user?.email && user.email_confirmed_at == null) {
        await supabase.auth.signOut({ scope: 'local' })
        setSessionUser(null)
      } else {
        setSessionUser(user?.email ? user : null)
      }
      setCheckingSession(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const finishAuth = async (user: SupabaseUser) => {
    if (onAuthenticated) {
      await onAuthenticated(user)
      return
    }

    await ensureOwnProfile(supabase)
    if (context === 'guest') {
      await ensureGuestProfile(supabase, {
        displayName: fullName.trim() || undefined,
        phone: contactPhone.trim() || undefined,
      })
      await supabase.rpc('link_guest_bookings_on_login')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const href = await resolvePostLoginHref(supabase, user.id, user.email, {
      explicitNext: defaultRedirect,
      reuseProfileRole: profile?.role,
    })
    router.replace(href)
  }

  const validateFields = (): boolean => {
    const errors: Record<string, string> = {}
    if (!email.trim()) errors.email = t('authErrorEmailRequired')
    if (!showMagicLink && !password) errors.password = t('authErrorPasswordRequired')
    if (isSignUp && !fullName.trim()) errors.fullName = t('authErrorNameRequired')
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (!validateFields()) return

    if (!isSupabaseConfigured) {
      setMessage({ type: 'error', text: t('pageLoadStuck') })
      return
    }

    setLoading(true)
    try {
      if (isSignUp) {
        const next = encodeURIComponent(signupRedirect)
        const emailRedirectTo = `${window.location.origin}/auth/callback?next=${next}`
        const signUpData = {
          full_name: fullName.trim() || undefined,
          contact_phone: contactPhone.trim() || undefined,
          provider: 'email',
          ...(context === 'guest' ? { role: 'leietaker' } : {}),
        }

        const { data, error } = await withNetworkTimeout(
          supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { emailRedirectTo, data: signUpData },
          }),
          AUTH_NETWORK_MS
        )

        const outcome = await resolveEmailSignUpOutcome(
          supabase,
          data,
          error,
          { email: email.trim(), password },
          emailRedirectTo
        )

        if (outcome.kind === 'failed') {
          throw Object.assign(new Error(outcome.message), { name: 'AuthError' })
        }
        if (outcome.kind === 'created_needs_confirm' || outcome.kind === 'resend_confirmation') {
          setMessage({ type: 'success', text: t('checkEmail') })
          return
        }
        if (outcome.kind === 'email_taken') {
          setIsSignUp(false)
          setMessage({ type: 'error', text: t('signUpEmailAlreadyRegistered') })
          return
        }

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
        await finishAuth(user)
      } else {
        const { data: signInData, error } = await withNetworkTimeout(
          supabase.auth.signInWithPassword({ email: email.trim(), password }),
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
        if (!user) {
          setMessage({ type: 'error', text: t('loginAuthNoResponse') })
          return
        }
        await finishAuth(user)
      }
    } catch (error: unknown) {
      setMessage({ type: 'error', text: friendlyAuthErrorMessage(t, error) })
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (!email.trim()) {
      setFieldErrors({ email: t('authErrorEmailRequired') })
      return
    }
    if (!isSupabaseConfigured) {
      setMessage({ type: 'error', text: t('pageLoadStuck') })
      return
    }

    setLoading(true)
    try {
      const next = encodeURIComponent(defaultRedirect)
      const emailRedirectTo = `${window.location.origin}/auth/callback?next=${next}`
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo },
      })
      if (error) throw error
      setMagicLinkSent(true)
      setMessage({ type: 'success', text: t('finnMineMagicLinkLead') })
    } catch (error: unknown) {
      setMessage({ type: 'error', text: friendlyAuthErrorMessage(t, error) })
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchAccount = async () => {
    setLoading(true)
    await supabase.auth.signOut({ scope: 'local' })
    setSessionUser(null)
    setEmail('')
    setPassword('')
    setMessage(null)
    setLoading(false)
  }

  const handleContinue = async () => {
    if (!sessionUser) return
    setLoading(true)
    try {
      await finishAuth(sessionUser)
    } finally {
      setLoading(false)
    }
  }

  const heading =
    context === 'guest'
      ? isSignUp
        ? t('finnLoginCreateAccount')
        : t('finnLoginTitle')
      : isSignUp
        ? t('createAccount')
        : t('authLandlordLoginTitle')

  const lead =
    context === 'guest'
      ? isSignUp
        ? t('finnLoginSignUpLead')
        : t('finnLoginLead')
      : isSignUp
        ? t('createAccountDesc')
        : t('authLandlordLoginDesc')

  if (checkingSession) {
    return (
      <div className={`auth-card auth-card--loading${className ? ` ${className}` : ''}`}>
        <p className="finn-card-meta">{t('loadingPleaseWait')}</p>
      </div>
    )
  }

  if (sessionUser?.email) {
    return (
      <div className={`auth-card auth-card--signed-in${className ? ` ${className}` : ''}`}>
        {!compact ? (
          <div className="auth-card__chrome">
            <Logo />
            <ShellChromeControls compact className="login-chrome-controls" />
          </div>
        ) : null}
        <h1 className="auth-card__title">{t('authSignedInTitle')}</h1>
        <p className="auth-card__lead">
          {t('authSignedInAs').replace('{email}', sessionUser.email)}
        </p>
        <div className="auth-card__actions">
          <Button type="button" variant="gradient" disabled={loading} onClick={() => void handleContinue()}>
            {t('authContinueSignedIn')}
          </Button>
          <Button type="button" variant="secondary" disabled={loading} onClick={() => void handleSwitchAccount()}>
            {t('authSwitchAccount')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`auth-card${compact ? ' auth-card--compact' : ''}${className ? ` ${className}` : ''}`}>
      {!compact ? (
        <>
          <LazyAuroraBackground className="auth-card__aurora" intensity={0.35} />
          <div className="auth-card__chrome">
            <Logo />
            <ShellChromeControls compact className="login-chrome-controls" />
          </div>
        </>
      ) : null}

      <div className="auth-card__body">
        <h1 className="auth-card__title">{heading}</h1>
        <p className="auth-card__lead">{lead}</p>

        {message ? (
          <div
            className={`hrt-alert${message.type === 'success' ? ' hrt-alert--success' : ' hrt-alert--error'}`}
            role="alert"
          >
            {message.text}
          </div>
        ) : null}

        {showMagicLink && context === 'guest' && !isSignUp ? (
          <form onSubmit={(e) => void handleMagicLink(e)} className="hrt-login-form">
            <FieldInput
              label={t('email')}
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              icon={<Mail size={18} />}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email ? <p className="auth-card__field-error">{fieldErrors.email}</p> : null}
            <Button type="submit" variant="accent" disabled={loading || magicLinkSent}>
              {t('finnMineMagicLinkCta')}
            </Button>
            <button
              type="button"
              className="hrt-link-button auth-card__secondary-action"
              onClick={() => {
                setShowMagicLink(false)
                setMagicLinkSent(false)
                setMessage(null)
              }}
            >
              {t('authUsePasswordInstead')}
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => void handlePasswordAuth(e)} className="hrt-login-form">
            {isSignUp ? (
              <>
                <FieldInput
                  label={t('fullName')}
                  name="full_name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  icon={<User size={18} />}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                />
                {fieldErrors.fullName ? (
                  <p className="auth-card__field-error">{fieldErrors.fullName}</p>
                ) : null}
                <FieldInput
                  label={t('phone')}
                  name="phone"
                  type="tel"
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
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              icon={<Mail size={18} />}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email ? <p className="auth-card__field-error">{fieldErrors.email}</p> : null}
            <FieldInput
              label={t('password')}
              name="password"
              type="password"
              required={!showMagicLink}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              icon={<Lock size={18} />}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            {fieldErrors.password ? (
              <p className="auth-card__field-error">{fieldErrors.password}</p>
            ) : null}

            <Button type="submit" variant={context === 'guest' ? 'accent' : 'gradient'} disabled={loading}>
              {loading ? (
                t('loadingPleaseWait')
              ) : isSignUp ? (
                <>
                  <UserPlus size={18} aria-hidden /> {t('createAccount')}
                </>
              ) : (
                <>
                  <LogIn size={18} aria-hidden /> {t('logIn')}
                </>
              )}
            </Button>
          </form>
        )}

        <div className="auth-card__footer">
          <p>
            {isSignUp ? t('alreadyHaveAccount') : t('noAccount')}{' '}
            <button type="button" className="hrt-link-button" onClick={() => setIsSignUp((v) => !v)}>
              {isSignUp ? t('loginHere') : t('signUpHere')}
            </button>
          </p>
          {!isSignUp && !showMagicLink ? (
            <p>
              <Link href="/login/forgot-password">{t('forgotPassword')}</Link>
            </p>
          ) : null}
          {context === 'guest' && !isSignUp && !showMagicLink ? (
            <p>
              <button
                type="button"
                className="hrt-link-button"
                onClick={() => {
                  setShowMagicLink(true)
                  setMessage(null)
                }}
              >
                {t('finnMineMagicLinkCta')}
              </button>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
