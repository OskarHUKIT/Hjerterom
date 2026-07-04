/** Parse jsonb payloads returned from Supabase RPC (object or JSON string). */
export function readRpcOk(data: unknown): { ok: boolean; reason?: string; error?: string } {
  let payload = data
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload) as unknown
    } catch {
      return { ok: false }
    }
  }
  if (payload && typeof payload === 'object' && 'ok' in payload) {
    const row = payload as { ok?: boolean; reason?: string; error?: string }
    return { ok: Boolean(row.ok), reason: row.reason, error: row.error }
  }
  return { ok: false }
}
