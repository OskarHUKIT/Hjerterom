'use client'

import { useState, useEffect } from 'react'
import { X, Smartphone, Share, Plus } from 'lucide-react'

const STORAGE_KEY = 'boly-pwa-prompt-dismissed'

function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(ua)
}

function isRunningAsPWA(): boolean {
  if (typeof window === 'undefined') return true
  // Standalone: opened from home screen (PWA)
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  // iOS Safari when added to home screen
  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return true
  // Some Android standalone
  if ((window as any).matchMedia('(display-mode: fullscreen)').matches) return true
  return false
}

export default function PWAInstallPrompt() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)

  useEffect(() => {
    if (!isMobileUserAgent() || isRunningAsPWA()) return
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return
    } catch {
      return
    }
    const ua = navigator.userAgent || ''
    setIsIOS(/iPhone|iPad|iPod/i.test(ua))
    setIsAndroid(/Android/i.test(ua))
    // Small delay so the page loads first
    const t = setTimeout(() => setShow(true), 1500)
    return () => clearTimeout(t)
  }, [])

  const dismiss = (remember: boolean) => {
    setShow(false)
    try {
      if (remember) localStorage.setItem(STORAGE_KEY, '1')
    } catch {}
  }

  if (!show) return null

  return (
    <div
      role="dialog"
      aria-labelledby="pwa-prompt-title"
      className="pwa-prompt-overlay"
      onClick={() => dismiss(false)}
    >
      <div
        className="pwa-prompt-card"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => dismiss(false)}
          aria-label="Lukk"
          style={{
            position: 'absolute',
            top: 'var(--space-3)',
            right: 'var(--space-3)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: 'var(--space-1)',
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-royal-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Smartphone size={24} />
          </div>
          <h2 id="pwa-prompt-title" style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
            Legg Bo.ly på hjemskjermen
          </h2>
        </div>

        <p style={{ margin: '0 0 var(--space-4)', fontSize: '0.95rem', color: 'var(--text-body)', lineHeight: 1.5 }}>
          For raskest tilgang og bedre opplevelse kan du legge appen på hjemskjermen som en egen app.
        </p>

        {isIOS && (
          <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <p style={{ margin: '0 0 var(--space-2)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Share size={18} /> iPhone / iPad
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-body)' }}>
              Trykk på <strong>Del</strong>-knappen (firkant med pil oppover) nederst i Safari, og velg <strong>«Legg til på Hjem-skjerm»</strong>.
            </p>
          </div>
        )}

        {isAndroid && (
          <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <p style={{ margin: '0 0 var(--space-2)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} /> Android
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-body)' }}>
              Åpne menyen (tre prikker) øverst i Chrome og velg <strong>«Installer app»</strong> eller <strong>«Legg til på hjemskjermen»</strong>.
            </p>
          </div>
        )}

        {!isIOS && !isAndroid && (
          <p style={{ margin: '0 0 var(--space-4)', fontSize: '0.85rem', color: 'var(--text-body)' }}>
            I nettleserens meny: Finn «Legg til på hjemskjermen» eller «Installer app».
          </p>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => dismiss(true)}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              fontSize: '0.9rem',
              background: 'var(--bg-app)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-body)',
              cursor: 'pointer',
            }}
          >
            Ikke vis igjen
          </button>
          <button
            type="button"
            onClick={() => dismiss(false)}
            className="button"
            style={{ padding: 'var(--space-2) var(--space-4)', fontSize: '0.9rem' }}
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  )
}
