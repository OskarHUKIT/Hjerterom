'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Info, Shield, FileText } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'

export default function Footer() {
  const { t } = useLanguage()
  const { theme } = useTheme()
  const [showComingSoon, setShowComingSoon] = useState(false)
  const narvikLogoSrc = theme === 'light' ? '/Logonavnarvik.png' : '/Logonavnarvikhvit.png'

  const handleComingSoon = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowComingSoon(true)
    setTimeout(() => setShowComingSoon(false), 2500)
  }

  return (
    <footer className="footer">
      <div className="container" style={{ padding: 'var(--space-8) var(--space-4)' }}>
        <div className="footer-grid">
          {/* Logo Section: Utviklet av + Samarbeid med */}
          <div className="footer-section">
            <div className="footer-logos-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-10)', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: 'var(--space-2)' }}>{t('developedBy')}</h3>
                <div className="footer-logo-container">
                  <img 
                    src="/logo-gamechanging.png" 
                    alt="Game Changing" 
                    style={{ height: '100px', width: 'auto', objectFit: 'contain' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.innerText = 'Game Changing';
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: 'var(--space-2)' }}>{t('inCollaborationWith')}</h3>
                <div className="footer-logo-container" style={{ display: 'flex', alignItems: 'center' }}>
                  <img 
                    src={narvikLogoSrc} 
                    alt="Narvik kommune" 
                    style={{ height: '140px', width: 'auto', objectFit: 'contain' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      if (target.parentElement) target.parentElement.innerHTML = '<span style="font-weight:600;color:var(--text-main)">Narvik</span>';
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="footer-section">
            <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: 'var(--space-4)' }}>{t('contactUs')}</h3>
            <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
              <a href="mailto:info@gamechanging.no" className="footer-link">
                <Mail size={16} /> info@gamechanging.no
              </a>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('contactDesc')}
              </p>
            </div>
          </div>

          {/* Legal Section */}
          <div className="footer-section">
            <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: 'var(--space-4)' }}>{t('info')}</h3>
            <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
              <button type="button" onClick={handleComingSoon} className="footer-link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <FileText size={16} /> {t('termsOfUse')}
              </button>
              <button type="button" onClick={handleComingSoon} className="footer-link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Shield size={16} /> {t('privacy')}
              </button>
              <button type="button" onClick={handleComingSoon} className="footer-link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Info size={16} /> {t('aboutBoly')}
              </button>
            </div>
            {showComingSoon && (
              <div
                role="alert"
                style={{
                  position: 'fixed',
                  bottom: 'var(--space-6)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: 'var(--space-3) var(--space-6)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-xl)',
                  zIndex: 9999,
                  fontSize: '0.95rem',
                  fontWeight: 500,
                }}
              >
                {t('comingSoon')}
              </div>
            )}
          </div>
        </div>

        <div style={{ 
          marginTop: 'var(--space-8)', 
          paddingTop: 'var(--space-4)', 
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.85rem'
        }}>
          {t('copyright')}
        </div>
      </div>
    </footer>
  )
}
