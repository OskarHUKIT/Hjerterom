'use client'

import type { ReactNode } from 'react'

type BottomSheetProps = {
  open: boolean
  title: string
  titleId?: string
  closeLabel: string
  onClose: () => void
  children: ReactNode
  /** Lavere z-index når noe annet (f.eks. modal) skal over */
  zIndex?: number
}

export default function BottomSheet({
  open,
  title,
  titleId = 'bottom-sheet-title',
  closeLabel,
  onClose,
  children,
  zIndex = 1100,
}: BottomSheetProps) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: 'min(88dvh, 640px)',
          width: '100%',
          borderRadius: '16px 16px 0 0',
          margin: 0,
          padding: 'var(--space-4) var(--space-4) max(var(--space-6), env(safe-area-inset-bottom))',
          boxSizing: 'border-box',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          border: '1px solid var(--border-subtle)',
          borderBottom: 'none',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <h2
            id={titleId}
            style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--text-main)',
            }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="button"
            style={{
              padding: 'var(--space-2) var(--space-3)',
              fontSize: '0.85rem',
              background: 'var(--bg-app)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {closeLabel}
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
