import type { SupabaseClient } from '@supabase/supabase-js'
import { devWarn } from '@/app/lib/appLogger'

/** Oppretter/oppdaterer guest_profiles og leietaker-rolle ved behov. */
export async function ensureGuestProfile(
  supabase: SupabaseClient,
  options?: { displayName?: string; phone?: string }
): Promise<boolean> {
  const { data, error } = await supabase.rpc('ensure_guest_profile', {
    p_display_name: options?.displayName?.trim() || null,
    p_phone: options?.phone?.trim() || null,
  })
  if (error) {
    devWarn('[Finn] ensure_guest_profile failed:', error.message)
    return false
  }
  const row = data as { ok?: boolean } | null
  return row?.ok === true
}
