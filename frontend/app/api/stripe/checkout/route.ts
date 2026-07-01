import { NextResponse } from 'next/server'
import { appOrigin, getStripe } from '@/app/lib/stripeServer'
import { checkRateLimit, clientIpFromRequest } from '@/app/lib/rateLimit'
import { logPlatformEvent } from '@/app/lib/platformEvents'
import { createAuthedServerClient } from '@/app/lib/supabaseServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Create Stripe Checkout Session for an accepted booking. */
export async function POST(request: Request) {
  const ip = clientIpFromRequest(request)
  const limited = checkRateLimit(`stripe-checkout:${ip}`, 20, 60_000)
  if (!limited.ok) {
    void logPlatformEvent({
      severity: 'warn',
      source: 'stripe',
      code: 'rate_limited',
      message: 'Checkout rate limit exceeded',
      metadata: { ip_mask: ip.slice(0, 8) },
    })
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    )
  }

  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 503 })
  }

  const body = (await request.json()) as { bookingId?: string }
  const bookingId = body.bookingId?.trim()
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId required' }, { status: 400 })
  }

  const authed = await createAuthedServerClient()
  if (!authed) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }
  const { supabase, userId, email } = authed

  const { data: booking, error } = await supabase
    .from('bookings')
    .select(
      'id, status, amount_cents, currency, guest_email, guest_user_id, listing_id, listings(stripe_connect_account_id, address, city, tourism_nightly_price_cents, owner_id)'
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.status !== 'accepted' && booking.status !== 'pending') {
    return NextResponse.json({ error: 'Booking not payable' }, { status: 400 })
  }

  const guestOk =
    (userId && booking.guest_user_id === userId) ||
    (email && booking.guest_email === email)
  if (!guestOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const listingRaw = booking.listings as
    | { stripe_connect_account_id: string | null; address: string; city: string; tourism_nightly_price_cents: number | null }
    | { stripe_connect_account_id: string | null; address: string; city: string; tourism_nightly_price_cents: number | null }[]
    | null
  const listing = Array.isArray(listingRaw) ? listingRaw[0] : listingRaw

  let amountCents = booking.amount_cents as number | null
  if (amountCents == null || amountCents <= 0) {
    amountCents = listing?.tourism_nightly_price_cents ?? 0
  }
  if (amountCents <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  const connectAccount = listing?.stripe_connect_account_id
  if (!connectAccount) {
    return NextResponse.json({ error: 'Landlord has not connected Stripe yet' }, { status: 503 })
  }

  const origin = appOrigin()
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: booking.guest_email,
    line_items: [
      {
        price_data: {
          currency: (booking.currency as string)?.toLowerCase() ?? 'nok',
          unit_amount: amountCents,
          product_data: {
            name: `Opphold — ${listing?.address ?? 'Bolig'}, ${listing?.city ?? ''}`,
          },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: Math.round(amountCents * 0.05),
      transfer_data: { destination: connectAccount },
      metadata: { booking_id: bookingId },
    },
    metadata: { booking_id: bookingId },
    success_url: `${origin}/finn/mine?booking=${bookingId}&paid=1`,
    cancel_url: `${origin}/finn/book/${bookingId}?cancelled=1`,
  })

  return NextResponse.json({ url: session.url })
}
