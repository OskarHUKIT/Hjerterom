'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type LandlordOnboardingModalProps = {
  open: boolean
  title: string
  titleId: string
  onDismiss: () => void
  ctaLabel: string
  icon: LucideIcon
  /** Bak ikonet (teal / blå / himmel) */
  iconAccent?: 'teal' | 'blue' | 'sky'
  children: ReactNode
}

const accentBg: Record<NonNullable<LandlordOnboardingModalProps['iconAccent']>, string> = {
  teal: 'rgba(45, 212, 191, 0.15)',
  blue: 'rgba(59, 130, 246, 0.12)',
  sky: 'rgba(56, 189, 248, 0.14)',
}

const accentColor: Record<NonNullable<LandlordOnboardingModalProps['iconAccent']>, string> = {
  teal: 'var(--color-teal)',
  blue: 'var(--color-accent)',
  sky: 'var(--color-sky-blue)',
}

export default function LandlordOnboardingModal({
  open,
  title,
  titleId,
  onDismiss,
  ctaLabel,
  icon: Icon,
  iconAccent = 'teal',
  children,
}: LandlordOnboardingModalProps) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10052,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding:
          'max(var(--space-4), env(safe-area-inset-top)) max(var(--space-4), env(safe-area-inset-right)) max(var(--space-6), env(safe-area-inset-bottom)) max(var(--space-4), env(safe-area-inset-left))',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 520,
          width: '100%',
          padding: 'var(--space-8)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
          maxHeight: 'min(92dvh, 720px)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-4)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: accentBg[iconAccent],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentColor[iconAccent],
              flexShrink: 0,
            }}
          >
            <Icon size={26} />
          </div>
          <h1
            id={titleId}
            style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-main)', lineHeight: 1.25 }}
          >
            {title}
          </h1>
        </div>
        <div
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            marginBottom: 'var(--space-3)',
          }}
        >
          {children}
        </div>
        <button
          type="button"
          className="button"
          style={{
            width: '100%',
            padding: 'var(--space-4)',
            fontSize: '1.05rem',
            flexShrink: 0,
          }}
          onClick={onDismiss}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  )
}
