'use client'

import { MapPin, Minus, Plus } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { RangeDatePicker } from '@/app/components/design-system'
import type { FinnSearchFilters } from '@/features/tourism/types/finn'
import FinnSheet from './FinnSheet'

type FinnSearchSheetProps = {
  open: boolean
  onClose: () => void
  filters: FinnSearchFilters & { guests?: number }
  onChange: (next: FinnSearchFilters & { guests?: number }) => void
  onApply: () => void
  resultCount: number
}

export default function FinnSearchSheet({
  open,
  onClose,
  filters,
  onChange,
  onApply,
  resultCount,
}: FinnSearchSheetProps) {
  const { t } = useLanguage()
  const guests = filters.guests ?? 2

  const apply = () => {
    onApply()
    onClose()
  }

  return (
    <FinnSheet open={open} onClose={onClose} title={t('finnSearchSheetTitle')} titleId="finn-search-sheet-title">
      <h3 id="finn-search-sheet-title" className="finn-sheet__title">
        {t('finnSearchSheetTitle')}
      </h3>

      <div style={{ marginBottom: 16 }}>
        <label className="finn-field-label" htmlFor="finn-search-city">
          {t('finnFilterCity')}
        </label>
        <div style={{ position: 'relative' }}>
          <MapPin
            size={16}
            aria-hidden
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--finn-text-muted)',
            }}
          />
          <input
            id="finn-search-city"
            type="text"
            className="finn-field-input"
            value={filters.city ?? ''}
            onChange={(e) => onChange({ ...filters, city: e.target.value })}
            placeholder={t('finnFilterCityPlaceholder')}
            autoComplete="address-level2"
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <span className="finn-field-label">{t('finnSearchDatesLabel')}</span>
        <RangeDatePicker
          checkIn={filters.checkIn ?? ''}
          checkOut={filters.checkOut ?? ''}
          onChange={({ checkIn, checkOut }) => onChange({ ...filters, checkIn, checkOut })}
          checkInLabel={t('finnFilterCheckIn')}
          checkOutLabel={t('finnFilterCheckOut')}
          placeholder={t('finnDateRangePlaceholder')}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <span className="finn-field-label">{t('finnSearchGuestsLabel')}</span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid var(--finn-border)',
            background: 'var(--finn-bg-muted)',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{t('finnSearchAdults')}</p>
            <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--finn-text-muted)' }}>
              {t('finnSearchAdultsHint')}
            </p>
          </div>
          <div className="finn-guest-stepper">
            <button
              type="button"
              className="finn-guest-stepper__btn"
              onClick={() => onChange({ ...filters, guests: Math.max(1, guests - 1) })}
              aria-label={t('finnSearchGuestsDecrease')}
            >
              <Minus size={16} aria-hidden />
            </button>
            <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 700 }}>{guests}</span>
            <button
              type="button"
              className="finn-guest-stepper__btn"
              onClick={() => onChange({ ...filters, guests: Math.min(8, guests + 1) })}
              aria-label={t('finnSearchGuestsIncrease')}
            >
              <Plus size={16} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <button type="button" className="finn-cta-primary" onClick={apply}>
        {t('finnSearchShowResults').replace('{count}', String(resultCount))}
      </button>
    </FinnSheet>
  )
}
