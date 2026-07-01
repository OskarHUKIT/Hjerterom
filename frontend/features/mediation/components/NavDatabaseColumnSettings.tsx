'use client'

import BottomSheet from '@/app/components/BottomSheet'
import { Button } from '@/app/components/ui/Button'
import type { NavDbColumn } from '@/features/mediation/lib/navDatabaseColumns'
import type { TranslationKey } from '@/lib/translations'

export type NavDatabaseColumnSettingsProps = {
  open: boolean
  isMobile: boolean
  allColumns: NavDbColumn[]
  visibleColumns: string[]
  onToggleColumn: (id: string) => void
  onClose: () => void
  t: (key: TranslationKey) => string
}

function ColumnCheckboxGrid({
  columns,
  visibleColumns,
  onToggleColumn,
}: {
  columns: NavDbColumn[]
  visibleColumns: string[]
  onToggleColumn: (id: string) => void
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 'var(--space-3)',
      }}
    >
      {columns.map((col) => (
        <label
          key={col.id}
          className="card-settings-option"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            padding: 'var(--space-2)',
            borderRadius: '8px',
          }}
        >
          <input
            type="checkbox"
            checked={visibleColumns.includes(col.id)}
            onChange={() => onToggleColumn(col.id)}
            style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)' }}
          />
          <span style={{ fontSize: 'clamp(0.85rem, 1vw + 0.65rem, 0.9rem)', color: 'var(--text-main)' }}>
            {col.label}
          </span>
        </label>
      ))}
    </div>
  )
}

export default function NavDatabaseColumnSettings({
  open,
  isMobile,
  allColumns,
  visibleColumns,
  onToggleColumn,
  onClose,
  t,
}: NavDatabaseColumnSettingsProps) {
  if (!open) return null

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        title={t('dbColumnSettingsTitle')}
        titleId="db-column-settings"
        closeLabel={t('dbDone')}
        onClose={onClose}
        zIndex={2100}
      >
        <ColumnCheckboxGrid
          columns={allColumns}
          visibleColumns={visibleColumns}
          onToggleColumn={onToggleColumn}
        />
      </BottomSheet>
    )
  }

  return (
    <div className="card card-settings-panel" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
      <h3
        style={{
          marginBottom: 'var(--space-4)',
          fontSize: 'clamp(1rem, 1.1vw + 0.8rem, 1.1rem)',
          color: 'var(--text-main)',
        }}
      >
        {t('dbColumnSettingsTitle')}
      </h3>
      <ColumnCheckboxGrid
        columns={allColumns}
        visibleColumns={visibleColumns}
        onToggleColumn={onToggleColumn}
      />
      <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="button" variant="primary" onClick={onClose} style={{ padding: '8px 24px' }}>
          {t('dbDone')}
        </Button>
      </div>
    </div>
  )
}
