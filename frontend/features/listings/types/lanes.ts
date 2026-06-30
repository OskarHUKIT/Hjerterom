/** Availability purpose lane (arrangement uses separate event opt-in tables). */
export type ListingLane = 'sosial' | 'turisme'

/** UI lane for paint brush — event is managed via listing_event_availability. */
export type ListingPaintLane = ListingLane | 'event'

export const LISTING_LANES: ListingLane[] = ['sosial', 'turisme']

export const LISTING_PAINT_LANES: ListingPaintLane[] = ['sosial', 'turisme', 'event']

export function isListingLane(value: string): value is ListingLane {
  return value === 'sosial' || value === 'turisme'
}

export function isListingPaintLane(value: string): value is ListingPaintLane {
  return value === 'sosial' || value === 'turisme' || value === 'event'
}

export type AvailabilityConflictResult = {
  ok: boolean
  reason?: 'invalid_range' | 'overlap'
  conflict?: {
    id: string
    start_date: string
    end_date: string
    status: string
    lane: string
  }
}

export type ListingEventOptInPeriod = {
  event_id: string
  event_name: string
  start_date: string
  end_date: string
  status: string
}

export type ListingAvailabilityPeriodRow = {
  id: string
  start_date: string
  end_date: string
  status: string
  lane?: string | null
}
