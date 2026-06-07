import type { SupabaseClient } from '@supabase/supabase-js'
import { devWarn } from '@/app/lib/appLogger'

/**
 * Oppretter public.profiles-rad for innlogget bruker hvis den mangler (RPC ensure_own_profile).
 * Trygg å kalle ved innlogging og app-start — idempotent.
 */
export async function ensureOwnProfile(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.rpc('ensure_own_profile')
  if (error) {
    devWarn('[Boly] ensure_own_profile failed:', error.message)
  }
}
