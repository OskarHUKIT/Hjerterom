'use client'

import Link from 'next/link'
import { Search, Home as HomeIcon, ShieldCheck, HelpCircle, ArrowRight } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export default function Home() {
  const { t } = useLanguage()
  return (
    <main className="container">
      <div style={{ 
        padding: 'var(--space-10) 0', 
        maxWidth: '800px',
        textAlign: 'left',
        paddingLeft: 'max(0px, env(safe-area-inset-left))',
        paddingRight: 'max(0px, env(safe-area-inset-right))'
      }}>
        <h1 className="animate-delay-1" style={{ 
          fontSize: 'clamp(2.5rem, 6vw, 3.75rem)', 
          marginBottom: 'var(--space-4)',
          textShadow: '0 4px 12px rgba(0,0,0,0.3)'
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
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)' }}>
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
          <div>
            <h2>{t('forMunicipality')}</h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              {t('searchDesc')}
            </p>
            <Link href="/nav/database" className="button button-accent" style={{ width: '100%', padding: 'var(--space-4)' }}>
              {t('openHousingBank')} <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        {/* Homeowner Portal */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)' }}>
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
          <div>
            <h2>{t('forHomeowners')}</h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              {t('manageDesc')}
            </p>
            <Link href="/homeowner/manage" className="button" style={{ width: '100%', padding: 'var(--space-4)' }}>
              {t('manageRental')} <ArrowRight size={18} />
            </Link>
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
