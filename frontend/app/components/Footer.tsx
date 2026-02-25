'use client'

import Link from 'next/link'
import { Mail, Info, Shield, FileText } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

export default function Footer() {
  const { t } = useLanguage()
  return (
    <footer className="footer">
      <div className="container" style={{ padding: 'var(--space-8) var(--space-4)' }}>
        <div className="footer-grid">
          {/* Logo Section */}
          <div className="footer-section">
            <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: 'var(--space-4)' }}>{t('developedBy')}</h3>
            <div className="footer-logos-row" style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'center' }}>
              <div className="footer-logo-container">
                <img 
                  src="/logo-gamechanging.png" 
                  alt="Game Changing" 
                  style={{ height: '120px', width: 'auto', objectFit: 'contain' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerText = 'Game Changing';
                  }}
                />
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
              <Link href="/terms" className="footer-link">
                <FileText size={16} /> {t('termsOfUse')}
              </Link>
              <Link href="/privacy" className="footer-link">
                <Shield size={16} /> {t('privacy')}
              </Link>
              <Link href="/about" className="footer-link">
                <Info size={16} /> {t('aboutBoly')}
              </Link>
            </div>
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
