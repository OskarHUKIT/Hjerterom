import { logError } from '@/app/lib/appLogger'

export type PlatformEventPayload = {
  severity?: 'info' | 'warn' | 'error'
  source: string
  code: string
  message: string
  userId?: string | null
  kommuneId?: string | null
  metadata?: Record<string, unknown>
}

/** Best-effort structured event for `/ops/health` (service role insert). */
export async function logPlatformEvent(payload: PlatformEventPayload): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url?.trim() || !serviceKey?.trim()) return

  try {
    await fetch(`${url}/rest/v1/platform_events`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        severity: payload.severity ?? 'info',
        source: payload.source,
        code: payload.code,
        message: payload.message.slice(0, 500),
        user_id: payload.userId ?? null,
        kommune_id: payload.kommuneId ?? null,
        metadata: payload.metadata ?? {},
      }),
    })
  } catch (err) {
    logError('platform_events insert failed', err)
  }
}
