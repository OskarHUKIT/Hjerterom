import { NextResponse } from 'next/server'
import { createAuthedServerClient } from '@/app/lib/supabaseServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Landlord bookings list for /homeowner/bookings (server-authenticated). */
export async function GET() {
  const authed = await createAuthedServerClient()
  if (!authed) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { supabase, userId } = authed
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('id')
    .eq('owner_id', userId)

  if (listingsError) {
    return NextResponse.json({ error: listingsError.message }, { status: 500 })
  }

  const listingIds = (listings ?? []).map((row) => row.id)
  if (listingIds.length === 0) {
    return NextResponse.json({ bookings: [] })
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, listing_id, guest_name, guest_email, guest_phone, check_in, check_out, status, message, amount_cents, created_at, listings(address, city, tourism_nightly_price_cents)'
    )
    .in('listing_id', listingIds)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ bookings: data ?? [] })
}
