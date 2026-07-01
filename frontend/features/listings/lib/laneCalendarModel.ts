import type {
  ListingAvailabilityPeriodRow,
  ListingEventOptInPeriod,
  ListingPaintLane,
} from '@/features/listings/types/lanes'
import type { LaneDayCell, LaneDayLayer } from '@/features/listings/lib/laneCalendarStyles'

function isoFromParts(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

function inRange(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end
}

function layersForDay(
  iso: string,
  periods: ListingAvailabilityPeriodRow[],
  eventOptIns: ListingEventOptInPeriod[]
): LaneDayLayer[] {
  const layers: LaneDayLayer[] = []

  for (const p of periods) {
    const sd = String(p.start_date).slice(0, 10)
    const ed = String(p.end_date).slice(0, 10)
    if (!inRange(iso, sd, ed)) continue
    if (p.status === 'Formidla') {
      layers.push({ lane: 'formidla', status: 'Formidla', source: 'availability' })
    } else {
      const lane = p.lane === 'turisme' ? 'turisme' : 'sosial'
      layers.push({ lane, status: p.status, source: 'availability' })
    }
  }

  for (const e of eventOptIns) {
    if (e.status !== 'active') continue
    const sd = String(e.start_date).slice(0, 10)
    const ed = String(e.end_date).slice(0, 10)
    if (inRange(iso, sd, ed)) {
      layers.push({ lane: 'event', status: 'Tilgjengelig', source: 'event' })
    }
  }

  return layers
}

function detectConflict(layers: LaneDayLayer[]): boolean {
  if (layers.length <= 1) return false
  const hasFormidla = layers.some((l) => l.status === 'Formidla')
  const hasUnavailable = layers.some((l) => l.status === 'Utilgjengelig')
  if (hasFormidla && hasUnavailable) return true
  return false
}

export function buildMonthLaneCells(
  month: Date,
  periods: ListingAvailabilityPeriodRow[],
  eventOptIns: ListingEventOptInPeriod[],
  selection: { start: string | null; end: string | null }
): LaneDayCell[] {
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

  const cells: LaneDayCell[] = []

  for (let i = 0; i < startPad; i++) {
    cells.push({
      iso: '',
      layers: [],
      isConflict: false,
      isToday: false,
      isPast: false,
      inSelection: false,
      isSelectionStart: false,
      isSelectionEnd: false,
    })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = isoFromParts(year, monthIdx, d)
    const layers = layersForDay(iso, periods, eventOptIns)
    const inSelection = Boolean(selStart && selEnd && inRange(iso, selStart, selEnd))
    cells.push({
      iso,
      layers,
      isConflict: detectConflict(layers),
      isToday: iso === today,
      isPast: iso < today,
      inSelection,
      isSelectionStart: iso === selStart,
      isSelectionEnd: iso === selEnd,
    })
  }

  return cells
}

export function normalizeSelection(start: string, end: string): { start: string; end: string } {
  return start <= end ? { start, end } : { start: end, end: start }
}

export function eventsOverlappingRange(
  allEvents: ListingEventOptInPeriod[],
  start: string,
  end: string
): ListingEventOptInPeriod[] {
  return allEvents.filter((e) => {
    const sd = String(e.start_date).slice(0, 10)
    const ed = String(e.end_date).slice(0, 10)
    return sd <= end && ed >= start
  })
}

export function isPaintLaneEnabled(
  lane: ListingPaintLane,
  opts: { tourismEnabled: boolean; showTourism: boolean; showEvents: boolean }
): boolean {
  if (lane === 'turisme') return opts.showTourism && opts.tourismEnabled
  if (lane === 'event') return opts.showEvents
  return true
}
