const PREFIX = 'boly-pending-booking:'

export type PendingBookingDraft = {
  checkIn: string
  checkOut: string
  name?: string
  phone?: string
  message?: string
}

export function savePendingBooking(listingId: string, draft: PendingBookingDraft): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(`${PREFIX}${listingId}`, JSON.stringify(draft))
}

export function loadPendingBooking(listingId: string): PendingBookingDraft | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(`${PREFIX}${listingId}`)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PendingBookingDraft
  } catch {
    return null
  }
}

export function clearPendingBooking(listingId: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(`${PREFIX}${listingId}`)
}
