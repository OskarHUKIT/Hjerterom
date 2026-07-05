'use client'

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { Search, ChevronDown, X, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react'
import BottomSheet from '@/app/components/BottomSheet'
import { useLanguage } from '@/context/LanguageContext'
import type { NavDatabaseFilters as NavDatabaseFiltersState } from '@/features/mediation/lib/navDatabaseFetch'
import type { NavDbViewMode } from '@/features/mediation/constants/navDatabase'
import type { PublishedEventOption } from '@/features/mediation/hooks/useNavDatabasePublishedEvents'

export const DEFAULT_NAV_DATABASE_FILTERS: NavDatabaseFiltersState = {
  city: 'Alle',
  type: 'Alle',
  minPrice: '',
  maxPrice: '',
  accessibility: [],
  minBedrooms: '',
  minSize: '',
  minOccupants: '',
  floor: 'Alle',
  furnishing: 'Alle',
}

export type NavDatabaseFiltersProps = {
  open: boolean
  isMobile: boolean
  viewMode: NavDbViewMode
  searchTerm: string
  onSearchTermChange: (value: string) => void
  filters: NavDatabaseFiltersState
  onFiltersChange: (filters: NavDatabaseFiltersState) => void
  mapStatusFilter: Array<'Tilgjengelig' | 'Utilgjengelig' | 'Formidlet' | 'Ikke markert'>
  onMapStatusFilterChange: Dispatch<
    SetStateAction<Array<'Tilgjengelig' | 'Utilgjengelig' | 'Formidlet' | 'Ikke markert'>>
  >
  eventFilterId: string
  onEventFilterIdChange: (value: string) => void
  publishedEvents: PublishedEventOption[]
  showCentralEvents: boolean
  onClose: () => void
  onReset: () => void
}

function activeFilterChips(
  filters: NavDatabaseFiltersState,
  searchTerm: string,
  eventFilterId: string,
  showCentralEvents: boolean,
  publishedEvents: PublishedEventOption[]
): { key: string; label: string }[] {
  const chips: { key: string; label: string }[] = []
  if (searchTerm.trim()) chips.push({ key: 'search', label: searchTerm.trim() })
  if (filters.city !== 'Alle') chips.push({ key: 'city', label: filters.city })
  if (filters.type !== 'Alle') chips.push({ key: 'type', label: filters.type })
  if (showCentralEvents && eventFilterId !== 'Alle') {
    const evName = publishedEvents.find((e) => e.id === eventFilterId)?.name ?? eventFilterId
    chips.push({ key: 'event', label: evName })
  }
  if (filters.minPrice) chips.push({ key: 'minPrice', label: `≥ ${filters.minPrice}` })
  if (filters.maxPrice) chips.push({ key: 'maxPrice', label: `≤ ${filters.maxPrice}` })
  if (filters.minBedrooms) chips.push({ key: 'minBedrooms', label: `${filters.minBedrooms}+ soverom` })
  if (filters.minSize) chips.push({ key: 'minSize', label: `≥ ${filters.minSize} m²` })
  if (filters.furnishing !== 'Alle') chips.push({ key: 'furnishing', label: filters.furnishing })
  for (const acc of filters.accessibility) {
    chips.push({ key: `acc:${acc}`, label: acc })
  }
  return chips
}

function FiltersContent({
  viewMode,
  searchTerm,
  onSearchTermChange,
  filters,
  onFiltersChange,
  mapStatusFilter,
  onMapStatusFilterChange,
  eventFilterId,
  onEventFilterIdChange,
  publishedEvents,
  showCentralEvents,
  onReset,
}: Omit<NavDatabaseFiltersProps, 'open' | 'isMobile' | 'onClose'>) {
  const { t } = useLanguage()
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const chips = useMemo(
    () =>
      activeFilterChips(filters, searchTerm, eventFilterId, showCentralEvents, publishedEvents),
    [filters, searchTerm, eventFilterId, showCentralEvents, publishedEvents]
  )

  const removeChip = (key: string) => {
    if (key === 'search') onSearchTermChange('')
    else if (key === 'city') onFiltersChange({ ...filters, city: 'Alle' })
    else if (key === 'type') onFiltersChange({ ...filters, type: 'Alle' })
    else if (key === 'event') onEventFilterIdChange('Alle')
    else if (key === 'minPrice') onFiltersChange({ ...filters, minPrice: '' })
    else if (key === 'maxPrice') onFiltersChange({ ...filters, maxPrice: '' })
    else if (key === 'minBedrooms') onFiltersChange({ ...filters, minBedrooms: '' })
    else if (key === 'minSize') onFiltersChange({ ...filters, minSize: '' })
    else if (key === 'furnishing') onFiltersChange({ ...filters, furnishing: 'Alle' })
    else if (key.startsWith('acc:')) {
      const acc = key.slice(4)
      onFiltersChange({
        ...filters,
        accessibility: filters.accessibility.filter((a) => a !== acc),
      })
    }
  }

  return (
    <>
      {viewMode === 'map' ? (
        <div style={{ marginBottom: 'var(--space-3)', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--border-subtle)' }}>
          <label className="label" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.75rem' }}>
            {t('dbMapShowStatuses')}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            {(['Tilgjengelig', 'Ikke markert', 'Utilgjengelig', 'Formidlet'] as const).map((status) => {
              const statusLabel =
                status === 'Tilgjengelig'
                  ? t('available')
                  : status === 'Ikke markert'
                    ? t('availabilityUnmarked')
                    : status === 'Utilgjengelig'
                      ? t('unavailable')
                      : t('formidlet')
              return (
                <label
                  key={status}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    color: 'var(--text-body)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={mapStatusFilter.includes(status)}
                    onChange={() =>
                      onMapStatusFilterChange((prev) => {
                        if (prev.includes(status)) {
                          if (prev.length <= 1) return prev
                          return prev.filter((s) => s !== status)
                        }
                        return [...prev, status].sort()
                      })
                    }
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-royal-blue)' }}
                  />
                  {status === 'Tilgjengelig' && (
                    <CheckCircle2 size={14} style={{ color: 'var(--color-teal)' }} aria-hidden />
                  )}
                  {status === 'Utilgjengelig' && (
                    <XCircle size={14} style={{ color: 'var(--ds-danger)' }} aria-hidden />
                  )}
                  {status === 'Formidlet' && (
                    <ShieldCheck size={14} style={{ color: 'var(--color-royal-blue)' }} aria-hidden />
                  )}
                  {statusLabel}
                </label>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="nav-db-filter-bar__row">
        <div className="nav-db-filter-bar__search">
          <Search size={14} className="nav-db-filter-bar__search-icon" aria-hidden />
          <input
            type="search"
            className="input"
            placeholder={t('dbSearchPlaceholder')}
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            aria-label={t('dbSearch')}
          />
        </div>
        {showCentralEvents ? (
          <select
            className="input nav-db-filter-bar__select"
            value={eventFilterId}
            onChange={(e) => onEventFilterIdChange(e.target.value)}
            aria-label={t('dbFilterEvent')}
          >
            <option value="Alle">{t('dbFilterEventAll')}</option>
            {publishedEvents.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        ) : null}
        <select
          className="input nav-db-filter-bar__select"
          value={filters.city}
          onChange={(e) => onFiltersChange({ ...filters, city: e.target.value })}
          aria-label={t('dbRegion')}
        >
          <option value="Alle">{t('all')}</option>
          <option>Narvik</option>
          <option>Gratangen</option>
          <option>Evenes</option>
          <option>Oslo</option>
          <option>Bergen</option>
          <option>Trondheim</option>
          <option>Stavanger</option>
        </select>
        <select
          className="input nav-db-filter-bar__select"
          value={filters.type}
          onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
          aria-label={t('dbPropertyType')}
        >
          <option value="Alle">{t('all')}</option>
          <option>Enebolig/flermannsbolig</option>
          <option>Leilighet</option>
          <option>Hybelleilighet</option>
          <option>Hybel</option>
          <option>Bokollektiv</option>
        </select>
        <button
          type="button"
          className="nav-db-ghost-btn"
          aria-expanded={showAdvancedFilters}
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          <span>{t('dbMoreFilters')}</span>
          <ChevronDown
            size={12}
            aria-hidden
            style={{
              transform: showAdvancedFilters ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          />
        </button>
      </div>

      {showAdvancedFilters ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 'var(--space-3)',
            paddingTop: 'var(--space-3)',
            marginTop: 'var(--space-3)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>
              {t('dbPricePerDay')}
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                type="number"
                className="input"
                placeholder={t('dbFrom')}
                value={filters.minPrice}
                onChange={(e) => onFiltersChange({ ...filters, minPrice: e.target.value })}
                style={{ marginBottom: 0, minHeight: 36, fontSize: '0.8125rem' }}
              />
              <input
                type="number"
                className="input"
                placeholder={t('dbTo')}
                value={filters.maxPrice}
                onChange={(e) => onFiltersChange({ ...filters, maxPrice: e.target.value })}
                style={{ marginBottom: 0, minHeight: 36, fontSize: '0.8125rem' }}
              />
            </div>
          </div>
          <div>
            <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>
              {t('dbMinBedrooms')}
            </label>
            <input
              type="number"
              className="input"
              placeholder={t('dbPlaceholderEg2')}
              value={filters.minBedrooms}
              onChange={(e) => onFiltersChange({ ...filters, minBedrooms: e.target.value })}
              style={{ minHeight: 36, fontSize: '0.8125rem' }}
            />
          </div>
          <div>
            <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>
              {t('dbMinArea')}
            </label>
            <input
              type="number"
              className="input"
              placeholder={t('dbPlaceholderEg50')}
              value={filters.minSize}
              onChange={(e) => onFiltersChange({ ...filters, minSize: e.target.value })}
              style={{ minHeight: 36, fontSize: '0.8125rem' }}
            />
          </div>
          <div>
            <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>
              {t('dbFurnishing')}
            </label>
            <select
              className="input"
              value={filters.furnishing}
              onChange={(e) => onFiltersChange({ ...filters, furnishing: e.target.value })}
              style={{ minHeight: 36, fontSize: '0.8125rem' }}
            >
              <option value="Alle">{t('all')}</option>
              <option>Umøblert</option>
              <option>Kun hvitevarer</option>
              <option>Fullt møblert</option>
              <option>
                Fullt møblert og boligen har alt nødvendig inventar for matlaging og overnatting.
              </option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>
              {t('dbAccessibility')}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {[
                'Alt på ett plan',
                'Heis i bygget',
                'Terskelfritt',
                'Universell utforming',
                'Omsorgsboligstandard',
              ].map((acc) => (
                <button
                  key={acc}
                  type="button"
                  className={`ds-selector-chip${filters.accessibility.includes(acc) ? ' ds-selector-chip--selected' : ''}`}
                  style={{ minHeight: 32, fontSize: '0.75rem', padding: '0 0.75rem' }}
                  onClick={() => {
                    const newAcc = filters.accessibility.includes(acc)
                      ? filters.accessibility.filter((a) => a !== acc)
                      : [...filters.accessibility, acc]
                    onFiltersChange({ ...filters, accessibility: newAcc })
                  }}
                >
                  {acc}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {chips.length > 0 ? (
        <div className="nav-db-filter-bar__chips">
          <span className="nav-db-filter-bar__chips-label">{t('dbActiveFilters')}</span>
          {chips.map((chip) => (
            <span key={chip.key} className="ds-filter-chip">
              {chip.label}
              <button
                type="button"
                className="ds-filter-chip__remove"
                aria-label={t('dbResetFilters')}
                onClick={() => removeChip(chip.key)}
              >
                <X size={10} strokeWidth={3} aria-hidden />
              </button>
            </span>
          ))}
          <button type="button" className="nav-db-filter-bar__reset" onClick={onReset}>
            {t('dbResetFilters')}
          </button>
        </div>
      ) : null}
    </>
  )
}

export function countActiveNavDatabaseFilters(
  filters: NavDatabaseFiltersState,
  searchTerm: string,
  eventFilterId: string,
  showCentralEvents: boolean
): number {
  let count = 0
  if (searchTerm.trim()) count += 1
  if (filters.city !== 'Alle') count += 1
  if (filters.type !== 'Alle') count += 1
  if (showCentralEvents && eventFilterId !== 'Alle') count += 1
  if (filters.minPrice) count += 1
  if (filters.maxPrice) count += 1
  if (filters.minBedrooms) count += 1
  if (filters.minSize) count += 1
  if (filters.minOccupants) count += 1
  if (filters.floor !== 'Alle') count += 1
  if (filters.furnishing !== 'Alle') count += 1
  count += filters.accessibility.length
  return count
}

export default function NavDatabaseFilters({ open, isMobile, ...contentProps }: NavDatabaseFiltersProps) {
  const { t } = useLanguage()

  if (!open) return null

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        title={t('dbFilterOpen')}
        titleId="db-filters-sheet"
        closeLabel={t('dbDone')}
        onClose={contentProps.onClose}
        zIndex={2100}
      >
        <FiltersContent {...contentProps} />
      </BottomSheet>
    )
  }

  return (
    <div className="nav-db-filter-bar">
      <FiltersContent {...contentProps} />
    </div>
  )
}
