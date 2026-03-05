'use client'

import { use, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { Mail, Lock, ShieldCheck, UserPlus, LogIn, User, Phone } from 'lucide-react'
import Logo from '../components/Logo'
import { useLanguage } from '../../context/LanguageContext'

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
        router.push(redirectTo)
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

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
      padding: 'var(--space-4)',
      paddingLeft: 'max(var(--space-4), env(safe-area-inset-left))',
      paddingRight: 'max(var(--space-4), env(safe-area-inset-right))'
    }}>
      <div className="card" style={{ 
        width: '100%', 
        maxWidth: '440px', 
        padding: 'var(--space-8)',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-medium)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'inline-block', marginBottom: 'var(--space-4)' }}>
            <Logo />
          </div>
          <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>
            {isSignUp ? t('createAccount') : t('welcomeBack')}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
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

        <form onSubmit={handleAuth} style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {isSignUp && (
            <>
              <div>
                <label className="label">{t('fullName')}</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="F.eks. Ola Nordmann"
                    required={isSignUp}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ paddingLeft: '2.75rem', marginBottom: 0 }}
                  />
                  <User size={18} style={{ position: 'absolute', left: '1rem', top: '14px', color: 'var(--text-muted)' }} />
                </div>
              </div>
              <div>
                <label className="label">{t('phone')}</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="tel" 
                    className="input" 
                    placeholder="F.eks. 123 45 678"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    style={{ paddingLeft: '2.75rem', marginBottom: 0 }}
                  />
                  <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '14px', color: 'var(--text-muted)' }} />
                </div>
              </div>
            </>
          )}
          <div>
            <label className="label">{t('email')}</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email" 
                className="input" 
                placeholder="din@epost.no"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.75rem', marginBottom: 0 }}
              />
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '14px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div>
            <label className="label">{t('password')}</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="password" 
                className="input" 
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.75rem', marginBottom: 0 }}
              />
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '14px', color: 'var(--text-muted)' }} />
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
              fontSize: '1.1rem'
            }}
          >
            {loading ? (isSignUp ? <UserPlus size={20} style={{ opacity: 0.6 }} /> : <LogIn size={20} style={{ opacity: 0.6 }} />) : (isSignUp ? <UserPlus size={20} /> : <LogIn size={20} />)}
            {loading ? t('loadingPleaseWait') : (isSignUp ? t('createAccount') : t('logIn'))}
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
          <div style={{ position: 'relative', margin: 'var(--space-6) 0' }}>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />
            <span style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              background: '#161d2b',
              padding: '0 10px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)'
            }}>{t('orDivider')}</span>
          </div>

          <button 
            onClick={handleBankIDLogin}
            disabled={bankIdRedirecting}
            type="button"
            className="button"
            style={{ 
              width: '100%', 
              padding: 'var(--space-3)', 
              background: 'var(--color-royal-blue)',
              border: '1px solid var(--border-subtle)',
              color: 'white',
              cursor: bankIdRedirecting ? 'wait' : 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <ShieldCheck size={18} /> {bankIdRedirecting ? t('redirectingToBankID') : (isSignUp ? t('signUpWithBankID') : t('loginWithBankID'))}
          </button>
        </div>

        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center', fontSize: '0.95rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            {isSignUp ? t('alreadyHaveAccount') : t('noAccount')}
            {' '}
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--color-sky-blue)', 
                fontWeight: 600, 
                cursor: 'pointer',
                padding: 0
              }}
            >
              {isSignUp ? t('loginHere') : t('signUpHere')}
            </button>
          </p>
        </div>

        {!isSignUp && (
          <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
            <Link href="/" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
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

