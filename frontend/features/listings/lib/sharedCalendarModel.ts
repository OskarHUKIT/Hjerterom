import type { ListingAvailabilityPeriodRow, ListingEventOptInPeriod } from '@/features/listings/types/lanes'
import { listingAvailabilityStatusForDay } from '@/app/lib/listingAvailabilityStatusToday'

export type SharedDayLaneIndicators = {
  sosial: boolean
  turisme: boolean
  event: boolean
}

export type SharedDayCell = {
  iso: string
  status: 'Formidla' | 'Utilgjengelig' | 'Tilgjengelig' | 'Ikke markert'
  hasEventOptIn: boolean
  laneIndicators: SharedDayLaneIndicators | null
  isToday: boolean
  isPast: boolean
  inSelection: boolean
  isSelectionStart: boolean
  isSelectionEnd: boolean
  isReadOnly: boolean
}

function isoFromParts(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

function inRange(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end
}

function hasEventOnDay(iso: string, eventOptIns: ListingEventOptInPeriod[]): boolean {
  return eventOptIns.some((e) => {
    if (e.status !== 'active') return false
    const sd = String(e.start_date).slice(0, 10)
    const ed = String(e.end_date).slice(0, 10)
    return inRange(iso, sd, ed)
  })
}

function laneIndicatorsForOpenDay(
  iso: string,
  eventOptIns: ListingEventOptInPeriod[],
  tourismEnabled: boolean
): SharedDayLaneIndicators {
  return {
    sosial: true,
    turisme: tourismEnabled,
    event: hasEventOnDay(iso, eventOptIns),
  }
}

export function buildSharedMonthCells(
  month: Date,
  periods: ListingAvailabilityPeriodRow[],
  eventOptIns: ListingEventOptInPeriod[],
  selection: { start: string | null; end: string | null },
  options: { tourismEnabled?: boolean } = {}
): SharedDayCell[] {
  const tourismEnabled = Boolean(options.tourismEnabled)
  const year = month.getFullYear()
  const monthIdx = month.getMonth()
  const first = new Date(year, monthIdx, 1)
  const last = new Date(year, monthIdx + 1, 0)
  const startPad = (first.getDay() + 6) % 7
  const daysInMonth = last.getDate()
  const today = new Date().toISOString().slice(0, 10)

  let selStart = selection.start
  let selEnd = selection.end
  if (selStart && selEnd && selEnd < selStart) {
    ;[selStart, selEnd] = [selEnd, selStart]
  }

  const availMap = { _: periods }
  const cells: SharedDayCell[] = []

  for (let i = 0; i < startPad; i++) {
    cells.push({
      iso: '',
      status: 'Ikke markert',
      hasEventOptIn: false,
      laneIndicators: null,
      isToday: false,
      isPast: false,
      inSelection: false,
      isSelectionStart: false,
      isSelectionEnd: false,
      isReadOnly: false,
    })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = isoFromParts(year, monthIdx, d)
    const status = listingAvailabilityStatusForDay('_', availMap, iso)
    const inSelection = Boolean(selStart && selEnd && inRange(iso, selStart, selEnd))
    const eventActive = hasEventOnDay(iso, eventOptIns)
    cells.push({
      iso,
      status,
      hasEventOptIn: eventActive,
      laneIndicators:
        status === 'Tilgjengelig' ? laneIndicatorsForOpenDay(iso, eventOptIns, tourismEnabled) : null,
      isToday: iso === today,
      isPast: iso < today,
      inSelection,
      isSelectionStart: iso === selStart,
      isSelectionEnd: iso === selEnd,
      isReadOnly: status === 'Formidla',
    })
  }

  return cells
}

export function normalizeSelection(start: string, end: string): { start: string; end: string } {
  return start <= end ? { start, end } : { start: end, end: start }
}

export function summerPresetRange(year: number): { start: string; end: string } {
  return { start: `${year}-06-01`, end: `${year}-08-31` }
}

export function restOfYearClosedRange(fromYmd: string): { start: string; end: string } {
  const year = Number(fromYmd.slice(0, 4))
  return { start: fromYmd, end: `${year}-12-31` }
}
