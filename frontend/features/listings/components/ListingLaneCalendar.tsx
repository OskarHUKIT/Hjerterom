'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Paintbrush } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import type {
  ListingAvailabilityPeriodRow,
  ListingEventOptInPeriod,
  ListingPaintLane,
} from '@/features/listings/types/lanes'
import { buildMonthLaneCells, normalizeSelection } from '@/features/listings/lib/laneCalendarModel'
import {
  laneDayBackground,
  laneDayBorderAccent,
  paintLanePreviewBg,
} from '@/features/listings/lib/laneCalendarStyles'
import LaneSegmentedSelect from '@/features/listings/components/LaneSegmentedSelect'
import LaneCalendarLegend from '@/features/listings/components/LaneCalendarLegend'
import { Button } from '@/app/components/ui/Button'

type Props = {
  periods: ListingAvailabilityPeriodRow[]
  eventOptIns: ListingEventOptInPeriod[]
  tourismEnabled: boolean
  showTourism: boolean
  showEvents: boolean
  paintLane: ListingPaintLane
  onPaintLaneChange: (lane: ListingPaintLane) => void
  paintStatus: 'Tilgjengelig' | 'Utilgjengelig'
  onPaintStatusChange: (status: 'Tilgjengelig' | 'Utilgjengelig') => void
  selectionStart: string | null
  selectionEnd: string | null
  onSelectionChange: (start: string | null, end: string | null) => void
  onApply: () => void | Promise<void>
  applying?: boolean
}

const WEEKDAYS_NO = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø']

export default function ListingLaneCalendar({
  periods,
  eventOptIns,
  tourismEnabled,
  showTourism,
  showEvents,
  paintLane,
  onPaintLaneChange,
  paintStatus,
  onPaintStatusChange,
  selectionStart,
  selectionEnd,
  onSelectionChange,
  onApply,
  applying,
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
      buildMonthLaneCells(month, periods, eventOptIns, {
        start: selectionStart,
        end: selectionEnd,
      }),
    [month, periods, eventOptIns, selectionStart, selectionEnd]
  )

  const monthLabel = month.toLocaleDateString(locale === 'en' ? 'en-GB' : 'nb-NO', {
    month: 'long',
    year: 'numeric',
  })

  const hasSelection = Boolean(selectionStart && selectionEnd)

  const handleDayPointerDown = useCallback(
    (iso: string) => {
      if (!iso) return
      dragAnchor.current = iso
      isDragging.current = true
      onSelectionChange(iso, iso)
    },
    [onSelectionChange]
  )

  const handleDayPointerEnter = useCallback(
    (iso: string) => {
      if (!iso || !isDragging.current || !dragAnchor.current) return
      onSelectionChange(dragAnchor.current, iso)
    },
    [onSelectionChange]
  )

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const clearSelection = () => onSelectionChange(null, null)

  const selectionLabel = useMemo(() => {
    if (!selectionStart || !selectionEnd) return null
    const { start, end } = normalizeSelection(selectionStart, selectionEnd)
    return `${start} – ${end}`
  }, [selectionStart, selectionEnd])

  return (
    <section className="lane-calendar" aria-labelledby="lane-calendar-title">
      <div className="lane-calendar-header">
        <div className="lane-calendar-title-row">
          <Paintbrush size={18} aria-hidden className="lane-calendar-icon" />
          <h4 id="lane-calendar-title" className="lane-calendar-title">
            {t('laneCalendarTitle')}
          </h4>
        </div>
        <p className="lane-calendar-lead">{t('laneCalendarLead')}</p>
      </div>

      <LaneSegmentedSelect
        value={paintLane}
        onChange={onPaintLaneChange}
        tourismEnabled={tourismEnabled}
        showTourism={showTourism}
        showEvents={showEvents}
      />

      {paintLane !== 'event' ? (
        <div className="lane-calendar-status-row">
          <span className="lane-segmented-label">{t('status')}</span>
          <div className="lane-status-toggle" role="group" aria-label={t('status')}>
            {(['Tilgjengelig', 'Utilgjengelig'] as const).map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={paintStatus === status}
                className={`lane-status-btn${paintStatus === status ? ' lane-status-btn--active' : ''}`}
                onClick={() => onPaintStatusChange(status)}
              >
                {status === 'Tilgjengelig' ? t('available') : t('unavailable')}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="lane-calendar-event-hint">{t('laneCalendarEventHint')}</p>
      )}

      <div className="lane-calendar-nav">
        <button
          type="button"
          className="lane-calendar-nav-btn"
          aria-label={t('calendarPrevMonth')}
          onClick={() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
        >
          <ChevronLeft size={20} />
        </button>
        <span className="lane-calendar-month">{monthLabel}</span>
        <button
          type="button"
          className="lane-calendar-nav-btn"
          aria-label={t('calendarNextMonth')}
          onClick={() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div
        className="lane-calendar-grid-wrap"
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className="lane-calendar-weekdays">
          {WEEKDAYS_NO.map((day) => (
            <div key={day} className="lane-calendar-weekday">
              {day}
            </div>
          ))}
        </div>
        <div className="lane-calendar-grid" role="grid" aria-label={monthLabel}>
          {cells.map((cell, idx) => {
            if (!cell.iso) {
              return <div key={`pad-${idx}`} className="lane-calendar-cell lane-calendar-cell--pad" />
            }

            const bg = cell.inSelection
              ? paintLanePreviewBg(paintLane, paintStatus)
              : laneDayBackground(cell.layers, cell.isConflict)
            const border = laneDayBorderAccent(cell.layers)
            const layerHint = cell.layers
              .map((l) => {
                const laneName =
                  l.lane === 'event'
                    ? t('laneEvent')
                    : l.lane === 'turisme'
                      ? t('laneTourism')
                      : t('laneSosial')
                const st =
                  l.status === 'Formidla'
                    ? t('formidlet')
                    : l.status === 'Utilgjengelig'
                      ? t('unavailable')
                      : t('available')
                return `${laneName}: ${st}`
              })
              .join(' · ')

            return (
              <button
                key={cell.iso}
                type="button"
                role="gridcell"
                className={[
                  'lane-calendar-cell',
                  cell.isToday ? 'lane-calendar-cell--today' : '',
                  cell.isPast ? 'lane-calendar-cell--past' : '',
                  cell.inSelection ? 'lane-calendar-cell--selected' : '',
                  cell.isConflict ? 'lane-calendar-cell--conflict' : '',
                  cell.layers.length > 1 ? 'lane-calendar-cell--multi' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  background: bg,
                  boxShadow: border ? `inset 0 0 0 ${border}` : undefined,
                }}
                title={layerHint || undefined}
                aria-label={`${cell.iso}${layerHint ? `, ${layerHint}` : ''}`}
                aria-selected={cell.inSelection}
                onPointerDown={(e) => {
                  e.preventDefault()
                  handleDayPointerDown(cell.iso)
                }}
                onPointerEnter={() => handleDayPointerEnter(cell.iso)}
              >
                <span className="lane-calendar-day-num">{Number(cell.iso.slice(8, 10))}</span>
                {cell.layers.length > 0 && !cell.inSelection ? (
                  <span className="lane-calendar-dots" aria-hidden>
                    {cell.layers.slice(0, 3).map((l, i) => (
                      <span key={i} className={`lane-calendar-dot lane-calendar-dot--${l.lane}`} />
                    ))}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <LaneCalendarLegend showTourism={showTourism && tourismEnabled} showEvents={showEvents} />

      {hasSelection ? (
        <div className="lane-calendar-apply-bar">
          <div className="lane-calendar-selection-preview">
            <span
              className="lane-calendar-selection-swatch"
              style={{ background: paintLanePreviewBg(paintLane, paintStatus) }}
              aria-hidden
            />
            <span className="lane-calendar-selection-text">
              {selectionLabel}
              {' · '}
              {paintLane === 'event'
                ? t('laneEvent')
                : paintLane === 'turisme'
                  ? t('laneTourism')
                  : t('laneSosial')}
              {paintLane !== 'event' &&
                ` · ${paintStatus === 'Tilgjengelig' ? t('available') : t('unavailable')}`}
            </span>
          </div>
          <div className="lane-calendar-apply-actions">
            <Button type="button" variant="secondary" onClick={clearSelection} disabled={applying}>
              {t('cancel')}
            </Button>
            <Button type="button" variant="accent" disabled={applying} onClick={() => void onApply()}>
              {paintLane === 'event' ? t('laneCalendarApplyEvent') : t('laneCalendarApply')}
            </Button>
          </div>
        </div>
      ) : (
        <p className="lane-calendar-hint">{t('laneCalendarDragHint')}</p>
      )}
    </section>
  )
}
