import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { appOrigin, getStripe } from '@/app/lib/stripeServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function supabaseAuthed() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { supabase: null, userId: null as string | null }
  const cookieStore = await cookies()
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })
  const { data } = await supabase.auth.getUser()
  return { supabase, userId: data.user?.id ?? null }
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Stripe Connect Express onboarding for landlord. */
export async function POST() {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 503 })
  }

  const { userId } = await supabaseAuthed()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = adminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 503 })
  }

  const { data: listingRow } = await admin
    .from('listings')
    .select('stripe_connect_account_id')
    .eq('owner_id', userId)
    .not('stripe_connect_account_id', 'is', null)
    .limit(1)
    .maybeSingle()

  let accountId = listingRow?.stripe_connect_account_id as string | undefined

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'NO',
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    })
    accountId = account.id
    await admin
      .from('listings')
      .update({ stripe_connect_account_id: accountId })
      .eq('owner_id', userId)
  }

  const origin = appOrigin()
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/homeowner/manage?stripe=refresh`,
    return_url: `${origin}/homeowner/manage?stripe=return`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url })
}
