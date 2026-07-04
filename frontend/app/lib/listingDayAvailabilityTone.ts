import { ymdFromDb } from './listingAvailabilityStatusToday'

/**
 * Per-day tone for DateInput popovers — matches housing-bank timeline semantics
 * (Formidla vs Tilgjengelig vs Utilgjengelig + conflict when overlapping).
 */
export type DayAvailabilityTone =
  | 'available'
  | 'unavailable'
  | 'mediated'
  | 'unmarked'
  | 'conflict'
  | 'none'

export type AvailabilityPeriodForTone = {
  start_date?: string | null
  end_date?: string | null
  status?: string | null
}

export function dayAvailabilityToneForIso(
  iso: string,
  periods: AvailabilityPeriodForTone[]
): DayAvailabilityTone {
  const periodsOnDay = periods.filter((p) => {
    const sd = ymdFromDb(p.start_date)
    const ed = ymdFromDb(p.end_date)
    if (!sd || !ed) return false
    return sd <= iso && ed >= iso
  })
  if (periodsOnDay.length === 0) return 'unmarked'

  const isFormidlet = periodsOnDay.some((p) => p.status === 'Formidla')
  const isAvailable = periodsOnDay.some((p) => p.status === 'Tilgjengelig' || !p.status)
  const isUnavailable = periodsOnDay.some((p) => p.status === 'Utilgjengelig')

  if (isFormidlet) {
    if (isUnavailable) return 'conflict'
    return 'mediated'
  }
  if (isAvailable) {
    if (isUnavailable) return 'conflict'
    return 'available'
  }
  if (isUnavailable) return 'unavailable'
  return 'none'
}
