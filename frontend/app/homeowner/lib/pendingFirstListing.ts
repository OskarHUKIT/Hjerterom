import { supabase } from '../../lib/supabase'

export const PENDING_FIRST_LISTING_KEY = 'boly_pending_first_listing_v1'
/** Satt når bruker sendes til BankID med utkast — brukes til å oppdage mistet sessionStorage etter signering. */
export const EXPECT_PENDING_LISTING_AFTER_SIGN_KEY = 'boly_expect_pending_listing_v1'

export type PendingFirstListingDraftV1 = {
  v: 1
  /** Felter som sendes til listings.insert (uten owner_id) */
  row: Record<string, unknown>
}

export function readPendingFirstListingDraft(): PendingFirstListingDraftV1 | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(PENDING_FIRST_LISTING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingFirstListingDraftV1
    if (parsed?.v !== 1 || !parsed.row || typeof parsed.row !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export function clearPendingFirstListingDraft(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(PENDING_FIRST_LISTING_KEY)
    sessionStorage.removeItem(EXPECT_PENDING_LISTING_AFTER_SIGN_KEY)
  } catch {
    /* ignore */
  }
}

export function savePendingFirstListingDraft(row: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  const draft: PendingFirstListingDraftV1 = { v: 1, row }
  sessionStorage.setItem(PENDING_FIRST_LISTING_KEY, JSON.stringify(draft))
  try {
    sessionStorage.setItem(EXPECT_PENDING_LISTING_AFTER_SIGN_KEY, '1')
  } catch {
    /* ignore */
  }
}

/**
 * Fullfør første bolig etter BankID-signering (kalles fra sign-terms når signed=true).
 */
export async function insertListingFromPendingDraft(
  userId: string
): Promise<{ listingId: string } | null> {
  const draft = readPendingFirstListingDraft()
  if (!draft) return null

  const { data, error } = await supabase
    .from('listings')
    .insert([{ ...draft.row, owner_id: userId }])
    .select('id')
    .single()

  if (error) {
    const msg = [error.message, error.details, error.hint].filter(Boolean).join(' · ')
    throw new Error(msg || JSON.stringify(error))
  }

  const listingId = data?.id
  if (!listingId) {
    throw new Error('Kunne ikke hente ID for den nye boligen.')
  }

  const row = draft.row as {
    address?: string
    city?: string
    postal_code?: string | null
  }

  await supabase.from('audit_logs').insert([
    {
      user_id: userId,
      action_type: 'CREATE_LISTING',
      listing_id: listingId,
      listing_address: row.address,
      details: {
        address: row.address,
        city: row.city,
        postal_code: row.postal_code ?? null,
        has_insurance_accepted: true,
        from_pending_after_terms_sign: true,
      },
    },
  ])

  const { data: userData } = await supabase.auth.getUser()
  const userName =
    userData.user?.user_metadata?.full_name || userData.user?.email?.split('@')[0] || 'En utleier'

  const { data: kommuneProfiles } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['kommune_ansatt', 'kommune_admin'])

  const rows = (kommuneProfiles || []).map((p: { id: string }) => ({
    listing_id: listingId,
    owner_id: p.id,
    type: 'NEW_LISTING',
    title: 'Ny bolig registrert',
    message: `${userName} har registrert en ny bolig i ${row.city ?? ''}: ${row.address ?? ''}`,
    municipality: row.city,
  }))

  if (rows.length > 0) {
    await supabase.from('notifications').insert(rows)
  }

  clearPendingFirstListingDraft()
  return { listingId }
}
