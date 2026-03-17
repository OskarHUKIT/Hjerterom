'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { LogIn, Presentation, ArrowRight, X } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from './lib/supabase'

const THEME_STORAGE_KEY = 'boly-theme'

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> }

export default function Home(props: PageProps) {
  use(props.searchParams ?? Promise.resolve({}))
  const { t } = useLanguage()
  const { setTheme } = useTheme()
  const [isKommune, setIsKommune] = useState<boolean | null>(null)
  const [showDemoPopup, setShowDemoPopup] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsKommune(null)
        return
      }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      setIsKommune(profile?.role === 'kommune_ansatt')
    }
    check()
  }, [])

  useEffect(() => {
    if (isKommune === true && typeof window !== 'undefined' && !localStorage.getItem(THEME_STORAGE_KEY)) {
      setTheme('light')
    }
  }, [isKommune, setTheme])

  return (
    <main className="container">
      <div className="hero-section" style={{ 
        padding: 'var(--space-10) 0', 
        maxWidth: '800px',
        textAlign: 'left',
        paddingLeft: 'max(0px, env(safe-area-inset-left))',
        paddingRight: 'max(0px, env(safe-area-inset-right))'
      }}>
        <h1 className="animate-delay-1 hero-title" style={{ 
          fontSize: 'clamp(2.5rem, 6vw, 3.75rem)', 
          marginBottom: 'var(--space-4)'
        }}>
          {t('heroTitle')}
        </h1>
        <p className="animate-delay-2" style={{ 
          fontSize: '1.25rem', 
          marginBottom: 'var(--space-8)', 
          maxWidth: '640px', 
          color: 'var(--text-body)'
        }}>
          {t('heroDesc')}
        </p>
      </div>

      <div className="grid-portal animate-delay-3">
        {/* Logg inn */}
        <div className="card portal-card portal-card-align-buttons" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', backdropFilter: 'blur(8px)' }}>
          <div style={{ 
            width: '56px', 
            height: '56px', 
            borderRadius: '12px', 
            background: 'rgba(45, 212, 191, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-2)',
            color: 'var(--color-teal)'
          }}>
            <LogIn size={28} />
          </div>
          <div className="portal-card-body">
            <h2>Logg inn</h2>
            <div className="portal-card-cta">
              <Link href="/login" className="button button-accent" style={{ width: '100%', padding: 'var(--space-4)' }}>
                Logg inn <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>

        {/* Be om demo */}
        <div className="card portal-card portal-card-align-buttons" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', backdropFilter: 'blur(8px)' }}>
          <div style={{ 
            width: '56px', 
            height: '56px', 
            borderRadius: '12px', 
            background: 'rgba(59, 130, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-2)',
            color: 'var(--color-royal-blue)'
          }}>
            <Presentation size={28} />
          </div>
          <div className="portal-card-body">
            <h2>Be om demo</h2>
            <div className="portal-card-cta">
              <button
                type="button"
                onClick={() => setShowDemoPopup(true)}
                className="button"
                style={{ width: '100%', padding: 'var(--space-4)' }}
              >
                Be om demo <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Be om demo – popup med kontaktinfo */}
      {showDemoPopup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-popup-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
          }}
          onClick={() => setShowDemoPopup(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: 400,
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-lg, 0 10px 40px rgba(0,0,0,0.2))',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 id="demo-popup-title" style={{ margin: 0, fontSize: '1.25rem' }}>Be om demo</h3>
              <button
                type="button"
                onClick={() => setShowDemoPopup(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', display: 'flex' }}
                aria-label="Lukk"
              >
                <X size={20} />
              </button>
            </div>
            <p style={{ margin: '0 0 var(--space-4)', fontSize: '0.9rem', color: 'var(--text-body)' }}>
              Kontakt oss for å be om en demo:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: '0.95rem' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Tina Olsen, NAV Narvik</div>
                <a href="mailto:Tina.Olsen@nav.no" style={{ color: 'var(--color-accent)' }}>Tina.Olsen@nav.no</a>
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Lars Utstøl</div>
                <a href="mailto:lars@gamechanging.no" style={{ color: 'var(--color-accent)' }}>lars@gamechanging.no</a>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
