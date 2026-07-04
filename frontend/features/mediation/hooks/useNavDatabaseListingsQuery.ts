import { useQuery } from '@tanstack/react-query'
import { QK } from '@/app/lib/queries/queryKeys'
import {
  fetchNavDatabaseListings,
  type FetchNavDatabaseListingsParams,
  type NavDatabaseListingsPayload,
} from '@/features/mediation/lib/navDatabaseFetch'

export type { NavDatabaseListingsPayload }

export type NavDatabaseListingsQueryParams = FetchNavDatabaseListingsParams & {
  enabled: boolean
  /** Included in cache key so kommune region changes bust stale empty cache. */
  kommuneRegion: string | null
}

/** React Query cache key for Boligbank listing lists (filters + view). */
export function navDatabaseListingsQueryKey(params: Record<string, unknown>) {
  return [...QK.navDatabaseListings, params] as const
}

export function useNavDatabaseListingsQuery(params: NavDatabaseListingsQueryParams) {
  const { enabled, kommuneRegion, ...fetchParams } = params

  return useQuery({
    queryKey: navDatabaseListingsQueryKey({ ...fetchParams, kommuneRegion }),
    queryFn: () => fetchNavDatabaseListings(fetchParams),
    enabled,
    staleTime: 30_000,
  })
}
