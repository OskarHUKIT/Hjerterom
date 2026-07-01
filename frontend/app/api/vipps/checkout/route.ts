import { NextResponse } from 'next/server'
import { appOrigin } from '@/app/lib/stripeServer'
import { checkRateLimit, clientIpFromRequest } from '@/app/lib/rateLimit'
import { getVippsConfig, vippsCreatePayment } from '@/app/lib/vippsServer'
import { createAuthedServerClient } from '@/app/lib/supabaseServer'
import { bookingPaymentSplit } from '@/app/lib/bookingPaymentSettlement'
import { platformApplicationFeeCents } from '@/app/lib/platformFee'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Create Vipps ePayment session for an accepted booking. */
export async function POST(request: Request) {
  const ip = clientIpFromRequest(request)
  const limited = checkRateLimit(`vipps-checkout:${ip}`, 20, 60_000)
  if (!limited.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const cfg = getVippsConfig()
  if (!cfg) {
    return NextResponse.json(
      {
        error: 'Vipps is not configured yet. Set VIPPS_CLIENT_ID, VIPPS_CLIENT_SECRET, VIPPS_SUBSCRIPTION_KEY, and VIPPS_MSN, or pay with Stripe.',
        code: 'vipps_not_configured',
      },
      { status: 503 }
    )
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
    .select('id, status, amount_cents, guest_email, guest_user_id, guest_phone, listing_id, listings(tourism_nightly_price_cents)')
    .eq('id', bookingId)
    .maybeSingle()

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.status !== 'accepted') {
    return NextResponse.json({ error: 'Booking not ready for payment' }, { status: 400 })
  }

  const guestOk =
    (userId && booking.guest_user_id === userId) ||
    (email && booking.guest_email === email)
  if (!guestOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const listingRaw = booking.listings as
    | { tourism_nightly_price_cents: number | null }
    | { tourism_nightly_price_cents: number | null }[]
    | null
  const listing = Array.isArray(listingRaw) ? listingRaw[0] : listingRaw

  let amountCents = booking.amount_cents as number | null
  if (amountCents == null || amountCents <= 0) {
    amountCents = listing?.tourism_nightly_price_cents ?? 0
  }
  if (amountCents <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  const reference = `hr-${bookingId}`
  const origin = appOrigin()
  const platformFee = platformApplicationFeeCents(amountCents)
  const { landlordPayoutCents } = bookingPaymentSplit(amountCents)

  try {
    const { redirectUrl, paymentId } = await vippsCreatePayment(cfg, {
      reference,
      amountCents,
      returnUrl: `${origin}/finn/mine?booking=${bookingId}&paid=1`,
      phoneNumber: (booking.guest_phone as string | null)?.replace(/\D/g, '') || undefined,
    })

    await supabase
      .from('bookings')
      .update({
        payment_provider: 'vipps',
        vipps_order_id: paymentId,
        platform_fee_cents: platformFee,
        landlord_payout_cents: landlordPayoutCents,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    return NextResponse.json({ url: redirectUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Vipps payment failed'
    return NextResponse.json({ error: message, code: 'vipps_error' }, { status: 502 })
  }
}
