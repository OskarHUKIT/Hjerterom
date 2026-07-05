import type { SupabaseClient } from '@supabase/supabase-js'
import { isEventStaffRole } from '@/app/lib/eventStaffRoles'
import { isKommuneStaffRole } from '@/app/lib/kommuneRoles'
import { isLeietakerRole } from '@/app/lib/guestRoles'
import { getLandlordPostLoginHref } from '@/app/lib/landlordNavGate'

function isSafeInternalPath(path: string | null | undefined): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && path !== '/'
}

export type AuthContext = 'landlord' | 'guest'

export type PostLoginOptions = {
  /** Explicit ?next= or ?redirect= target when safe. */
  explicitNext?: string | null
  reuseProfileRole?: string | null
}

/**
 * Role-aware post-login destination. Honors ?next= when present.
 */
export async function resolvePostLoginHref(
  supabase: SupabaseClient,
  userId: string,
  email: string | null | undefined,
  options?: PostLoginOptions
): Promise<string> {
  if (isSafeInternalPath(options?.explicitNext)) {
    return options.explicitNext
  }

  const useCachedRole = options != null && 'reuseProfileRole' in options
  const { data: profile } = useCachedRole
    ? { data: { role: options?.reuseProfileRole ?? undefined } }
    : await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()

  const role = profile?.role

  if (isLeietakerRole(role)) return '/finn/mine'
  if (isKommuneStaffRole(role)) return '/nav/database'
  if (isEventStaffRole(role)) return '/nav/event/database'

  const { data: opsOk } = await supabase.rpc('ops_check_access')
  if (opsOk) return '/ops'

  return getLandlordPostLoginHref(supabase, userId, email ?? null, {
    reuseProfileRole: role,
  })
}

import type { TranslationKey } from '@/lib/translations'

export function friendlyAuthErrorMessage(
  t: (key: TranslationKey) => string,
  error: unknown
): string {
  const err = error as { message?: string; name?: string }
  if (err?.name === 'AuthTimeout' || err?.message === 'AUTH_TIMEOUT') {
    return t('loginAuthNoResponse')
  }
  const raw = (err?.message || '').toLowerCase()
  if (
    raw.includes('email not confirmed') ||
    raw.includes('not confirmed') ||
    raw.includes('email_not_confirmed')
  ) {
    return t('loginEmailNotConfirmed')
  }
  if (raw.includes('invalid login credentials') || raw.includes('invalid_credentials')) {
    return t('authErrorInvalidCredentials')
  }
  if (raw.includes('user already registered') || raw.includes('already registered')) {
    return t('signUpEmailAlreadyRegistered')
  }
  if (raw.includes('failed to fetch') || raw.includes('network')) {
    return t('loginAuthNetworkFailed')
  }
  return t('loginAuthNoResponse')
}
