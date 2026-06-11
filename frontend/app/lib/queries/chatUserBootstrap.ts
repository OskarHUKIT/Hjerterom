import type { User } from '@supabase/supabase-js'
import type { QueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
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
      /** Region keys from grants (display / colleague overlap). */
      myKommuneRegion: string | null
      myKommuneIds: string[]
      myServiceAreaIds: string[]
    }

type MyKommuneAccess = {
  kommune_ids?: string[]
  region_keys?: string[]
  service_area_ids?: string[]
}

/**
 * Single fetch for /nav/messages: gate + profile + grant-based region resolution.
 */
export async function fetchChatUserBootstrap(qc: QueryClient): Promise<ChatUserBootstrap> {
  const gate = await fetchLandlordNavGate(qc)
  if (gate.kind === 'anon') return { kind: 'anon' }
  if (gate.kind === 'redirect') return { kind: 'redirect', href: gate.href }

  const user = gate.user
  const prof = gate.profile

  const { data: accessRaw } = await supabase.rpc('get_my_kommune_access')
  const access = (accessRaw ?? {}) as MyKommuneAccess
  const regionKeys = (access.region_keys ?? []).filter(Boolean)
  const myKommuneRegion = regionKeys.length > 0 ? regionKeys.join(', ') : null
  const role = prof?.role || user.user_metadata?.role || 'homeowner'
  const kommuneCanEdit = prof?.role === 'kommune_admin' || prof?.kommune_can_edit !== false

  return {
    kind: 'ok',
    user,
    role,
    kommuneCanEdit,
    myKommuneRegion,
    myKommuneIds: (access.kommune_ids ?? []).filter(Boolean),
    myServiceAreaIds: (access.service_area_ids ?? []).filter(Boolean),
  }
}
