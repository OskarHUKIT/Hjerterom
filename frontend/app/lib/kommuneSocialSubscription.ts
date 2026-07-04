import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Whether the listing city belongs to a kommune with active/pilot social mediation (PRD §6.2 L-7).
 */
export async function isKommuneSocialActiveForCity(
  supabase: SupabaseClient,
  city: string | null | undefined
): Promise<boolean> {
  const trimmed = city?.trim()
  if (!trimmed) return false
  const { data, error } = await supabase.rpc('is_kommune_social_active_for_city', {
    p_city: trimmed,
  })
  if (error) return false
  return data === true
}
