import { NextResponse } from 'next/server'
import { getVippsConfig } from '@/app/lib/vippsServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Whether Vipps ePayment is configured on this deployment. */
export async function GET() {
  return NextResponse.json({ configured: !!getVippsConfig() })
}
