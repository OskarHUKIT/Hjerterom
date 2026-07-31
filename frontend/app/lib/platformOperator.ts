import type { SupabaseClient } from '@supabase/supabase-js'

/** Whether the current session belongs to an active GameChanging platform operator. */
export async function isPlatformOperator(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc('ops_check_access')
  if (error) return false
  return Boolean(data)
}
