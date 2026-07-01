import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * PRD §6.2 / L-7: true when city maps to a pilot/active Boly kommune (social lane).
 * On RPC error, defaults to true (keep existing sign-terms gate).
 */
export async function isKommuneSocialSubscribed(
  supabase: SupabaseClient,
  city: string | null | undefined
): Promise<boolean> {
  const trimmed = city?.trim()
  if (!trimmed) return false

  const { data, error } = await supabase.rpc('is_kommune_social_subscribed', {
    p_city: trimmed,
  })

  if (error) return true
  return Boolean(data)
}
