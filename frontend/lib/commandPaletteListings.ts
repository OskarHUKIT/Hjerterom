import { supabase } from '@/app/lib/supabase'

export type CommandPaletteListingHit = {
  id: string
  address: string | null
  city: string | null
}

function escapeIlike(term: string): string {
  return term.replace(/[%_\\]/g, '\\$&')
}

/** Lightweight boligbank search — address/city ilike, max 8 rows. */
export async function searchBoligbankListings(
  term: string,
  max = 8
): Promise<CommandPaletteListingHit[]> {
  const q = escapeIlike(term.trim())
  if (!q) return []

  const { data, error } = await supabase
    .from('listings')
    .select('id, address, city')
    .or(`address.ilike.%${q}%,city.ilike.%${q}%`)
    .order('address', { ascending: true })
    .limit(max)

  if (error || !data) return []
  return data as CommandPaletteListingHit[]
}
