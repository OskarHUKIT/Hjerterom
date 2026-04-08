'use client'

import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

type Props = {
  minHeight?: number
  className?: string
}

/** Synlig lastskelett (ikke tom card) — brukes der vi tidligere viste bare en tom .card. */
export default function LoadingPlaceholder({ minHeight = 120, className }: Props) {
  const { t } = useLanguage()
  return (
    <div
      className={className ? `card ${className}` : 'card'}
      style={{
        padding: 'var(--space-10)',
        minHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        color: 'var(--text-muted)',
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 size={24} className="boly-spin" aria-hidden />
      <span>{t('loadingPleaseWait')}</span>
    </div>
  )
}
