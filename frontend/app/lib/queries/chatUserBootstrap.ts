import type { User } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { mergeKommuneRegionSources } from '../kommuneRegions'
import { fetchLandlordNavGate } from './landlordNavGateQuery'

export const chatUserBootstrapQueryKey = ['chat', 'userBootstrap'] as const

export type ChatUserBootstrap =
  | { kind: 'anon' }
  | { kind: 'redirect'; href: string }
  | {
      kind: 'ok'
      user: User
      role: string
      kommuneCanEdit: boolean
      /** Display string for kommune region(s), same as previous Messages useEffect. */
      myKommuneRegion: string | null
    }

/**
 * Single fetch for /nav/messages: gate + profile + whitelist merge (replaces two useEffects).
 */
export async function fetchChatUserBootstrap(): Promise<ChatUserBootstrap> {
  const gate = await fetchLandlordNavGate()
  if (gate.kind === 'anon') return { kind: 'anon' }
  if (gate.kind === 'redirect') return { kind: 'redirect', href: gate.href }

  const user = gate.user
  const { data: prof } = await supabase
    .from('profiles')
    .select('role, kommune_can_edit, kommune_region')
    .eq('id', user.id)
    .maybeSingle()

  let wlRpc: string | null = null
  let wlTable: string | null = null
  if (user.email) {
    const { data: rpcRegion } = await supabase.rpc('get_whitelist_region_for_email', {
      p_email: user.email,
    })
    wlRpc =
      typeof rpcRegion === 'string'
        ? rpcRegion
        : Array.isArray(rpcRegion) && rpcRegion?.length
          ? String(rpcRegion[0])
          : null
    const { data: whitelistRows } = await supabase
      .from('kommune_access_list')
      .select('region')
      .ilike('email', user.email)
      .eq('is_active', true)
      .limit(1)
    wlTable = whitelistRows?.[0]?.region ?? null
  }

  const merged = mergeKommuneRegionSources(prof?.kommune_region, wlRpc, wlTable)
  const myKommuneRegion = merged.length > 0 ? merged.join(', ') : null
  const role = prof?.role || user.user_metadata?.role || 'homeowner'
  const kommuneCanEdit = prof?.role === 'kommune_admin' || prof?.kommune_can_edit !== false

  return {
    kind: 'ok',
    user,
    role,
    kommuneCanEdit,
    myKommuneRegion,
  }
}
