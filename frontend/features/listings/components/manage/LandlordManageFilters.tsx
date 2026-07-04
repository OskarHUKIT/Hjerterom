'use client'

import { useMemo, type Ref } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import SelectorChips from '@/app/components/design-system/SelectorChips'
import '@/features/listings/landlord-manage.css'

export type ManageListingFilter =
  | 'all'
  | 'availableToday'
  | 'mediated'
  | 'tourismActive'
  | 'eventActive'

type LandlordManageFiltersProps = {
  filter: ManageListingFilter
  onFilterChange: (filter: ManageListingFilter) => void
  filteredCount: number
  filtersRowRef: Ref<HTMLDivElement>
  onScrollFiltersIntoViewMobile: () => void
  centralEvents: boolean
  tourism: boolean
}

export default function LandlordManageFilters({
  filter,
  onFilterChange,
  filteredCount,
  filtersRowRef,
  onScrollFiltersIntoViewMobile,
  centralEvents,
  tourism,
}: LandlordManageFiltersProps) {
  const { t } = useLanguage()

  const options = useMemo(() => {
    const chips: { id: ManageListingFilter; labelKey: Parameters<typeof t>[0] }[] = [
      { id: 'all', labelKey: 'manageFilterAll' },
      { id: 'availableToday', labelKey: 'manageFilterAvailableToday' },
      { id: 'mediated', labelKey: 'manageFilterMediated' },
    ]
    if (tourism) {
      chips.push({ id: 'tourismActive', labelKey: 'manageFilterTourismActive' })
    }
    if (centralEvents) {
      chips.push({ id: 'eventActive', labelKey: 'manageFilterEventActive' })
    }
    return chips.map(({ id, labelKey }) => ({ id, label: t(labelKey) }))
  }, [t, tourism, centralEvents])

  return (
    <>
      <div ref={filtersRowRef} className="hm-filters-row hm-filters-panel">
        <SelectorChips
          value={filter}
          options={options}
          onChange={(next) => {
            onFilterChange(next)
            onScrollFiltersIntoViewMobile()
          }}
          ariaLabel={t('manageFilterGroupAria')}
          className="hm-filters-chips"
        />
        <div className="hm-filter-count">
          {t('showing')} {filteredCount} {t('propertiesPlural')}
        </div>
      </div>

      {filter !== 'all' ? <p className="hm-filter-hint">{t('manageFilterActiveHint')}</p> : null}
    </>
  )
}
