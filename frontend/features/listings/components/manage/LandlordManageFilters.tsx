'use client'

import { type Ref } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import '@/features/listings/landlord-manage.css'

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
      <div ref={filtersRowRef} className="hm-filters-row hm-filters-panel">
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
              className="hm-filter-chip"
            >
              {filterLabel(f)}
            </button>
          ))}
        </div>
        <div className="hm-filter-count">
          {t('showing')} {filteredCount} {t('propertiesPlural')}
        </div>
      </div>

      {filter !== 'Alle' && <p className="hm-filter-hint">{t('manageFilterActiveHint')}</p>}
    </>
  )
}
