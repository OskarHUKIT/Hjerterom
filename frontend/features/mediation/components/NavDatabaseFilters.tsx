'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import { Search, ChevronRight, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react'
import BottomSheet from '@/app/components/BottomSheet'
import { Button } from '@/app/components/ui/Button'
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
  onClose,
  onReset,
}: Omit<NavDatabaseFiltersProps, 'open' | 'isMobile'>) {
  const { t } = useLanguage()
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  return (
    <>
      {(viewMode === 'map' || viewMode === 'timeline') && (
        <div
          style={{
            marginBottom: 'var(--space-6)',
            paddingBottom: 'var(--space-6)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <label className="label" style={{ display: 'block', marginBottom: 'var(--space-3)' }}>
            {t('dbMapShowStatuses')}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
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
                    fontSize: '0.9rem',
                    color: 'var(--text-main)',
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
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: 'var(--color-accent)',
                    }}
                  />
                  {status === 'Tilgjengelig' && (
                    <CheckCircle2 size={16} style={{ color: 'var(--color-teal)' }} />
                  )}
                  {status === 'Utilgjengelig' && (
                    <XCircle size={16} style={{ color: '#ef4444' }} />
                  )}
                  {status === 'Formidlet' && (
                    <ShieldCheck size={16} style={{ color: 'var(--color-sky-blue)' }} />
                  )}
                  {statusLabel}
                </label>
              )
            })}
          </div>
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-6)',
        }}
      >
        {showCentralEvents ? (
          <div>
            <label className="label">{t('dbFilterEvent')}</label>
            <select
              className="input"
              value={eventFilterId}
              onChange={(e) => onEventFilterIdChange(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="Alle">{t('dbFilterEventAll')}</option>
              {publishedEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div>
          <label className="label">{t('dbSearch')}</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="input"
              placeholder={t('dbSearchPlaceholder')}
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '14px', opacity: 0.5 }}
            />
          </div>
        </div>
        <div>
          <label className="label">{t('dbRegion')}</label>
          <select
            className="input"
            value={filters.city}
            onChange={(e) => onFiltersChange({ ...filters, city: e.target.value })}
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
        </div>
        <div>
          <label className="label">{t('dbPropertyType')}</label>
          <select
            className="input"
            value={filters.type}
            onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
          >
            <option value="Alle">{t('all')}</option>
            <option>Enebolig/flermannsbolig</option>
            <option>Leilighet</option>
            <option>Hybelleilighet</option>
            <option>Hybel</option>
            <option>Bokollektiv</option>
          </select>
        </div>
      </div>

      <div
        style={{
          marginTop: 'var(--space-6)',
          paddingTop: 'var(--space-6)',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <button
          type="button"
          aria-expanded={showAdvancedFilters}
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-accent)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
            transition: `color var(--transition-fast) var(--ease-out-soft)`,
          }}
        >
          {showAdvancedFilters ? t('dbAdvancedFiltersHide') : t('dbAdvancedFiltersShow')}
          <ChevronRight
            size={16}
            style={{
              transform: showAdvancedFilters ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          />
        </button>

        {showAdvancedFilters && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-6)',
              marginTop: 'var(--space-6)',
            }}
          >
            <div>
              <label className="label">{t('dbPricePerDay')}</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <input
                  type="number"
                  className="input"
                  placeholder={t('dbFrom')}
                  value={filters.minPrice}
                  onChange={(e) => onFiltersChange({ ...filters, minPrice: e.target.value })}
                  style={{ marginBottom: 0 }}
                />
                <input
                  type="number"
                  className="input"
                  placeholder={t('dbTo')}
                  value={filters.maxPrice}
                  onChange={(e) => onFiltersChange({ ...filters, maxPrice: e.target.value })}
                  style={{ marginBottom: 0 }}
                />
              </div>
            </div>
            <div>
              <label className="label">{t('dbMinBedrooms')}</label>
              <input
                type="number"
                className="input"
                placeholder={t('dbPlaceholderEg2')}
                value={filters.minBedrooms}
                onChange={(e) => onFiltersChange({ ...filters, minBedrooms: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('dbMinArea')}</label>
              <input
                type="number"
                className="input"
                placeholder={t('dbPlaceholderEg50')}
                value={filters.minSize}
                onChange={(e) => onFiltersChange({ ...filters, minSize: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('dbMinPeople')}</label>
              <input
                type="number"
                className="input"
                placeholder={t('dbPlaceholderEg3')}
                value={filters.minOccupants}
                onChange={(e) => onFiltersChange({ ...filters, minOccupants: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('dbFurnishing')}</label>
              <select
                className="input"
                value={filters.furnishing}
                onChange={(e) => onFiltersChange({ ...filters, furnishing: e.target.value })}
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
              <label className="label">{t('dbAccessibility')}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
                    onClick={() => {
                      const newAcc = filters.accessibility.includes(acc)
                        ? filters.accessibility.filter((a) => a !== acc)
                        : [...filters.accessibility, acc]
                      onFiltersChange({ ...filters, accessibility: newAcc })
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      background: filters.accessibility.includes(acc)
                        ? 'var(--color-accent)'
                        : 'var(--bg-app)',
                      border: `1px solid ${filters.accessibility.includes(acc) ? 'var(--color-accent)' : 'var(--border-subtle)'}`,
                      color: filters.accessibility.includes(acc)
                        ? 'var(--text-on-dark)'
                        : 'var(--text-main)',
                    }}
                  >
                    {acc}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 'var(--space-6)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--space-4)',
        }}
      >
        <Button
          variant="ghost"
          type="button"
          onClick={onReset}
          style={{ minHeight: 'auto', padding: 'var(--space-2) var(--space-3)' }}
        >
          {t('dbResetFilters')}
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={onClose}
          style={{ padding: '8px 24px' }}
        >
          {t('dbDone')}
        </Button>
      </div>
    </>
  )
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
    <div
      className="card card-settings-panel"
      style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-8)' }}
    >
      <FiltersContent {...contentProps} />
    </div>
  )
}
