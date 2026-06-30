import { supabase } from '@/app/lib/supabase'

export type EventInquiryPayload = {
  eventId: string
  listingId?: string | null
  contactName: string
  contactEmail: string
  contactPhone?: string
  message?: string
  dateFrom?: string
  dateTo?: string
}

export async function submitEventInquiry(payload: EventInquiryPayload): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from('event_inquiries').insert([
    {
      event_id: payload.eventId,
      listing_id: payload.listingId ?? null,
      contact_name: payload.contactName.trim(),
      contact_email: payload.contactEmail.trim(),
      contact_phone: payload.contactPhone?.trim() || null,
      message: payload.message?.trim() || null,
      date_from: payload.dateFrom || null,
      date_to: payload.dateTo || null,
      status: 'new',
    },
  ])

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
