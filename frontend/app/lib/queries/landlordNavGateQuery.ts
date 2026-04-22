import type { User } from '@supabase/supabase-js'
import type { QueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { isKommuneStaffRole } from '../kommuneRoles'
import { getLandlordPostLoginHref } from '../landlordNavGate'
import { fetchAuthUserForQueryClient } from './authUserQuery'

export const landlordNavGateQueryKey = ['landlord', 'navGate'] as const

/** One `profiles` row for gate + chat/notifications consumers (avoids duplicate profile RTT). */
export type LandlordNavGateProfile = {
  role: string | null
  kommune_can_edit: boolean | null
  kommune_region: string | null
  email_notifications_enabled: boolean | null
}

export type LandlordNavGateResult =
  | { kind: 'anon' }
  | { kind: 'redirect'; href: string; user: User }
  | { kind: 'ready'; mode: 'kommune' | 'landlord'; user: User; profile: LandlordNavGateProfile | null }

/**
 * Lightweight gate used by /nav/notifications and as part of chat bootstrap.
 * Avoids duplicate getUser + profile role + getLandlordPostLoginHref chains.
 */
export async function fetchLandlordNavGate(qc: QueryClient): Promise<LandlordNavGateResult> {
  const user = await fetchAuthUserForQueryClient(qc)
  if (!user) return { kind: 'anon' }

  const { data: prof } = await supabase
    .from('profiles')
    .select('role, kommune_can_edit, kommune_region, email_notifications_enabled')
    .eq('id', user.id)
    .maybeSingle()

  const profile: LandlordNavGateProfile | null = prof
    ? {
        role: prof.role ?? null,
        kommune_can_edit: prof.kommune_can_edit ?? null,
        kommune_region: prof.kommune_region ?? null,
        email_notifications_enabled: prof.email_notifications_enabled ?? null,
      }
    : null

  const r = profile?.role || user.user_metadata?.role
  if (isKommuneStaffRole(r)) {
    return { kind: 'ready', mode: 'kommune', user, profile }
  }

  const href = await getLandlordPostLoginHref(supabase, user.id, user.email, {
    reuseProfileRole: r ?? null,
  })
  if (href !== '/homeowner/manage') {
    return { kind: 'redirect', href, user }
  }
  return { kind: 'ready', mode: 'landlord', user, profile }
}
