/**
 * Human-readable message for Supabase client errors (PostgrestError is a plain object).
 */
export function supabaseErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>
    const msg = o.message
    if (typeof msg === 'string' && msg.trim()) {
      const code = typeof o.code === 'string' && o.code ? ` (${o.code})` : ''
      const details = typeof o.details === 'string' && o.details.trim() ? ` — ${o.details}` : ''
      return `${msg.trim()}${code}${details}`
    }
  }
  return String(err)
}
