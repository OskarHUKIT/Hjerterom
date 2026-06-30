import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getStripe } from '@/app/lib/stripeServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function queueBookingReceipt(admin: SupabaseClient, bookingId: string) {
  const { data } = await admin
    .from('bookings')
    .select(
      'id, guest_email, guest_name, check_in, check_out, amount_cents, listing_id, listings(address, city)'
    )
    .eq('id', bookingId)
    .maybeSingle()

  const booking = data as {
    id: string
    guest_email: string | null
    guest_name: string | null
    check_in: string
    check_out: string
    amount_cents: number | null
    listings: { address?: string; city?: string } | null
  } | null

  if (!booking?.guest_email) return

  const listing = booking.listings as { address?: string; city?: string } | null
  const listingAddress = [listing?.address, listing?.city].filter(Boolean).join(', ')

  await admin.rpc(
    'queue_guest_email' as never,
    {
      p_template: 'booking_receipt',
      p_email: booking.guest_email,
      p_payload: {
        booking_id: booking.id,
        guest_name: booking.guest_name,
        check_in: booking.check_in,
        check_out: booking.check_out,
        amount_cents: booking.amount_cents,
        listing_address: listingAddress,
      },
    } as never
  )

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (supabaseUrl && cronSecret) {
    try {
      await fetch(`${supabaseUrl}/functions/v1/process-guest-email-outbox`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cronSecret}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      })
    } catch {
      /* outbox will be processed on next cron run */
    }
  }
}

export async function POST(request: Request) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 503 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 503 })
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { metadata?: { booking_id?: string }; payment_intent?: string | null }
    const bookingId = session.metadata?.booking_id
    if (bookingId) {
      await admin
        .from('bookings')
        .update({
          status: 'paid',
          payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
      await queueBookingReceipt(admin, bookingId)
    }
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as { id: string; metadata?: { booking_id?: string } }
    const bookingId = pi.metadata?.booking_id
    if (bookingId) {
      await admin
        .from('bookings')
        .update({ status: 'paid', payment_intent_id: pi.id, updated_at: new Date().toISOString() })
        .eq('id', bookingId)
      await queueBookingReceipt(admin, bookingId)
    }
  }

  return NextResponse.json({ received: true })
}
