'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

export type TourismAvailabilityPeriod = {
  start_date: string
  end_date: string
  status: string
}

export type TourismBlockedRange = {
  check_in: string
  check_out: string
}

export type TourismCalendarData = {
  periods: TourismAvailabilityPeriod[]
  blockedRanges: TourismBlockedRange[]
  bookingsFetchFailed: boolean
  loading: boolean
}

export function useTourismListingCalendarData(listingId: string): TourismCalendarData {
  const [periods, setPeriods] = useState<TourismAvailabilityPeriod[]>([])
  const [blockedRanges, setBlockedRanges] = useState<TourismBlockedRange[]>([])
  const [bookingsFetchFailed, setBookingsFetchFailed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setBookingsFetchFailed(false)

      const [availResult, blockedResult] = await Promise.all([
        supabase.rpc('get_tourism_availability', { p_listing_id: listingId }),
        supabase.rpc('get_tourism_blocked_dates', { p_listing_id: listingId }),
      ])

      if (cancelled) return

      setPeriods((availResult.data ?? []) as TourismAvailabilityPeriod[])

      if (blockedResult.error) {
        setBookingsFetchFailed(true)
        setBlockedRanges([])
      } else {
        setBlockedRanges((blockedResult.data ?? []) as TourismBlockedRange[])
      }

      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [listingId])

  return { periods, blockedRanges, bookingsFetchFailed, loading }
}
