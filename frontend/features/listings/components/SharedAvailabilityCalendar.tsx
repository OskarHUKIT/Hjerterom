'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import type { ListingAvailabilityPeriodRow, ListingEventOptInPeriod } from '@/features/listings/types/lanes'
import {
  buildSharedMonthCells,
  normalizeSelection,
  summerPresetRange,
  restOfYearClosedRange,
  type SharedDayCell,
} from '@/features/listings/lib/sharedCalendarModel'
import { todayYmdLocal } from '@/app/lib/listingAvailabilityStatusToday'
import { Button } from '@/app/components/ui/Button'

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
  /** Shows read-only lane dots on open days (teal/blue/amber). */
  tourismEnabled?: boolean
  showLaneIndicators?: boolean
}

const WEEKDAYS = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø']

function cellBackground(cell: SharedDayCell, paintStatus: 'Tilgjengelig' | 'Utilgjengelig'): string {
  if (cell.isReadOnly) {
    return 'color-mix(in srgb, var(--color-sky-blue) 28%, var(--bg-surface))'
  }
  if (cell.inSelection) {
    return paintStatus === 'Tilgjengelig'
      ? 'color-mix(in srgb, var(--color-teal) 35%, transparent)'
      : 'color-mix(in srgb, var(--lane-sosial-unavailable-bg) 85%, transparent)'
  }
  switch (cell.status) {
    case 'Tilgjengelig':
      return 'color-mix(in srgb, var(--color-teal) 22%, var(--bg-surface))'
    case 'Utilgjengelig':
      return 'color-mix(in srgb, var(--lane-sosial-unavailable-bg) 75%, var(--bg-surface))'
    case 'Formidla':
      return 'color-mix(in srgb, var(--color-sky-blue) 28%, var(--bg-surface))'
    default:
      return 'var(--bg-surface)'
  }
}

function LaneIndicatorDots({ indicators }: { indicators: SharedDayCell['laneIndicators'] }) {
  if (!indicators) return null
  return (
    <span className="shared-avail-lane-dots" aria-hidden>
      {indicators.sosial ? <span className="shared-avail-lane-dot shared-avail-lane-dot--sosial" /> : null}
      {indicators.turisme ? <span className="shared-avail-lane-dot shared-avail-lane-dot--turisme" /> : null}
      {indicators.event ? <span className="shared-avail-lane-dot shared-avail-lane-dot--event" /> : null}
    </span>
  )
}

export default function SharedAvailabilityCalendar({
  periods,
  eventOptIns,
  paintStatus,
  onPaintStatusChange,
  selectionStart,
  selectionEnd,
  onSelectionChange,
  onApply,
  applying,
  showPaintToggle = true,
  tourismEnabled = false,
  showLaneIndicators = true,
}: Props) {
  const { t, locale } = useLanguage()
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const dragAnchor = useRef<string | null>(null)
  const isDragging = useRef(false)

  const cells = useMemo(
    () =>
      buildSharedMonthCells(month, periods, eventOptIns, {
        start: selectionStart,
        end: selectionEnd,
      }, { tourismEnabled }),
    [month, periods, eventOptIns, selectionStart, selectionEnd, tourismEnabled]
  )

  const monthLabel = month.toLocaleDateString(locale === 'en' ? 'en-GB' : 'nb-NO', {
    month: 'long',
    year: 'numeric',
  })

  const hasSelection = Boolean(selectionStart && selectionEnd)

  const handleDayPointerDown = useCallback(
    (cell: SharedDayCell) => {
      if (!cell.iso || cell.isReadOnly) return
      dragAnchor.current = cell.iso
      isDragging.current = true
      onSelectionChange(cell.iso, cell.iso)
    },
    [onSelectionChange]
  )

  const handleDayPointerEnter = useCallback(
    (cell: SharedDayCell) => {
      if (!cell.iso || cell.isReadOnly || !isDragging.current || !dragAnchor.current) return
      onSelectionChange(dragAnchor.current, cell.iso)
    },
    [onSelectionChange]
  )

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const selectionLabel = useMemo(() => {
    if (!selectionStart || !selectionEnd) return null
    const { start, end } = normalizeSelection(selectionStart, selectionEnd)
    return `${start} – ${end}`
  }, [selectionStart, selectionEnd])

  const applyPreset = (start: string, end: string) => {
    onSelectionChange(start, end)
  }

  const statusLabel = (status: SharedDayCell['status']) => {
    if (status === 'Formidla') return t('formidlet')
    if (status === 'Utilgjengelig') return t('unavailable')
    if (status === 'Tilgjengelig') return t('available')
    return t('availabilityUnmarked')
  }

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

      <div className="shared-avail-presets">
        <button
          type="button"
          className="shared-avail-preset"
          onClick={() => {
            const { start, end } = summerPresetRange(month.getFullYear())
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

      <div className="shared-avail-nav">
        <button
          type="button"
          className="shared-avail-nav-btn"
          aria-label={t('calendarPrevMonth')}
          onClick={() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
        >
          <ChevronLeft size={20} />
        </button>
        <span className="shared-avail-month">{monthLabel}</span>
        <button
          type="button"
          className="shared-avail-nav-btn"
          aria-label={t('calendarNextMonth')}
          onClick={() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div
        className="shared-avail-grid-wrap"
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className="shared-avail-weekdays">
          {WEEKDAYS.map((day) => (
            <div key={day} className="shared-avail-weekday">
              {day}
            </div>
          ))}
        </div>
        <div className="shared-avail-grid" role="grid" aria-label={monthLabel}>
          {cells.map((cell, idx) => {
            if (!cell.iso) {
              return <div key={`pad-${idx}`} className="shared-avail-cell shared-avail-cell--pad" />
            }

            const hint = [
              statusLabel(cell.status),
              cell.hasEventOptIn ? t('laneEvent') : null,
            ]
              .filter(Boolean)
              .join(' · ')

            return (
              <button
                key={cell.iso}
                type="button"
                role="gridcell"
                disabled={cell.isReadOnly}
                className={[
                  'shared-avail-cell',
                  cell.isToday ? 'shared-avail-cell--today' : '',
                  cell.isPast ? 'shared-avail-cell--past' : '',
                  cell.inSelection ? 'shared-avail-cell--selected' : '',
                  cell.status === 'Ikke markert' ? 'shared-avail-cell--unmarked' : '',
                  cell.status === 'Tilgjengelig' ? 'shared-avail-cell--booked-open' : '',
                  cell.status === 'Utilgjengelig' ? 'shared-avail-cell--booked-closed' : '',
                  cell.isReadOnly ? 'shared-avail-cell--mediated shared-avail-cell--readonly' : '',
                  cell.hasEventOptIn ? 'shared-avail-cell--event-window' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ '--shared-cell-bg': cellBackground(cell, paintStatus) } as React.CSSProperties}
                title={hint}
                aria-label={`${cell.iso}, ${hint}`}
                aria-selected={cell.inSelection}
                aria-disabled={cell.isReadOnly}
                onPointerDown={(e) => {
                  if (cell.isReadOnly) return
                  e.preventDefault()
                  handleDayPointerDown(cell)
                }}
                onPointerEnter={() => handleDayPointerEnter(cell)}
              >
                <span className="shared-avail-day-num">{Number(cell.iso.slice(8, 10))}</span>
                {showLaneIndicators ? <LaneIndicatorDots indicators={cell.laneIndicators} /> : null}
              </button>
            )
          })}
        </div>
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
        {showLaneIndicators ? (
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
