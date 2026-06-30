'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import type { ListingEventOptInPeriod } from '@/features/listings/types/lanes'

/** Published events + active opt-in state for lane calendar overlay. */
export function useListingEventCalendarData(listingId: string | null) {
  const [events, setEvents] = useState<ListingEventOptInPeriod[]>([])
  const [allPublished, setAllPublished] = useState<ListingEventOptInPeriod[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!listingId) {
      setEvents([])
      setAllPublished([])
      return
    }
    let cancelled = false
    void (async () => {
      setLoading(true)
      const [{ data: published }, { data: optIns }] = await Promise.all([
        supabase
          .from('central_events')
          .select('id, name, start_date, end_date')
          .eq('status', 'published')
          .order('start_date', { ascending: true }),
        supabase
          .from('listing_event_availability')
          .select('event_id, status, available_from, available_to')
          .eq('listing_id', listingId),
      ])
      if (cancelled) return

      const optMap = new Map((optIns ?? []).map((o) => [o.event_id, o]))
      const publishedRows: ListingEventOptInPeriod[] = (published ?? []).map((e) => ({
        event_id: e.id,
        event_name: e.name,
        start_date: e.start_date,
        end_date: e.end_date,
        status: optMap.get(e.id)?.status === 'active' ? 'active' : 'inactive',
      }))
      setAllPublished(publishedRows)
      setEvents(publishedRows.filter((e) => e.status === 'active'))
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [listingId])

  const refresh = async () => {
    if (!listingId) return
    const [{ data: published }, { data: optIns }] = await Promise.all([
      supabase
        .from('central_events')
        .select('id, name, start_date, end_date')
        .eq('status', 'published')
        .order('start_date', { ascending: true }),
      supabase
        .from('listing_event_availability')
        .select('event_id, status')
        .eq('listing_id', listingId),
    ])
    const optMap = new Map((optIns ?? []).map((o) => [o.event_id, o]))
    const publishedRows: ListingEventOptInPeriod[] = (published ?? []).map((e) => ({
      event_id: e.id,
      event_name: e.name,
      start_date: e.start_date,
      end_date: e.end_date,
      status: optMap.get(e.id)?.status === 'active' ? 'active' : 'inactive',
    }))
    setAllPublished(publishedRows)
    setEvents(publishedRows.filter((e) => e.status === 'active'))
  }

  return { activeOptIns: events, allPublished, loading, refresh }
}
