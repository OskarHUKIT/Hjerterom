'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import type { ListingAvailabilityPeriodRow, ListingEventOptInPeriod } from '@/features/listings/types/lanes'
import {
  normalizeSelection,
  summerPresetRange,
  restOfYearClosedRange,
} from '@/features/listings/lib/sharedCalendarModel'
import { todayYmdLocal, listingAvailabilityStatusForDay } from '@/app/lib/listingAvailabilityStatusToday'
import { Button } from '@/app/components/ui/Button'
import { CalendarWithRangeSelection, localDateToYmd } from '@/app/components/ui/calendar-with-range-selection'

type Props = {
  periods: ListingAvailabilityPeriodRow[]
  eventOptIns: ListingEventOptInPeriod[]
  paintStatus: 'Tilgjengelig' | 'Utilgjengelig'
  onPaintStatusChange: (status: 'Tilgjengelig' | 'Utilgjengelig') => void
  selectionStart: string | null
  selectionEnd: string | null
  onSelectionChange: (start: string | null, end: string | null) => void
  onApply: (start: string, end: string, status: 'Tilgjengelig' | 'Utilgjengelig') => void | Promise<void>
  applying?: boolean
  /** When false, paint mode is controlled by an external SegmentedButtonGroup. */
  showPaintToggle?: boolean
  /** Hide inline preset chips on mobile (hub FAB provides presets). */
  hidePresetsOnMobile?: boolean
  /** Shows read-only lane dots on open days (teal/blue/amber). */
  tourismEnabled?: boolean
  showLaneIndicators?: boolean
}

export default function SharedAvailabilityCalendar({
  periods,
  paintStatus,
  onPaintStatusChange,
  selectionStart,
  selectionEnd,
  onSelectionChange,
  onApply,
  applying,
  showPaintToggle = true,
  hidePresetsOnMobile = false,
  tourismEnabled = false,
  showLaneIndicators = true,
}: Props) {
  const { t } = useLanguage()
  const [months, setMonths] = useState(2)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const sync = () => setMonths(mq.matches ? 2 : 1)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const availMap = useMemo(() => ({ _: periods }), [periods])

  const statusForDay = useCallback(
    (date: Date) => listingAvailabilityStatusForDay('_', availMap, localDateToYmd(date)),
    [availMap]
  )

  const modifiers = useMemo(
    () => ({
      available: (date: Date) => statusForDay(date) === 'Tilgjengelig',
      unavailable: (date: Date) => statusForDay(date) === 'Utilgjengelig',
      mediated: (date: Date) => statusForDay(date) === 'Formidla',
      unmarked: (date: Date) => statusForDay(date) === 'Ikke markert',
    }),
    [statusForDay]
  )

  const modifiersClassNames = useMemo(
    () => ({
      available: 'avail-day--open',
      unavailable: 'avail-day--closed',
      mediated: 'avail-day--mediated',
      unmarked: 'avail-day--unmarked',
    }),
    []
  )

  const disabledDays = useCallback(
    (date: Date) => statusForDay(date) === 'Formidla',
    [statusForDay]
  )

  const selectionLabel = useMemo(() => {
    if (!selectionStart || !selectionEnd) return null
    const { start, end } = normalizeSelection(selectionStart, selectionEnd)
    return `${start} – ${end}`
  }, [selectionStart, selectionEnd])

  const applyPreset = (start: string, end: string) => {
    onSelectionChange(start, end)
  }

  const hasSelection = Boolean(selectionStart && selectionEnd)

  return (
    <section className="shared-avail-calendar" aria-labelledby="shared-avail-title">
      <div className="shared-avail-calendar-header">
        <div className="shared-avail-title-row">
          <CalendarDays size={20} aria-hidden />
          <h4 id="shared-avail-title">{t('sharedCalendarTitle')}</h4>
        </div>
        <p className="shared-avail-lead">{t('sharedCalendarLead')}</p>
      </div>

      {showPaintToggle ? (
        <div className="shared-avail-status-row">
          <span className="shared-avail-label">{t('sharedCalendarQuestion')}</span>
          <div className="shared-avail-toggle" role="group" aria-label={t('status')}>
            {(['Tilgjengelig', 'Utilgjengelig'] as const).map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={paintStatus === status}
                className={`shared-avail-toggle-btn${paintStatus === status ? ' shared-avail-toggle-btn--active' : ''}${status === 'Tilgjengelig' ? ' shared-avail-toggle-btn--open' : ' shared-avail-toggle-btn--closed'}`}
                onClick={() => onPaintStatusChange(status)}
              >
                {status === 'Tilgjengelig' ? t('sharedCalendarOpen') : t('sharedCalendarClosed')}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className={`shared-avail-presets${hidePresetsOnMobile ? ' shared-avail-presets--hub-mobile-hidden' : ''}`}
      >
        <button
          type="button"
          className="shared-avail-preset"
          onClick={() => {
            const year = new Date().getFullYear()
            const { start, end } = summerPresetRange(year)
            applyPreset(start, end)
          }}
        >
          {t('sharedCalendarPresetSummer')}
        </button>
        <button
          type="button"
          className="shared-avail-preset"
          onClick={() => {
            const { start, end } = restOfYearClosedRange(todayYmdLocal())
            applyPreset(start, end)
          }}
        >
          {t('sharedCalendarPresetClosedRest')}
        </button>
      </div>

      <div className="shared-avail-range-calendar">
        <CalendarWithRangeSelection
          variant="homeowner"
          checkIn={selectionStart ?? ''}
          checkOut={selectionEnd ?? ''}
          onChange={({ checkIn, checkOut }) => {
            onSelectionChange(checkIn || null, checkOut || null)
          }}
          numberOfMonths={months}
          disabled={disabledDays}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          defaultMonth={
            selectionStart
              ? new Date(Number(selectionStart.slice(0, 4)), Number(selectionStart.slice(5, 7)) - 1, 1)
              : new Date()
          }
          calendarClassName="mx-auto w-full max-w-full border-border/80 bg-transparent shadow-none"
        />
      </div>

      <ul className="shared-avail-legend" aria-label={t('calendarLegend')}>
        <li>
          <span className="shared-avail-legend-swatch shared-avail-legend-swatch--open" />
          {t('available')}
        </li>
        <li>
          <span className="shared-avail-legend-swatch shared-avail-legend-swatch--closed" />
          {t('unavailable')}
        </li>
        <li>
          <span className="shared-avail-legend-swatch shared-avail-legend-swatch--unmarked" />
          {t('availabilityUnmarked')}
        </li>
        <li>
          <span className="shared-avail-legend-swatch shared-avail-legend-swatch--mediated" />
          {t('formidlet')}
        </li>
        {showLaneIndicators && tourismEnabled ? (
          <li className="shared-avail-legend-lanes">
            <span className="shared-avail-lane-dots shared-avail-lane-dots--legend" aria-hidden>
              <span className="shared-avail-lane-dot shared-avail-lane-dot--sosial" />
              <span className="shared-avail-lane-dot shared-avail-lane-dot--turisme" />
              <span className="shared-avail-lane-dot shared-avail-lane-dot--event" />
            </span>
            {t('sharedCalendarLaneDotsLegend')}
          </li>
        ) : null}
      </ul>

      {hasSelection ? (
        <div className="shared-avail-apply-bar">
          <span className="shared-avail-selection-text">
            {selectionLabel} · {paintStatus === 'Tilgjengelig' ? t('available') : t('unavailable')}
          </span>
          <div className="shared-avail-apply-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onSelectionChange(null, null)}
              disabled={applying}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              variant="accent"
              disabled={applying}
              onClick={() => {
                if (!selectionStart || !selectionEnd) return
                const { start, end } = normalizeSelection(selectionStart, selectionEnd)
                void onApply(start, end, paintStatus)
              }}
            >
              {t('sharedCalendarSave')}
            </Button>
          </div>
        </div>
      ) : (
        <p className="shared-avail-hint">{t('sharedCalendarDragHint')}</p>
      )}
    </section>
  )
}
