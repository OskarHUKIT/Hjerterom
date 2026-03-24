'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { X, Smartphone, Share, Plus } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { isMobileUserAgent } from '../lib/mobile'

export const PWA_PROMPT_DISMISSED_KEY = 'boly-pwa-prompt-dismissed'

function isRunningAsPWA(): boolean {
  if (typeof window === 'undefined') return true
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return true
  try {
    if (window.matchMedia('(display-mode: fullscreen)').matches) return true
  } catch {
    /* ignore */
  }
  return false
}

/** True når mobilnettleser, ikke allerede PWA, og bruker ikke har valgt «Ikke vis igjen». */
export function shouldShowPwaPrompt(): boolean {
  if (typeof window === 'undefined') return false
  if (!isMobileUserAgent()) return false
  if (isRunningAsPWA()) return false
  try {
    if (localStorage.getItem(PWA_PROMPT_DISMISSED_KEY) === '1') return false
  } catch {
    return false
  }
  return true
}

type PwaInstallPromptDialogProps = {
  open: boolean
  onDismiss: (remember: boolean) => void
  /** Høyere z-index når den skal over andre onboarding-modaler */
  overlayClassName?: string
}

/** Kontrollert variant – brukes bl.a. på Mine boliger før velkomst/oversikt. */
export function PwaInstallPromptDialog({ open, onDismiss, overlayClassName }: PwaInstallPromptDialogProps) {
  const { t } = useLanguage()
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)

  useEffect(() => {
    if (!open) return
    const ua = navigator.userAgent || ''
    setIsIOS(/iPhone|iPad|iPod/i.test(ua))
    setIsAndroid(/Android/i.test(ua))
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-labelledby="pwa-prompt-title"
      className={overlayClassName || 'pwa-prompt-overlay'}
      onClick={() => onDismiss(false)}
    >
      <div className="pwa-prompt-card" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onDismiss(false)}
          aria-label={t('pwaClose')}
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
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'var(--color-royal-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <Smartphone size={24} />
          </div>
          <h2 id="pwa-prompt-title" style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
            {t('pwaInstallTitle')}
          </h2>
        </div>

        <p style={{ margin: '0 0 var(--space-4)', fontSize: '0.95rem', color: 'var(--text-body)', lineHeight: 1.5 }}>{t('pwaInstallLead')}</p>

        {isIOS && (
          <div
            style={{
              marginBottom: 'var(--space-4)',
              padding: 'var(--space-3)',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.2)',
            }}
          >
            <p
              style={{
                margin: '0 0 var(--space-2)',
                fontWeight: 600,
                fontSize: '0.9rem',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Share size={18} /> {t('pwaInstallIOSLabel')}
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-body)' }}>{t('pwaInstallIOSBody')}</p>
          </div>
        )}

        {isAndroid && (
          <div
            style={{
              marginBottom: 'var(--space-4)',
              padding: 'var(--space-3)',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.2)',
            }}
          >
            <p
              style={{
                margin: '0 0 var(--space-2)',
                fontWeight: 600,
                fontSize: '0.9rem',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Plus size={18} /> {t('pwaInstallAndroidLabel')}
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-body)' }}>{t('pwaInstallAndroidBody')}</p>
          </div>
        )}

        {!isIOS && !isAndroid && (
          <p style={{ margin: '0 0 var(--space-4)', fontSize: '0.85rem', color: 'var(--text-body)' }}>{t('pwaInstallGeneric')}</p>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => onDismiss(true)}
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
            {t('pwaDontShowAgain')}
          </button>
          <button type="button" onClick={() => onDismiss(false)} className="button" style={{ padding: 'var(--space-2) var(--space-4)', fontSize: '0.9rem' }}>
            {t('pwaClose')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Global PWA-prompt i layout: mobil, ikke PWA, ikke avslått – vises tidlig. På /homeowner/manage håndteres egen kjede. */
export default function PWAInstallPrompt() {
  const pathname = usePathname()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (pathname?.startsWith('/homeowner/manage')) {
      setShow(false)
      return
    }
    if (!shouldShowPwaPrompt()) return
    const t = setTimeout(() => setShow(true), 0)
    return () => clearTimeout(t)
  }, [pathname])

  if (!show) return null

  return (
    <PwaInstallPromptDialog
      open={show}
      onDismiss={remember => {
        setShow(false)
        try {
          if (remember) localStorage.setItem(PWA_PROMPT_DISMISSED_KEY, '1')
        } catch {}
      }}
    />
  )
}
