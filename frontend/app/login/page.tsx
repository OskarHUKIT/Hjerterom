'use client'

import { use, useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { Mail, Lock, UserPlus, LogIn, User, Phone } from 'lucide-react'
import Logo from '../components/Logo'
import { useLanguage } from '../../context/LanguageContext'
import { isKommuneStaffRole } from '../lib/kommuneRoles'

function LoginPageContent() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [bankIdRedirecting, setBankIdRedirecting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user || cancelled) return
      const raw = redirectTo
      const safeRedirect =
        typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : null
      if (safeRedirect && safeRedirect !== '/') {
        router.replace(safeRedirect)
        return
      }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
      if (cancelled) return
      const r = profile?.role ?? session.user.user_metadata?.role
      const home = isKommuneStaffRole(r) ? '/nav/database' : '/homeowner/manage'
      router.replace(home)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [router, redirectTo])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
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
        })
        if (error) throw error
        setMessage({ type: 'success', text: t('checkEmail') })
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        if (redirectTo === '/' || !redirectTo) {
          const { data: { user } } = await supabase.auth.getUser()
          const { data: profile } = user ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle() : { data: null }
          const r = profile?.role ?? user?.user_metadata?.role
          router.push(isKommuneStaffRole(r) ? '/nav/database' : '/homeowner/manage')
        } else {
          router.push(redirectTo)
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
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
    const url = `https://ayddwbmkclujefnhsaqv.supabase.co/functions/v1/auth-signicat?return_to=${returnTo}`
    window.location.assign(url)
  }

  return (
    <main className="login-page" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: 'var(--space-6)',
      paddingLeft: 'max(var(--space-6), env(safe-area-inset-left))',
      paddingRight: 'max(var(--space-6), env(safe-area-inset-right))',
      background: 'var(--bg-app)'
    }}>
      <div className="card login-card" style={{ 
        width: '100%', 
        maxWidth: '420px', 
        padding: 'var(--space-8)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'inline-block', marginBottom: 'var(--space-5)' }}>
            <Logo />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--text-main)' }}>
            {isSignUp ? t('createAccount') : t('welcomeBack')}
          </h1>
          <p style={{ color: 'var(--text-body)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            {isSignUp 
              ? t('createAccountDesc') 
              : t('loginDesc')}
          </p>
        </div>

        {message && (
          <div style={{ 
            padding: 'var(--space-4)', 
            borderRadius: '12px', 
            marginBottom: 'var(--space-6)',
            background: message.type === 'success' ? 'rgba(45, 212, 191, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? 'var(--color-teal)' : '#ef4444'}`,
            color: message.type === 'success' ? 'var(--color-teal)' : '#ef4444',
            fontSize: '0.9rem'
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'grid', gap: 'var(--space-5)' }}>
          {isSignUp && (
            <>
              <div>
                <label className="label login-label">{t('fullName')}</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    className="input login-input" 
                    placeholder={t('loginPlaceholderFullName')}
                    required={isSignUp}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ paddingLeft: '2.75rem', marginBottom: 0 }}
                  />
                  <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>
              <div>
                <label className="label login-label">{t('phone')}</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="tel" 
                    className="input login-input" 
                    placeholder={t('loginPlaceholderPhone')}
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    style={{ paddingLeft: '2.75rem', marginBottom: 0 }}
                  />
                  <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>
            </>
          )}
          <div>
            <label className="label login-label">{t('email')}</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email" 
                className="input login-input" 
                placeholder={t('loginPlaceholderEmail')}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.75rem', marginBottom: 0 }}
              />
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div>
            <label className="label login-label">{t('password')}</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="password" 
                className="input login-input" 
                placeholder={t('loginPasswordMask')}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.75rem', marginBottom: 0 }}
              />
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <button 
            type="submit" 
            className="button" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: 'var(--space-4)', 
              marginTop: 'var(--space-2)',
              fontSize: '1.05rem',
              fontWeight: 600
            }}
          >
            {loading ? (isSignUp ? <UserPlus size={20} style={{ opacity: 0.8 }} /> : <LogIn size={20} style={{ opacity: 0.8 }} />) : (isSignUp ? <UserPlus size={20} /> : <LogIn size={20} />)}
            {loading ? t('loadingPleaseWait') : (isSignUp ? t('createAccount') : t('logIn'))}
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center', fontSize: '0.95rem' }}>
          <p style={{ color: 'var(--text-body)' }}>
            {isSignUp ? t('alreadyHaveAccount') : t('noAccount')}
            {' '}
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
                textUnderlineOffset: 2
              }}
            >
              {isSignUp ? t('loginHere') : t('signUpHere')}
            </button>
          </p>
        </div>

        {!isSignUp && (
          <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
            <Link href="/" style={{ fontSize: '0.9rem', color: 'var(--color-accent)' }}>
              {t('forgotPassword')}
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> }

export default function LoginPage(props: PageProps) {
  // Next.js 16: searchParams is a Promise; unwrap to avoid sync-dynamic-apis error
  use(props.searchParams ?? Promise.resolve({}))
  return (
    <Suspense fallback={<div className="login-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="card" style={{ padding: 'var(--space-10)', minWidth: '360px' }} /></div>}>
      <LoginPageContent />
    </Suspense>
  )
}

