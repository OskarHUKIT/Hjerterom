import type { ListingPaintLane } from '@/features/listings/types/lanes'

export type LaneDayLayer = {
  lane: ListingPaintLane | 'formidla'
  status: string
  source: 'availability' | 'event'
}

export type LaneDayCell = {
  iso: string
  layers: LaneDayLayer[]
  isConflict: boolean
  isToday: boolean
  isPast: boolean
  inSelection: boolean
  isSelectionStart: boolean
  isSelectionEnd: boolean
}

/** CSS custom property for cell background (set inline or via class). */
export function laneDayBackground(layers: LaneDayLayer[], isConflict: boolean): string {
  if (isConflict) return 'var(--lane-conflict-bg)'
  if (layers.length === 0) return 'var(--lane-empty-bg)'

  const hasFormidla = layers.some((l) => l.status === 'Formidla' || l.lane === 'formidla')
  if (hasFormidla) return 'var(--lane-sosial-mediated-bg)'

  const event = layers.find((l) => l.lane === 'event')
  if (event && layers.length === 1) return 'var(--lane-event-bg)'

  const tourism = layers.find((l) => l.lane === 'turisme')
  if (tourism) {
    return tourism.status === 'Utilgjengelig'
      ? 'var(--lane-tourism-unavailable-bg)'
      : 'var(--lane-tourism-available-bg)'
  }

  const sosial = layers.find((l) => l.lane === 'sosial')
  if (sosial) {
    if (sosial.status === 'Utilgjengelig') return 'var(--lane-sosial-unavailable-bg)'
    return 'var(--lane-sosial-available-bg)'
  }

  if (event) return 'var(--lane-event-bg)'
  return 'var(--lane-empty-bg)'
}

export function laneDayBorderAccent(layers: LaneDayLayer[]): string | undefined {
  if (layers.length <= 1) return undefined
  const lanes = new Set(layers.map((l) => l.lane))
  if (lanes.size > 1) return '2px solid var(--lane-multi-border)'
  return undefined
}

export function paintLanePreviewBg(lane: ListingPaintLane, status: string): string {
  if (lane === 'event') return 'var(--lane-event-bg)'
  if (lane === 'turisme') {
    return status === 'Utilgjengelig'
      ? 'var(--lane-tourism-unavailable-bg)'
      : 'var(--lane-tourism-available-bg)'
  }
  return status === 'Utilgjengelig'
    ? 'var(--lane-sosial-unavailable-bg)'
    : 'var(--lane-sosial-available-bg)'
}

export function paintLaneCssVar(lane: ListingPaintLane): string {
  if (lane === 'event') return '--lane-event-accent'
  if (lane === 'turisme') return '--lane-tourism-accent'
  return '--lane-sosial-accent'
}
