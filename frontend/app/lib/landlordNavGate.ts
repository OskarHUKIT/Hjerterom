import type { SupabaseClient } from '@supabase/supabase-js'
import { parseKommuneRegions } from './kommuneRegions'
import { isKommuneStaffRole } from './kommuneRoles'
import { isEventStaffRole } from './eventStaffRoles'
import { isLeietakerRole } from './guestRoles'

const RT = encodeURIComponent('/homeowner/manage')

function signTermsHref(city: string): string {
  return `/homeowner/sign-terms?city=${encodeURIComponent(city)}&returnTo=${RT}`
}

export type LandlordNavGateOptions = {
  /** Når kaller allerede har `profiles.role` – unngå ekstra roundtrip mot `profiles`. */
  reuseProfileRole?: string | null
}

/** Har utleier tidligere fullført en signering (BankID / aksept i systemet)? */
async function hasLandlordSignedTermsBefore(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const [{ count, error }, { data: ua }] = await Promise.all([
    supabase
      .from('user_terms_acceptances')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase.from('user_agreements').select('signed_at').eq('user_id', userId).maybeSingle(),
  ])
  if (!error && (count ?? 0) > 0) return true
  return !!(ua as { signed_at?: string | null } | null)?.signed_at
}

/** Område/by til signeringssiden (vilkår dokument-valg). */
async function getLandlordSignCity(
  supabase: SupabaseClient,
  userId: string,
  email: string | null | undefined
): Promise<string | null> {
  const [{ data: l }, { data: prof }] = await Promise.all([
    supabase
      .from('listings')
      .select('city')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from('profiles').select('kommune_region').eq('id', userId).maybeSingle(),
  ])
  const fromListing = l?.city?.trim()
  if (fromListing) return fromListing

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
    const { data: accessRaw } = await supabase.rpc('get_my_kommune_access')
    const keys = (accessRaw as { region_keys?: string[] } | null)?.region_keys
    if (keys?.[0]?.trim()) return keys[0].trim()
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
  email?: string | null,
  options?: LandlordNavGateOptions
): Promise<string> {
  const useCachedRole = options != null && 'reuseProfileRole' in options
  const profilePromise = useCachedRole
    ? Promise.resolve({
        data: { role: options.reuseProfileRole ?? undefined },
      })
    : supabase.from('profiles').select('role').eq('id', userId).maybeSingle()

  const [{ data: profile }, { data: ua }] = await Promise.all([
    profilePromise,
    supabase.from('user_agreements').select('*').eq('user_id', userId).maybeSingle(),
  ])
  const role = profile?.role
  if (isKommuneStaffRole(role)) return '/nav/database'
  if (isEventStaffRole(role)) return '/nav/event/database'
  if (isLeietakerRole(role)) return '/finn/mine'

  if (ua?.is_terminated && ua?.terminated_by_kommune) {
    return '/homeowner/kommune-terminated'
  }

  if (ua && !ua.is_terminated) {
    return '/homeowner/manage'
  }

  const [signedBefore, city] = await Promise.all([
    hasLandlordSignedTermsBefore(supabase, userId),
    getLandlordSignCity(supabase, userId, email ?? null),
  ])

  if (signedBefore && city) {
    return signTermsHref(city)
  }

  return '/homeowner/register'
}

function isSafeInternalPath(path: string | null | undefined): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && path !== '/'
}

/**
 * Etter auth-callback / e-postbekreftelse: bruk eksplisitt `next` når satt, ellers riktig
 * innlogging-mål (registrering, signering, mine boliger, …).
 */
export async function resolvePostAuthHref(
  supabase: SupabaseClient,
  explicitNext?: string | null
): Promise<string> {
  if (isSafeInternalPath(explicitNext)) return explicitNext
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return '/login'
  return getLandlordPostLoginHref(supabase, user.id, user.email ?? null)
}
