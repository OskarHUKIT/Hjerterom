import { supabase } from '@/app/lib/supabase'
import type { AvailabilityConflictResult } from '../types/lanes'

export async function checkAvailabilityConflict(
  listingId: string,
  startDate: string,
  endDate: string,
  excludeAvailabilityId?: string | null
): Promise<AvailabilityConflictResult> {
  const { data, error } = await supabase.rpc('check_listing_availability_conflict', {
    p_listing_id: listingId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_exclude_availability_id: excludeAvailabilityId ?? null,
  })

  if (error) {
    throw error
  }

  return (data ?? { ok: false, reason: 'overlap' }) as AvailabilityConflictResult
}
