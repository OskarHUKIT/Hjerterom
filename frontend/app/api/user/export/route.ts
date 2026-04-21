import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { devLog, logError } from '@/app/lib/appLogger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function bad(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * GDPR art. 15 + 20 — innsyn og portabilitet.
 *
 * Sikkerhet (tainted analysis):
 *   1. Bearer-token valideres via supabase.auth.getUser(token)
 *   2. RPC-et tar ingen parametre og bruker auth.uid() internt
 *   3. Ingen kaller kan injisere annens user_id, selv ikke via manipulert
 *      request-body — endpoint-et aksepterer ingen body.
 */
export async function GET(req: NextRequest) {
  const tStart = performance.now()
  const requestId = req.headers.get('x-request-id')?.trim() || crypto.randomUUID()

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return bad('Ikke innlogget', 401)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return bad('Serverkonfigurasjon mangler', 500)

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) return bad('Ugyldig sesjon', 401)
  const userId = userData.user.id
  const tAfterAuth = performance.now()

  const { data: exportData, error: rpcErr } = await supabase.rpc('rpc_get_user_data_export')

  if (rpcErr) {
    logError(
      JSON.stringify({
        msg: 'user-export rpc error',
        requestId,
        userId,
        error: rpcErr.message,
      })
    )
    return bad('Klarte ikke å hente dataeksport', 500)
  }
  if (!exportData) return bad('Ingen data funnet', 404)

  const tAfterRpc = performance.now()

  const exportedAt = new Date().toISOString()
  const safeDate = exportedAt.replace(/[:.]/g, '-').slice(0, 19)
  const filename = `boly-personopplysninger-${safeDate}.json`

  const body = JSON.stringify(exportData, null, 2)

  devLog(
    JSON.stringify({
      msg: 'user-export ok',
      requestId,
      userId,
      bytes: body.length,
      msTotal: Math.round(tAfterRpc - tStart),
      msAuth: Math.round(tAfterAuth - tStart),
      msRpc: Math.round(tAfterRpc - tAfterAuth),
    })
  )

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'X-Content-Type-Options': 'nosniff',
      'x-request-id': requestId,
    },
  })
}
