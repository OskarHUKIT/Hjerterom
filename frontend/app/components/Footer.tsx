'use client'

import Link from 'next/link'
import { Mail, Info, Shield, FileText } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container" style={{ padding: 'var(--space-8) var(--space-4)' }}>
        <div className="footer-grid">
          {/* Logo Section */}
          <div className="footer-section">
            <h3 style={{ fontSize: '1rem', color: 'white', marginBottom: 'var(--space-4)' }}>Utviklet av</h3>
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
            <h3 style={{ fontSize: '1rem', color: 'white', marginBottom: 'var(--space-4)' }}>Kontakt oss</h3>
            <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
              <a href="mailto:boly@gamechanging.no" className="footer-link">
                <Mail size={16} /> boly@gamechanging.no
              </a>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Ta kontakt ved tekniske problemer eller forbedringsforslag.
              </p>
            </div>
          </div>

          {/* Legal Section */}
          <div className="footer-section">
            <h3 style={{ fontSize: '1rem', color: 'white', marginBottom: 'var(--space-4)' }}>Informasjon</h3>
            <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
              <Link href="/terms" className="footer-link">
                <FileText size={16} /> Vilkår for bruk
              </Link>
              <Link href="/privacy" className="footer-link">
                <Shield size={16} /> Personvern
              </Link>
              <Link href="/about" className="footer-link">
                <Info size={16} /> Om Boly
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
          © 2026 Utviklet av Game Changing AS. Alle rettigheter reservert.
        </div>
      </div>
    </footer>
  )
}
