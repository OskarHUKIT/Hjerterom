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

export async function submitBookingRequest(
  payload: BookingRequestPayload
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data: user } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('bookings')
    .insert([
      {
        listing_id: payload.listingId,
        event_id: payload.eventId ?? null,
        guest_user_id: user.user?.id ?? null,
        guest_email: payload.guestEmail.trim(),
        guest_name: payload.guestName.trim(),
        guest_phone: payload.guestPhone?.trim() || null,
        check_in: payload.checkIn,
        check_out: payload.checkOut,
        message: payload.message?.trim() || null,
        amount_cents: payload.amountCents ?? null,
        status: 'pending',
        currency: 'NOK',
      },
    ])
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data.id }
}
