'use client'

import { type Ref } from 'react'
import { useLanguage } from '@/context/LanguageContext'

export type ManageListingFilter = 'Alle' | 'Tilgjengelig' | 'Utilgjengelig' | 'Formidla'

type LandlordManageFiltersProps = {
  filter: ManageListingFilter
  onFilterChange: (filter: ManageListingFilter) => void
  filteredCount: number
  filtersRowRef: Ref<HTMLDivElement>
  onScrollFiltersIntoViewMobile: () => void
}

export default function LandlordManageFilters({
  filter,
  onFilterChange,
  filteredCount,
  filtersRowRef,
  onScrollFiltersIntoViewMobile,
}: LandlordManageFiltersProps) {
  const { t } = useLanguage()

  return (
    <>
      <div
        ref={filtersRowRef}
        className="hm-filters-row hm-filters-panel"
        style={{
          marginBottom: 'var(--space-4)',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}
      >
        <div className="hm-filters-buttons">
          {(['Alle', 'Tilgjengelig', 'Utilgjengelig', 'Formidla'] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => {
                onFilterChange(f)
                onScrollFiltersIntoViewMobile()
              }}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: filter === f ? 600 : 500,
                cursor: 'pointer',
                background: filter === f ? 'var(--color-royal-blue)' : 'transparent',
                border: filter === f ? '1px solid var(--color-royal-blue)' : '1px solid var(--border-medium)',
                color: filter === f ? 'white' : 'var(--text-main)',
                transition: 'all 0.15s ease',
                boxShadow: filter === f ? '0 1px 4px rgba(59, 130, 246, 0.3)' : 'none',
              }}
            >
              {f === 'Alle'
                ? t('all')
                : f === 'Formidla'
                  ? t('formidlet')
                  : f === 'Tilgjengelig'
                    ? t('available')
                    : t('unavailable')}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>
          {t('showing')} {filteredCount} {t('propertiesPlural')}
        </div>
      </div>

      {filter !== 'Alle' && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm"
          style={{
            margin: '0 0 var(--space-4)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 10,
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.22)',
            color: 'var(--text-main)',
            lineHeight: 1.5,
          }}
        >
          {t('manageFilterActiveHint')}
        </p>
      )}
    </>
  )
}
