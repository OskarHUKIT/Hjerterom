'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/app/lib/supabase'
import { QK } from '@/app/lib/queries/queryKeys'

export type PublishedCentralEvent = {
  id: string
  name: string
  start_date: string
  end_date: string
  arrangement_tag: string | null
}

export type ListingEventAvailabilityRow = {
  listing_id: string
  event_id: string
  status: string
  available_from: string | null
  available_to: string | null
}

export type PublishedEventsPayload = {
  events: PublishedCentralEvent[]
  optIns: ListingEventAvailabilityRow[]
}

/** Stable React Query key for published events + opt-ins for the given listings. */
export function publishedEventsQueryKey(listingIds: string[]) {
  const sorted = [...listingIds].sort()
  return [...QK.publishedEvents, sorted] as const
}

/** Shared fetch for central_events (published) and listing_event_availability. */
export async function fetchPublishedEventsWithOptIns(
  listingIds: string[]
): Promise<PublishedEventsPayload> {
  const eventsQuery = supabase
    .from('central_events')
    .select('id, name, start_date, end_date, arrangement_tag')
    .eq('status', 'published')
    .order('start_date', { ascending: true })

  if (listingIds.length === 0) {
    const { data: events, error } = await eventsQuery
    if (error) throw error
    return { events: (events ?? []) as PublishedCentralEvent[], optIns: [] }
  }

  const [{ data: events, error: eventsError }, { data: optIns, error: optInsError }] =
    await Promise.all([
      eventsQuery,
      supabase
        .from('listing_event_availability')
        .select('listing_id, event_id, status, available_from, available_to')
        .in('listing_id', listingIds),
    ])

  if (eventsError) throw eventsError
  if (optInsError) throw optInsError

  return {
    events: (events ?? []) as PublishedCentralEvent[],
    optIns: (optIns ?? []) as ListingEventAvailabilityRow[],
  }
}

type UsePublishedEventsQueryOptions = {
  enabled?: boolean
}

/** Central React Query hook for published events and listing opt-in rows. */
export function usePublishedEventsQuery(
  listingIds: string[],
  options: UsePublishedEventsQueryOptions = {}
) {
  const { enabled = true } = options

  return useQuery({
    queryKey: publishedEventsQueryKey(listingIds),
    queryFn: () => fetchPublishedEventsWithOptIns(listingIds),
    enabled: enabled && listingIds.length > 0,
    staleTime: 60_000,
  })
}
