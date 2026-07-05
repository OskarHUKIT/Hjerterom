import { formatNokFromCents } from '@/app/lib/platformFee'

export type LandlordBookingRow = {
  id: string
  listing_id: string
  guest_name: string | null
  guest_email: string
  guest_phone: string | null
  check_in: string
  check_out: string
  status: string
  message: string | null
  amount_cents: number | null
  created_at: string
  listings:
    | {
        address: string
        city: string | null
        tourism_nightly_price_cents: number | null
      }
    | {
        address: string
        city: string | null
        tourism_nightly_price_cents: number | null
      }[]
    | null
}

export type LandlordBookingsFilter = 'all' | 'pending' | 'confirmed' | 'history'
export type LandlordBookingsSortKey = 'created_at' | 'status' | 'price'

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(diff, 0)
}

export function resolveListing(row: LandlordBookingRow) {
  return Array.isArray(row.listings) ? row.listings[0] ?? null : row.listings
}

export function bookingPropertyLabel(row: LandlordBookingRow): string {
  const listing = resolveListing(row)
  if (!listing?.address) return '—'
  return listing.city ? `${listing.address}, ${listing.city}` : listing.address
}

export function bookingGuestLabel(row: LandlordBookingRow): string {
  return row.guest_name?.trim() || row.guest_email
}

export function bookingPriceCents(row: LandlordBookingRow): number | null {
  if (row.amount_cents != null && row.amount_cents > 0) return row.amount_cents
  const listing = resolveListing(row)
  const nightly = listing?.tourism_nightly_price_cents
  if (!nightly || nightly <= 0) return null
  const nights = nightsBetween(row.check_in, row.check_out)
  if (nights <= 0) return null
  return nightly * nights
}

export function formatBookingPrice(row: LandlordBookingRow): string {
  const cents = bookingPriceCents(row)
  return cents != null && cents > 0 ? formatNokFromCents(cents) : '—'
}

export function filterLandlordBookings(
  rows: LandlordBookingRow[],
  filter: LandlordBookingsFilter
): LandlordBookingRow[] {
  switch (filter) {
    case 'pending':
      return rows.filter((row) => row.status === 'pending')
    case 'confirmed':
      return rows.filter((row) => row.status === 'accepted' || row.status === 'paid')
    case 'history':
      return rows.filter((row) =>
        ['completed', 'rejected', 'cancelled'].includes(row.status)
      )
    default:
      return rows
  }
}

export function sortLandlordBookings(
  rows: LandlordBookingRow[],
  sortKey: LandlordBookingsSortKey,
  sortOrder: 'asc' | 'desc'
): LandlordBookingRow[] {
  const dir = sortOrder === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (sortKey === 'created_at') {
      return (
        (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir
      )
    }
    if (sortKey === 'status') {
      return a.status.localeCompare(b.status) * dir
    }
    const aPrice = bookingPriceCents(a) ?? 0
    const bPrice = bookingPriceCents(b) ?? 0
    return (aPrice - bPrice) * dir
  })
}
