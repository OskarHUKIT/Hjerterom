import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { devLog, logError } from '@/app/lib/appLogger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function bad(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function normalizeExportPayload(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
      return null
    } catch {
      return null
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  return null
}

function isCompleteExportPayload(payload: Record<string, unknown>): boolean {
  const data = payload.data
  return (
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data) &&
    'profile' in data
  )
}

/**
 * GDPR art. 15 + 20 — innsyn og portabilitet.
 *
 * Sikkerhet:
 *   1. Bearer-token valideres via supabase.auth.getUser(token)
 *   2. Eksport kjøres med service_role + validert user_id (unngår auth.uid()-gap i API-ruter)
 *   3. Fallback til autentisert RPC hvis service_role ikke er konfigurert (lokal utvikling)
 */
export async function GET(req: NextRequest) {
  const tStart = performance.now()
  const requestId = req.headers.get('x-request-id')?.trim() || crypto.randomUUID()

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return bad('Ikke innlogget', 401)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !anon) return bad('Serverkonfigurasjon mangler', 500)

  const authClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userErr } = await authClient.auth.getUser(token)
  if (userErr || !userData?.user) return bad('Ugyldig sesjon', 401)
  const userId = userData.user.id
  const tAfterAuth = performance.now()

  let exportData: unknown = null
  let rpcErr: { message: string } | null = null

  if (serviceRole) {
    const admin = createClient(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const res = await admin.rpc('rpc_get_user_data_export_impl', { p_uid: userId })
    exportData = res.data
    rpcErr = res.error
  } else {
    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const res = await supabase.rpc('rpc_get_user_data_export')
    exportData = res.data
    rpcErr = res.error
  }

  if (rpcErr) {
    logError(
      JSON.stringify({
        msg: 'user-export rpc error',
        requestId,
        userId,
        usedServiceRole: Boolean(serviceRole),
        error: rpcErr.message,
      })
    )
    return bad('Klarte ikke å hente dataeksport', 500)
  }

  const payload = normalizeExportPayload(exportData)
  if (!payload) return bad('Ingen data funnet', 404)

  if (!isCompleteExportPayload(payload)) {
    logError(
      JSON.stringify({
        msg: 'user-export incomplete payload (missing data.*)',
        requestId,
        userId,
        usedServiceRole: Boolean(serviceRole),
        keys: Object.keys(payload),
      })
    )
    return bad('Eksporten ble ufullstendig. Prøv igjen eller kontakt info@bolynorge.no.', 500)
  }

  const tAfterRpc = performance.now()

  const exportedAt = new Date().toISOString()
  const safeDate = exportedAt.replace(/[:.]/g, '-').slice(0, 19)
  const filename = `boly-personopplysninger-${safeDate}.json`

  const body = JSON.stringify(payload, null, 2)

  devLog(
    JSON.stringify({
      msg: 'user-export ok',
      requestId,
      userId,
      bytes: body.length,
      msTotal: Math.round(tAfterRpc - tStart),
      msAuth: Math.round(tAfterAuth - tStart),
      msRpc: Math.round(tAfterRpc - tAfterAuth),
      usedServiceRole: Boolean(serviceRole),
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
