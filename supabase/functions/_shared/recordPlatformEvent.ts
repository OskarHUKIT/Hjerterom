import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

export type PlatformEventSeverity = "info" | "warn" | "error"

export type RecordPlatformEventArgs = {
  severity: PlatformEventSeverity
  source: string
  code: string
  message: string
  userId?: string | null
  kommuneId?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Persist GDPR-safe operator-visible events (service role insert; no PII beyond masked metadata).
 */
export async function recordPlatformEvent(
  supabaseAdmin: SupabaseClient,
  args: RecordPlatformEventArgs,
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("platform_events").insert({
      severity: args.severity,
      source: args.source,
      code: args.code,
      message: args.message.slice(0, 500),
      user_id: args.userId ?? null,
      kommune_id: args.kommuneId ?? null,
      metadata: args.metadata ?? {},
    })
    if (error) {
      console.error("recordPlatformEvent failed:", error.message)
    }
  } catch (e) {
    console.error("recordPlatformEvent exception:", e)
  }
}

export async function resolveKommuneIdFromCity(
  supabaseAdmin: SupabaseClient,
  city: string | null | undefined,
): Promise<string | null> {
  if (!city?.trim()) return null
  const { data, error } = await supabaseAdmin.rpc("resolve_kommune_id_from_city", {
    p_city: city.trim(),
  })
  if (error || !data) return null
  return typeof data === "string" ? data : null
}
