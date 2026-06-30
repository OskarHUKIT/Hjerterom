'use client'

import { Construction } from 'lucide-react'

type ComingSoonPlaceholderProps = {
  title: string
  description: string
  /** e.g. "Vipps", "Kart" */
  badge?: string
}

export default function ComingSoonPlaceholder({
  title,
  description,
  badge,
}: ComingSoonPlaceholderProps) {
  return (
    <div
      className="card"
      style={{
        padding: 'var(--space-6)',
        borderStyle: 'dashed',
        borderColor: 'var(--border-medium)',
        background: 'rgba(255,255,255,0.03)',
        textAlign: 'center',
      }}
      role="status"
    >
      <Construction
        size={28}
        aria-hidden
        style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-3)' }}
      />
      {badge ? (
        <span
          style={{
            display: 'inline-block',
            marginBottom: 'var(--space-2)',
            padding: '4px 10px',
            borderRadius: 999,
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(59, 130, 246, 0.12)',
            color: 'var(--color-accent)',
          }}
        >
          {badge}
        </span>
      ) : null}
      <h3 style={{ margin: '0 0 var(--space-2)', fontSize: '1.05rem', color: 'var(--text-main)' }}>
        {title}
      </h3>
      <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--text-muted)' }}>
        {description}
      </p>
    </div>
  )
}
