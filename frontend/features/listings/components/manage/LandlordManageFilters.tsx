'use client'

import { type Ref } from 'react'
import { useLanguage } from '@/context/LanguageContext'

export type ManageListingFilter =
  | 'Alle'
  | 'Tilgjengelig'
  | 'Utilgjengelig'
  | 'Formidla'
  | 'Ikke markert'

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

  const filterLabel = (f: ManageListingFilter) => {
    if (f === 'Alle') return t('all')
    if (f === 'Formidla') return t('formidlet')
    if (f === 'Ikke markert') return t('availabilityUnmarked')
    if (f === 'Tilgjengelig') return t('available')
    return t('unavailable')
  }

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
          {(
            ['Alle', 'Tilgjengelig', 'Ikke markert', 'Utilgjengelig', 'Formidla'] as const
          ).map((f) => (
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
              {filterLabel(f)}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>
          {t('showing')} {filteredCount} {t('propertiesPlural')}
        </div>
      </div>

      {filter !== 'Alle' && (
        <p
          style={{
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            marginTop: '-0.5rem',
            marginBottom: 'var(--space-4)',
          }}
        >
          {t('manageFilterActiveHint')}
        </p>
      )}
    </>
  )
}
