/** Availability purpose lane (arrangement uses separate event opt-in tables). */
export type ListingLane = 'sosial' | 'turisme'

export const LISTING_LANES: ListingLane[] = ['sosial', 'turisme']

export function isListingLane(value: string): value is ListingLane {
  return value === 'sosial' || value === 'turisme'
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
