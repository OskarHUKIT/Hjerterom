'use client'

import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ListingEventOptInPeriod } from '@/features/listings/types/lanes'
import {
  publishedEventsQueryKey,
  usePublishedEventsQuery,
} from '@/features/events/hooks/usePublishedEventsQuery'

function toOptInPeriods(
  events: Array<{ id: string; name: string; start_date: string; end_date: string }>,
  optIns: Array<{ event_id: string; status: string }>
): ListingEventOptInPeriod[] {
  const optMap = new Map(optIns.map((o) => [o.event_id, o]))
  return events.map((e) => ({
    event_id: e.id,
    event_name: e.name,
    start_date: e.start_date,
    end_date: e.end_date,
    status: optMap.get(e.id)?.status === 'active' ? 'active' : 'inactive',
  }))
}

/** Published events + active opt-in state for lane calendar overlay. */
export function useListingEventCalendarData(listingId: string | null) {
  const queryClient = useQueryClient()
  const listingIds = listingId ? [listingId] : []
  const { data, isLoading } = usePublishedEventsQuery(listingIds, { enabled: !!listingId })

  const allPublished = useMemo(
    () => toOptInPeriods(data?.events ?? [], data?.optIns ?? []),
    [data?.events, data?.optIns]
  )
  const activeOptIns = useMemo(
    () => allPublished.filter((e) => e.status === 'active'),
    [allPublished]
  )

  const refresh = async () => {
    if (!listingId) return
    await queryClient.invalidateQueries({ queryKey: publishedEventsQueryKey([listingId]) })
  }

  return { activeOptIns, allPublished, loading: isLoading, refresh }
}
