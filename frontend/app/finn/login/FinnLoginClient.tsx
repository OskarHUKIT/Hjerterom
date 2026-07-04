'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogIn, UserPlus } from 'lucide-react'
import { supabase, isSupabaseConfigured, getAuthUserDeduped } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import { Button } from '@/app/components/ui/Button'
import { ensureGuestProfile } from '@/app/lib/ensureGuestProfile'
import { resolveEmailSignUpOutcome } from '@/app/lib/authSignUp'
import { ensureOwnProfile } from '@/app/lib/ensureProfile'

function safeRedirect(raw: string | null): string {
  if (typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')) return raw
  return '/finn/mine'
}

export default function FinnLoginClient() {
  const { t } = useLanguage()
  const toast = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = safeRedirect(searchParams.get('redirect'))
  const signupMode =
    searchParams.get('signup') === '1' || searchParams.get('signup') === 'true'

  const [isSignUp, setIsSignUp] = useState(signupMode)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    if (signupMode) setIsSignUp(true)
  }, [signupMode])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const user = await getAuthUserDeduped()
      if (cancelled) return
      if (user?.email) {
        await ensureGuestProfile(supabase, {
          displayName: user.user_metadata?.full_name as string | undefined,
        })
        router.replace(redirectTo)
        return
      }
      setCheckingSession(false)
    })()
    return () => {
      cancelled = true
    }
  }, [redirectTo, router])

  const finishLogin = async (displayName?: string, contactPhone?: string) => {
    await ensureOwnProfile(supabase)
    await ensureGuestProfile(supabase, { displayName, phone: contactPhone })
    await supabase.rpc('link_guest_bookings_on_login')
    router.replace(redirectTo)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSupabaseConfigured) {
      toast(t('pageLoadStuck'), 'error')
      return
    }
    setLoading(true)
    try {
      if (isSignUp) {
        const next = encodeURIComponent(redirectTo)
        const emailRedirectTo = `${window.location.origin}/auth/callback?next=${next}`
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo,
            data: {
              full_name: fullName.trim() || undefined,
              contact_phone: phone.trim() || undefined,
              role: 'leietaker',
              provider: 'email',
            },
          },
        })

        const outcome = await resolveEmailSignUpOutcome(
          supabase,
          data,
          error,
          { email: email.trim(), password },
          emailRedirectTo
        )

        if (outcome.kind === 'failed') {
          toast(outcome.message, 'error')
          return
        }
        if (outcome.kind === 'created_needs_confirm' || outcome.kind === 'resend_confirmation') {
          toast(t('checkEmail'), 'success')
          return
        }
        if (outcome.kind === 'email_taken') {
          setIsSignUp(false)
          toast(t('signUpEmailAlreadyRegistered'), 'error')
          return
        }

        await finishLogin(fullName.trim(), phone.trim())
        toast(t('finnLoginWelcome'), 'success')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
        await finishLogin(fullName.trim() || undefined, phone.trim() || undefined)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('loginAuthNoResponse')
      toast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <section className="finn-card" style={{ maxWidth: 480, padding: 'var(--space-6)', margin: '0 auto' }}>
        <p className="finn-card-meta">{t('loadingPleaseWait')}</p>
      </section>
    )
  }

  return (
    <section>
      <div className="finn-hero">
        <h1>{isSignUp ? t('finnLoginCreateAccount') : t('finnLoginTitle')}</h1>
        <p>{isSignUp ? t('finnLoginSignUpLead') : t('finnLoginLead')}</p>
      </div>

      <div className="finn-card" style={{ maxWidth: 480, padding: 'var(--space-6)', margin: '0 auto' }}>
        {isSignUp ? (
          <UserPlus size={32} style={{ color: 'var(--finn-accent)', marginBottom: 'var(--space-3)' }} aria-hidden />
        ) : (
          <LogIn size={32} style={{ color: 'var(--finn-accent)', marginBottom: 'var(--space-3)' }} aria-hidden />
        )}

        <form className="finn-inquiry-form" onSubmit={(e) => void handleSubmit(e)} style={{ marginTop: 0 }}>
          {isSignUp ? (
            <label>
              {t('finnInquiryName')}
              <input
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>
          ) : null}
          <label>
            {t('finnInquiryEmail')}
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            {t('password')}
            <input
              type="password"
              required
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {isSignUp ? (
            <label>
              {t('finnInquiryPhone')}
              <input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
          ) : null}
          <Button type="submit" variant="accent" disabled={loading}>
            {isSignUp ? t('finnLoginCreateAccount') : t('finnMineLoginCta')}
          </Button>
        </form>

        <p className="finn-card-meta" style={{ marginTop: 'var(--space-4)' }}>
          {isSignUp ? t('finnLoginHaveAccount') : t('finnLoginNoAccount')}{' '}
          <button
            type="button"
            className="finn-footer-link"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
            onClick={() => setIsSignUp((v) => !v)}
          >
            {isSignUp ? t('finnMineLoginCta') : t('finnLoginCreateAccount')}
          </button>
        </p>

        <p className="finn-card-meta" style={{ marginTop: 'var(--space-3)' }}>
          <Link href="/finn" className="finn-footer-link">
            ← {t('finnNavSearch')}
          </Link>
        </p>
      </div>
    </section>
  )
}
