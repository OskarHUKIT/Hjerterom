/**
 * Status for en bolig på en gitt kalenderdag ut fra listing_availability.
 * Brukes i kart, tabell/tidslinje-filter m.m. — samme prioritering som kartnåler.
 * Ingen periode som dekker dagen = Tilgjengelig (samme som utleier «ingen status i dag»).
 */

export type ListingDayAvailabilityStatus = 'Formidla' | 'Utilgjengelig' | 'Tilgjengelig'

/** YYYY-MM-DD fra DB-verdi (dato eller ISO-streng). */
export function ymdFromDb(value: unknown): string {
  const s = String(value ?? '').trim()
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s)
  return m ? m[1] : s.slice(0, 10)
}

/** Dagens dato i brukerens lokale tidssone (ikke UTC midnatt). */
export function todayYmdLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function listingAvailabilityStatusForDay(
  listingId: string,
  availMap: Record<string, { start_date?: string | null; end_date?: string | null; status?: string | null }[]>,
  dayYmd: string
): ListingDayAvailabilityStatus {
  const periods = (availMap[listingId] || []).filter((p) => {
    const sd = ymdFromDb(p.start_date)
    const ed = ymdFromDb(p.end_date)
    if (!sd || !ed) return false
    return sd <= dayYmd && ed >= dayYmd
  })
  if (periods.length === 0) return 'Tilgjengelig'
  if (periods.some((p) => p.status === 'Formidla')) return 'Formidla'
  if (periods.some((p) => p.status === 'Utilgjengelig')) return 'Utilgjengelig'
  return 'Tilgjengelig'
}

export function listingAvailabilityStatusToday(
  listingId: string,
  availMap: Record<string, { start_date?: string | null; end_date?: string | null; status?: string | null }[]>
): ListingDayAvailabilityStatus {
  return listingAvailabilityStatusForDay(listingId, availMap, todayYmdLocal())
}

type AvailRow = {
  id?: string
  start_date?: string | null
  end_date?: string | null
  status?: string | null
}

/** ID-er for Formidla-rader som overlapper gitt dag (YYYY-MM-DD). */
export function formidlaPeriodIdsOverlappingDay(
  listingId: string,
  availMap: Record<string, AvailRow[]>,
  dayYmd: string
): string[] {
  return (availMap[listingId] || [])
    .filter((p) => {
      if (p.status !== 'Formidla') return false
      const sd = ymdFromDb(p.start_date)
      const ed = ymdFromDb(p.end_date)
      if (!sd || !ed || !p.id) return false
      return sd <= dayYmd && ed >= dayYmd
    })
    .map((p) => String(p.id))
}

export function formidlaPeriodIdsOverlappingToday(
  listingId: string,
  availMap: Record<string, AvailRow[]>
): string[] {
  return formidlaPeriodIdsOverlappingDay(listingId, availMap, todayYmdLocal())
}

/** Verdier for `listings.status` / `is_available` som samsvarer med perioder som dekker i dag. */
export function listingRowFieldsForAvailabilityToday(
  listingId: string,
  availMap: Record<string, { start_date?: string | null; end_date?: string | null; status?: string | null }[]>
): { status: 'Formidla' | 'Utilgjengelig' | 'Tilgjengelig'; is_available: boolean } {
  const s = listingAvailabilityStatusToday(listingId, availMap)
  if (s === 'Formidla') return { status: 'Formidla', is_available: false }
  if (s === 'Utilgjengelig') return { status: 'Utilgjengelig', is_available: false }
  return { status: 'Tilgjengelig', is_available: true }
}
