import type { QueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { fetchAuthUserForQueryClient } from './authUserQuery'

export const kommuneNavAccessQueryKey = ['kommune', 'navAccess'] as const

export type KommuneNavAccess =
  | { kind: 'unauthenticated' }
  | { kind: 'forbidden' }
  | {
      kind: 'ok'
      userId: string
      userRole: string
      kommuneCanEdit: boolean
      kommuneRegion: string | string[] | null
    }

/**
 * Single gate + region resolution for kommune /nav/* pages. Cached via TanStack Query
 * so /nav/database ↔ /nav/expired do not duplicate getUser + profiles + RPC.
 */
export async function fetchKommuneNavAccess(qc: QueryClient): Promise<KommuneNavAccess> {
  const user = await fetchAuthUserForQueryClient(qc)
  if (!user) return { kind: 'unauthenticated' }

  const role = user.user_metadata?.role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, kommune_can_edit, kommune_region')
    .eq('id', user.id)
    .maybeSingle()

  const kr =
    role === 'kommune_ansatt' ||
    profile?.role === 'kommune_ansatt' ||
    role === 'kommune_admin' ||
    profile?.role === 'kommune_admin'

  if (!kr) return { kind: 'forbidden' }

  const userRole = profile?.role || role || 'kommune_ansatt'
  const kommuneCanEdit = profile?.role === 'kommune_admin' || profile?.kommune_can_edit !== false

  let region: string | string[] | null = profile?.kommune_region ?? null
  if ((region == null || String(region).trim() === '') && user.email) {
    const [rpcRes, tableRes] = await Promise.all([
      supabase.rpc('get_whitelist_region_for_email', {
        p_email: user.email,
      }),
      supabase
        .from('kommune_access_list')
        .select('region')
        .ilike('email', user.email)
        .eq('is_active', true)
        .limit(1),
    ])
    const fromRpc =
      typeof rpcRes.data === 'string'
        ? rpcRes.data
        : Array.isArray(rpcRes.data) && rpcRes.data?.length
          ? rpcRes.data[0]
          : null
    const fromTable = tableRes.data?.[0]?.region
    if (fromRpc && String(fromRpc).trim()) {
      region = fromRpc
    } else if (fromTable && String(fromTable).trim()) {
      region = fromTable
    }
  }

  return {
    kind: 'ok',
    userId: user.id,
    userRole,
    kommuneCanEdit,
    kommuneRegion: region || null,
  }
}
