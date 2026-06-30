import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getVippsConfig, vippsGetPayment } from '@/app/lib/vippsServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type VippsWebhookBody = {
  reference?: string
  name?: string
  msn?: string
}

/** Vipps ePayment webhook — marks booking paid on successful capture. */
export async function POST(request: Request) {
  const cfg = getVippsConfig()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!cfg || !url || !serviceKey) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  let body: VippsWebhookBody
  try {
    body = (await request.json()) as VippsWebhookBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const reference = body.reference?.trim()
  if (!reference?.startsWith('hr-')) {
    return NextResponse.json({ received: true })
  }

  const bookingId = reference.slice(3)
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const eventName = body.name ?? ''
  const paidEvents = ['EPAYMENT_PAYMENT_CAPTURED', 'EPAYMENT_PAYMENT_AUTHORIZED', 'AUTHORIZED', 'CAPTURED']

  let shouldMarkPaid = paidEvents.some((e) => eventName.includes(e))

  if (!shouldMarkPaid) {
    const status = await vippsGetPayment(cfg, reference)
    shouldMarkPaid = status.state === 'AUTHORIZED' || status.state === 'CAPTURED'
  }

  if (shouldMarkPaid) {
    await admin
      .from('bookings')
      .update({
        status: 'paid',
        payment_provider: 'vipps',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .in('status', ['accepted', 'pending'])
  }

  return NextResponse.json({ received: true })
}
