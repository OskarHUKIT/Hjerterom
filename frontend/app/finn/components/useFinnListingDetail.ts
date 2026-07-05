'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import type { FinnListingDetail, FinnListingEventContext } from './finnListingTypes'

export function useFinnListingDetail(id: string | undefined, eventId: string | null) {
  const [listing, setListing] = useState<FinnListingDetail | null>(null)
  const [eventContext, setEventContext] = useState<FinnListingEventContext | null>(null)
  const [eventOptInOk, setEventOptInOk] = useState(true)
  const [loading, setLoading] = useState(true)
  const [reviewSummary, setReviewSummary] = useState<{ count: number; avg_rating: number } | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      const { data } = await supabase
        .from('listings')
        .select(
          'id, address, city, description, tourism_nightly_price_cents, tourism_instant_book, cancellation_policy, image_url, image_urls, image_alts, type, beds, tourism_enabled, map_lat, map_lng'
        )
        .eq('id', id)
        .eq('tourism_enabled', true)
        .maybeSingle()

      if (cancelled) return
      if (!data) {
        setListing(null)
        setLoading(false)
        return
      }
      setListing(data as FinnListingDetail)
      const { data: rev } = await supabase.rpc('get_listing_review_summary', { p_listing_id: id })
      if (!cancelled && rev && typeof rev === 'object') {
        const r = rev as { count?: number; avg_rating?: number }
        if ((r.count ?? 0) > 0) setReviewSummary({ count: r.count ?? 0, avg_rating: Number(r.avg_rating ?? 0) })
      }

      if (eventId) {
        const { data: eventRow } = await supabase
          .from('central_events')
          .select('id, slug, name, routing_mode, status')
          .eq('id', eventId)
          .eq('status', 'published')
          .maybeSingle()

        if (!cancelled && eventRow) {
          setEventContext(eventRow as FinnListingEventContext)
          const { data: optIn } = await supabase
            .from('listing_event_availability')
            .select('id')
            .eq('event_id', eventId)
            .eq('listing_id', id)
            .eq('status', 'active')
            .maybeSingle()
          setEventOptInOk(Boolean(optIn))
        } else if (!cancelled) {
          setEventContext(null)
          setEventOptInOk(false)
        }
      } else {
        setEventContext(null)
        setEventOptInOk(true)
      }

      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [id, eventId])

  return { listing, eventContext, eventOptInOk, loading, reviewSummary }
}
