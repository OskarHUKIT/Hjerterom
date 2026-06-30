import { useQuery } from '@tanstack/react-query'
import type { ListingAvailabilityRow, NavDatabaseListingRow } from '@/app/lib/listingUiTypes'
import { QK } from '@/app/lib/queries/queryKeys'

export type NavDatabaseListingsPayload = {
  listings: NavDatabaseListingRow[]
  availability: Record<string, ListingAvailabilityRow[]>
}

/** React Query cache key for Boligbank listing lists (filters + view). */
export function navDatabaseListingsQueryKey(params: Record<string, unknown>) {
  return [...QK.navDatabaseListings, params] as const
}

/**
 * Thin wrapper — NavDatabasePage still owns fetch logic; this hook enables
 * imperative cache invalidation via queryClient.invalidateQueries({ queryKey: QK.navDatabaseListings }).
 */
export function useNavDatabaseListingsPlaceholder(enabled: boolean) {
  return useQuery<NavDatabaseListingsPayload>({
    queryKey: navDatabaseListingsQueryKey({ placeholder: true }),
    queryFn: async () => ({ listings: [], availability: {} }),
    enabled: false,
    staleTime: 30_000,
  })
}
