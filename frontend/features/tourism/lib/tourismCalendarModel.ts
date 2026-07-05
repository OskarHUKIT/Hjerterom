import { listingAvailabilityStatusForDay } from '@/app/lib/listingAvailabilityStatusToday'
import { localDateToYmd } from '@/app/components/ui/calendar-with-range-selection'
import type { TourismAvailabilityPeriod, TourismBlockedRange } from '@/features/tourism/hooks/useTourismListingCalendarData'

export function isNightBooked(ymd: string, ranges: TourismBlockedRange[]): boolean {
  return ranges.some((r) => ymd >= r.check_in && ymd < r.check_out)
}

export function tourismDayStatus(
  listingId: string,
  periods: TourismAvailabilityPeriod[],
  ymd: string
): 'Tilgjengelig' | 'Utilgjengelig' | 'Ikke markert' {
  const availMap = { [listingId]: periods }
  const status = listingAvailabilityStatusForDay(listingId, availMap, ymd)
  if (status === 'Formidla') return 'Utilgjengelig'
  if (status === 'Tilgjengelig') return 'Tilgjengelig'
  if (status === 'Utilgjengelig') return 'Utilgjengelig'
  return 'Ikke markert'
}

export function isTourismDaySelectable(
  listingId: string,
  periods: TourismAvailabilityPeriod[],
  blockedRanges: TourismBlockedRange[],
  date: Date,
  bookingsFetchFailed: boolean
): boolean {
  const ymd = localDateToYmd(date)
  const today = localDateToYmd(new Date())
  if (ymd < today) return false
  if (tourismDayStatus(listingId, periods, ymd) !== 'Tilgjengelig') return false
  if (!bookingsFetchFailed && isNightBooked(ymd, blockedRanges)) return false
  return true
}

export function selectionWithinAvailablePeriods(
  checkIn: string,
  checkOut: string,
  listingId: string,
  periods: TourismAvailabilityPeriod[],
  blockedRanges: TourismBlockedRange[],
  bookingsFetchFailed: boolean
): boolean {
  if (!checkIn || !checkOut || checkOut <= checkIn) return false
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  const cursor = new Date(start)
  while (cursor < end) {
    if (
      !isTourismDaySelectable(listingId, periods, blockedRanges, cursor, bookingsFetchFailed)
    ) {
      return false
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return true
}
