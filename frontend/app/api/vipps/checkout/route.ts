import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, clientIpFromRequest } from '@/app/lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Vipps checkout — placeholder until Vipps eCommerce credentials are configured. */
export async function POST(request: Request) {
  const ip = clientIpFromRequest(request)
  const limited = checkRateLimit(`vipps-checkout:${ip}`, 20, 60_000)
  if (!limited.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const vippsClientId = process.env.VIPPS_CLIENT_ID?.trim()
  const vippsSecret = process.env.VIPPS_CLIENT_SECRET?.trim()
  if (!vippsClientId || !vippsSecret) {
    return NextResponse.json(
      {
        error: 'Vipps is not configured yet. Set VIPPS_CLIENT_ID and VIPPS_CLIENT_SECRET, or pay with Stripe.',
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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, amount_cents')
    .eq('id', bookingId)
    .maybeSingle()

  if (!booking || booking.status !== 'accepted') {
    return NextResponse.json({ error: 'Booking not ready for payment' }, { status: 400 })
  }

  await supabase.from('bookings').update({ payment_provider: 'vipps' }).eq('id', bookingId)

  return NextResponse.json(
    {
      error: 'Vipps payment session creation is not implemented in this build. Use Stripe for now.',
      code: 'vipps_stub',
    },
    { status: 501 }
  )
}
