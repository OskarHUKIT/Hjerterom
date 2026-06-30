import { NextResponse } from 'next/server'

/**
 * Stripe webhook — enable by setting STRIPE_WEBHOOK_SECRET + STRIPE_SECRET_KEY.
 * After `npm install stripe`, replace this stub with full constructEvent handling.
 * See docs/hjerterum/SUPABASE_DEPLOY.md §6.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const stripeKey = process.env.STRIPE_SECRET_KEY

  if (!secret?.trim() || !stripeKey?.trim()) {
    return NextResponse.json(
      { error: 'Stripe not configured. Set STRIPE_WEBHOOK_SECRET and STRIPE_SECRET_KEY.' },
      { status: 503 }
    )
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  await request.text()

  return NextResponse.json({
    received: true,
    mode: 'stub',
    hint: 'Run npm install stripe and implement constructEvent — see SUPABASE_DEPLOY.md',
  })
}
