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
      kommuneIds: string[]
      serviceAreaIds: string[]
    }

type MyKommuneAccess = {
  kommune_ids?: string[]
  region_keys?: string[]
  service_area_ids?: string[]
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

  const { data: accessRaw } = await supabase.rpc('get_my_kommune_access')
  const access = (accessRaw ?? {}) as MyKommuneAccess
  const regionKeys = (access.region_keys ?? []).filter(Boolean)
  const kommuneIds = (access.kommune_ids ?? []).filter(Boolean)
  const serviceAreaIds = (access.service_area_ids ?? []).filter(Boolean)

  let region: string | string[] | null =
    regionKeys.length > 0 ? regionKeys : profile?.kommune_region ?? null

  return {
    kind: 'ok',
    userId: user.id,
    userRole,
    kommuneCanEdit,
    kommuneRegion: region || null,
    kommuneIds,
    serviceAreaIds,
  }
}
