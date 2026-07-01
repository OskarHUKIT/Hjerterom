'use client'

import BottomSheet from '@/app/components/BottomSheet'
import { Button } from '@/app/components/ui/Button'
import type { TranslationKey } from '@/lib/translations'

export type NavDatabaseTimelineColorHelpProps = {
  open: boolean
  isMobile: boolean
  onClose: () => void
  t: (key: TranslationKey) => string
}

function ColorLegendList({ t }: { t: (key: TranslationKey) => string }) {
  const items = [
    { bg: 'var(--color-teal)', key: 'timelineColorHelpTeal' as const },
    { bg: 'var(--color-sky-blue)', key: 'timelineColorHelpBlue' as const },
    { bg: '#ef4444', key: 'timelineColorHelpRed' as const },
    { bg: '#991b1b', key: 'timelineColorHelpConflict' as const },
  ]
  return (
    <ul
      style={{
        margin: 0,
        paddingLeft: '1.1rem',
        display: 'grid',
        gap: 'var(--space-3)',
        fontSize: '0.9rem',
        lineHeight: 1.45,
      }}
    >
      {items.map((item) => (
        <li
          key={item.key}
          style={{
            listStyle: 'none',
            marginLeft: '-1.1rem',
            paddingLeft: 0,
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              background: item.bg,
              borderRadius: 3,
              flexShrink: 0,
              marginTop: 3,
            }}
          />
          <span>{t(item.key)}</span>
        </li>
      ))}
    </ul>
  )
}

export default function NavDatabaseTimelineColorHelp({
  open,
  isMobile,
  onClose,
  t,
}: NavDatabaseTimelineColorHelpProps) {
  if (!open) return null

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        title={t('timelineColorHelpTitle')}
        titleId="timeline-color-help-title"
        closeLabel={t('close')}
        onClose={onClose}
        zIndex={10050}
      >
        <p
          style={{
            margin: '0 0 var(--space-4)',
            fontSize: '0.95rem',
            opacity: 0.9,
            lineHeight: 1.5,
          }}
        >
          {t('timelineColorHelpIntro')}
        </p>
        <ColorLegendList t={t} />
      </BottomSheet>
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="timeline-color-help-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10050,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 460,
          width: '100%',
          padding: 'var(--space-6)',
          textAlign: 'left',
          boxShadow: 'var(--shadow-lg, 0 12px 40px rgba(0,0,0,0.35))',
        }}
      >
        <h2 id="timeline-color-help-title" style={{ margin: '0 0 var(--space-3)', fontSize: '1.2rem' }}>
          {t('timelineColorHelpTitle')}
        </h2>
        <p
          style={{
            margin: '0 0 var(--space-4)',
            fontSize: '0.95rem',
            opacity: 0.9,
            lineHeight: 1.5,
          }}
        >
          {t('timelineColorHelpIntro')}
        </p>
        <ColorLegendList t={t} />
        <Button type="button" variant="primary" onClick={onClose} style={{ marginTop: 'var(--space-6)', width: '100%' }}>
          {t('close')}
        </Button>
      </div>
    </div>
  )
}
