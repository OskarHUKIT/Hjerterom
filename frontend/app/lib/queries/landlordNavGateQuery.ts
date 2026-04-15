import type { User } from '@supabase/supabase-js'
import type { QueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { isKommuneStaffRole } from '../kommuneRoles'
import { getLandlordPostLoginHref } from '../landlordNavGate'
import { fetchAuthUserForQueryClient } from './authUserQuery'

export const landlordNavGateQueryKey = ['landlord', 'navGate'] as const

export type LandlordNavGateResult =
  | { kind: 'anon' }
  | { kind: 'redirect'; href: string; user: User }
  | { kind: 'ready'; mode: 'kommune' | 'landlord'; user: User }

/**
 * Lightweight gate used by /nav/notifications and as part of chat bootstrap.
 * Avoids duplicate getUser + profile role + getLandlordPostLoginHref chains.
 */
export async function fetchLandlordNavGate(qc: QueryClient): Promise<LandlordNavGateResult> {
  const user = await fetchAuthUserForQueryClient(qc)
  if (!user) return { kind: 'anon' }

  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const r = prof?.role || user.user_metadata?.role
  if (isKommuneStaffRole(r)) {
    return { kind: 'ready', mode: 'kommune', user }
  }

  const href = await getLandlordPostLoginHref(supabase, user.id, user.email, {
    reuseProfileRole: r ?? null,
  })
  if (href !== '/homeowner/manage') {
    return { kind: 'redirect', href, user }
  }
  return { kind: 'ready', mode: 'landlord', user }
}
