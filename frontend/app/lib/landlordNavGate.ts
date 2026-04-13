import type { SupabaseClient } from '@supabase/supabase-js'
import { parseKommuneRegions } from './kommuneRegions'
import { isKommuneStaffRole } from './kommuneRoles'

const RT = encodeURIComponent('/homeowner/manage')

function signTermsHref(city: string): string {
  return `/homeowner/sign-terms?city=${encodeURIComponent(city)}&returnTo=${RT}`
}

/** Har utleier tidligere fullført en signering (BankID / aksept i systemet)? */
async function hasLandlordSignedTermsBefore(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from('user_terms_acceptances')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (!error && (count ?? 0) > 0) return true

  const { data: ua } = await supabase
    .from('user_agreements')
    .select('signed_at')
    .eq('user_id', userId)
    .maybeSingle()
  return !!(ua as { signed_at?: string | null } | null)?.signed_at
}

/** Område/by til signeringssiden (vilkår dokument-valg). */
async function getLandlordSignCity(
  supabase: SupabaseClient,
  userId: string,
  email: string | null | undefined
): Promise<string | null> {
  const { data: l } = await supabase
    .from('listings')
    .select('city')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  const fromListing = l?.city?.trim()
  if (fromListing) return fromListing

  const { data: prof } = await supabase
    .from('profiles')
    .select('kommune_region')
    .eq('id', userId)
    .maybeSingle()
  const regions = parseKommuneRegions(prof?.kommune_region)
  if (regions.length > 0) {
    const raw = regions[0]
    return raw
      .split(/[\s-]+/)
      .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : ''))
      .filter(Boolean)
      .join(' ')
  }

  if (email?.trim()) {
    const { data: rpcRegion } = await supabase.rpc('get_whitelist_region_for_email', {
      p_email: email.trim(),
    })
    const fromRpc =
      typeof rpcRegion === 'string'
        ? rpcRegion
        : Array.isArray(rpcRegion) && rpcRegion?.length
          ? String(rpcRegion[0])
          : null
    if (fromRpc?.trim()) return fromRpc.trim()
    const { data: whitelistRows } = await supabase
      .from('kommune_access_list')
      .select('region')
      .ilike('email', email.trim())
      .eq('is_active', true)
      .limit(1)
    const w = whitelistRows?.[0]?.region?.trim()
    if (w) return w
  }

  return null
}

/**
 * Mål-URL for utleier/kommune etter innlogging når de ikke skal til en spesifikk side.
 * Kommune → boligbank. Aktiv avtale → Mine boliger. Kommunal oppsigelse → egen side.
 * Ellers: registrering (første signering) eller kun signering (har signert før + har region/by).
 */
export async function getLandlordPostLoginHref(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<string> {
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  const role = profile?.role
  if (isKommuneStaffRole(role)) return '/nav/database'

  const { data: ua } = await supabase.from('user_agreements').select('*').eq('user_id', userId).maybeSingle()

  if (ua?.is_terminated && ua?.terminated_by_kommune) {
    return '/homeowner/kommune-terminated'
  }

  if (ua && !ua.is_terminated) {
    return '/homeowner/manage'
  }

  const signedBefore = await hasLandlordSignedTermsBefore(supabase, userId)
  const city = await getLandlordSignCity(supabase, userId, email ?? null)

  if (signedBefore && city) {
    return signTermsHref(city)
  }

  return '/homeowner/register'
}
