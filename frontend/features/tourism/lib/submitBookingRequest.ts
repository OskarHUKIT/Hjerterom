import { supabase } from '@/app/lib/supabase'

export type BookingRequestPayload = {
  listingId: string
  eventId?: string | null
  guestEmail: string
  guestName: string
  guestPhone?: string
  checkIn: string
  checkOut: string
  message?: string
  amountCents?: number | null
}

export type BookingRequestResult =
  | { ok: true; id: string; instantBook: boolean; status: string }
  | { ok: false; error: string }

export async function submitBookingRequest(
  payload: BookingRequestPayload
): Promise<BookingRequestResult> {
  const { data, error } = await supabase.rpc('submit_tourism_booking', {
    p_listing_id: payload.listingId,
    p_guest_email: payload.guestEmail.trim(),
    p_guest_name: payload.guestName.trim(),
    p_check_in: payload.checkIn,
    p_check_out: payload.checkOut,
    p_guest_phone: payload.guestPhone?.trim() || null,
    p_message: payload.message?.trim() || null,
    p_event_id: payload.eventId ?? null,
  })

  if (error) return { ok: false, error: error.message }

  const row = data as {
    ok?: boolean
    error?: string
    booking_id?: string
    instant_book?: boolean
    status?: string
  } | null

  if (!row?.ok || !row.booking_id) {
    return { ok: false, error: row?.error ?? 'Booking failed' }
  }

  return {
    ok: true,
    id: row.booking_id,
    instantBook: Boolean(row.instant_book),
    status: row.status ?? 'pending',
  }
}
