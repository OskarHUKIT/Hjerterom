'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Home as HomeIcon, ShieldCheck, HelpCircle, ArrowRight, LogOut } from 'lucide-react'
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

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
        {/* Kommune Worker Portal */}
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
            <Search size={28} />
          </div>
          <div className="portal-card-body">
            <h2>{t('forMunicipality')}</h2>
            <p className="portal-card-desc" style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              {t('searchDesc')}
            </p>
            <div className="portal-card-cta">
              <Link href="/nav/database" className="button button-accent" style={{ width: '100%', padding: 'var(--space-4)' }}>
                {t('openHousingBank')} <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>

        {/* Homeowner Portal */}
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
            <HomeIcon size={28} />
          </div>
          <div className="portal-card-body">
            <h2>{t('forHomeowners')}</h2>
            <p className="portal-card-desc" style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              {t('manageDesc')}
            </p>
            <div className="portal-card-cta">
              {isKommune ? (
                <div style={{ 
                  padding: 'var(--space-4)', 
                  background: 'rgba(251, 191, 36, 0.12)', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)'
                }}>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', margin: 0 }}>
                    {t('loginWithOtherAccount')}
                  </p>
                  <button 
                    type="button"
                    onClick={handleLogout}
                    className="button button-secondary"
                    style={{ 
                      width: '100%', 
                      padding: 'var(--space-3)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: 'var(--space-2)', 
                      fontWeight: 600
                    }}
                  >
                    <LogOut size={18} /> {t('logOut')}
                  </button>
                </div>
              ) : (
                <Link href="/homeowner/manage" className="button" style={{ width: '100%', padding: 'var(--space-4)' }}>
                  {t('manageRental')} <ArrowRight size={18} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trust & Support Section */}
      <div className="animate-delay-3 trust-section" style={{ 
        marginTop: 'var(--space-10)', 
        padding: 'var(--space-8)', 
        background: 'rgba(15, 23, 42, 0.4)',
        borderRadius: '24px',
        color: 'var(--text-main)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 'var(--space-8)',
        border: '1px solid var(--border-subtle)'
      }}>
        <div>
          <div style={{ color: 'var(--color-sky-blue)', marginBottom: 'var(--space-3)' }}>
            <ShieldCheck size={36} />
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>{t('securityTitle')}</h3>
          <p style={{ color: 'var(--text-body)', fontSize: '1rem' }}>
            {t('securityDesc')}
          </p>
        </div>
        <div>
          <div style={{ color: 'var(--color-sky-blue)', marginBottom: 'var(--space-3)' }}>
            <HelpCircle size={36} />
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>{t('improvementTitle')}</h3>
          <p style={{ color: 'var(--text-body)', fontSize: '1rem' }}>
            {t('improvementDesc')}
          </p>
        </div>
      </div>
    </main>
  )
}
