'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck, UserPlus, LogIn } from 'lucide-react'
import Logo from '../components/Logo'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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
          },
        })
        if (error) throw error
        setMessage({ type: 'success', text: 'Sjekk e-posten din for bekreftelseslenke!' })
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        window.location.href = '/'
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleBankIDLogin = async () => {
    setLoading(true)
    // Vi sender nå brukeren direkte til vår nye Edge Function "bro"
    window.location.href = 'https://ayddwbmkclujefnhsaqv.supabase.co/functions/v1/auth-signicat'
  }

  return (
    <main style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: 'var(--space-4)'
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
            {isSignUp ? 'Opprett konto' : 'Velkommen tilbake'}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {isSignUp 
              ? 'Bli en del av Bo.ly og bidra til boligformidling.' 
              : 'Logg inn for å administrere dine boliger.'}
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
          <div>
            <label className="label">E-post</label>
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
            <label className="label">Passord</label>
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
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isSignUp ? <UserPlus size={20} /> : <LogIn size={20} />)}
            {loading ? 'Vennligst vent...' : (isSignUp ? 'Opprett konto' : 'Logg inn')}
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
            }}>eller</span>
          </div>

          <button 
            onClick={handleBankIDLogin}
            disabled={loading}
            className="button"
            style={{ 
              width: '100%', 
              padding: 'var(--space-3)', 
              background: 'var(--color-royal-blue)',
              border: '1px solid var(--border-subtle)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <ShieldCheck size={18} /> Logg inn med BankID
          </button>
        </div>

        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center', fontSize: '0.95rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            {isSignUp ? 'Har du allerede en konto?' : 'Har du ikke konto?'}
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
              {isSignUp ? 'Logg inn her' : 'Registrer deg her'}
            </button>
          </p>
        </div>

        {!isSignUp && (
          <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
            <Link href="/" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Glemt passordet ditt?
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}

