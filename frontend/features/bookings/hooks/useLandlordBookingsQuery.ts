'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/app/lib/supabase'
import { QK } from '@/app/lib/queries/queryKeys'
import type { LandlordBookingRow } from '@/features/bookings/lib/landlordBookings'

type LandlordBookingsPayload = {
  bookings: LandlordBookingRow[]
}

async function fetchLandlordBookings(): Promise<LandlordBookingsPayload> {
  const res = await fetch('/api/homeowner/bookings', { cache: 'no-store' })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `HTTP ${res.status}`)
  }
  return (await res.json()) as LandlordBookingsPayload
}

export function useLandlordBookingsQuery(listingIds: string[]) {
  const queryClient = useQueryClient()
  const listingKey = listingIds.join(',')

  const query = useQuery({
    queryKey: [...QK.landlordBookings, listingKey],
    queryFn: fetchLandlordBookings,
    enabled: listingIds.length > 0,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (listingIds.length === 0) return

    const channel = supabase
      .channel(`landlord-bookings-${listingKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          const row = payload.new as { listing_id?: string } | null
          if (row?.listing_id && listingIds.includes(row.listing_id)) {
            void queryClient.invalidateQueries({ queryKey: QK.landlordBookings })
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [listingIds, listingKey, queryClient])

  return query
}
