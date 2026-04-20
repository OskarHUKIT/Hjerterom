import type { SupabaseClient } from '@supabase/supabase-js'

export const HOUSE_RULES_MAX_BYTES = 10 * 1024 * 1024

const LISTINGS_BUCKET = 'listings'

export function buildHouseRulesStoragePath(listingId: string, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() === 'pdf' ? 'pdf' : 'pdf'
  return `house-rules/${listingId}/${crypto.randomUUID()}.${ext}`
}

export function validateHouseRulesFile(file: File): 'ok' | 'type' | 'size' {
  if (file.type !== 'application/pdf') return 'type'
  if (file.size > HOUSE_RULES_MAX_BYTES) return 'size'
  return 'ok'
}

export async function uploadHouseRulesPdf(
  supabase: SupabaseClient,
  listingId: string,
  file: File
): Promise<{ path: string } | { error: string }> {
  const v = validateHouseRulesFile(file)
  if (v === 'type') return { error: 'type' }
  if (v === 'size') return { error: 'size' }
  const path = buildHouseRulesStoragePath(listingId, file)
  const { error } = await supabase.storage
    .from(LISTINGS_BUCKET)
    .upload(path, file, { contentType: 'application/pdf', upsert: false })
  if (error) return { error: error.message }
  return { path }
}

export function getHouseRulesPublicUrl(supabase: SupabaseClient, path: string | null | undefined): string | null {
  if (!path || !String(path).trim()) return null
  const { data } = supabase.storage.from(LISTINGS_BUCKET).getPublicUrl(String(path).trim())
  return data?.publicUrl ?? null
}

export async function removeHouseRulesPdfObject(
  supabase: SupabaseClient,
  path: string | null | undefined
): Promise<void> {
  if (!path || !String(path).trim()) return
  await supabase.storage.from(LISTINGS_BUCKET).remove([String(path).trim()])
}
