'use client'

import { useCallback, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import type { ListingLane } from '@/features/listings/types/lanes'
import { checkAvailabilityConflict } from '@/features/listings/lib/availabilityConflict'

export type ListingAvailabilityPeriod = {
  id: string
  listing_id: string
  start_date: string
  end_date: string
  status: string
  lane?: string | null
}

type AddPeriodInput = {
  listingId: string
  start: string
  end: string
  status: 'Tilgjengelig' | 'Utilgjengelig' | 'Formidla'
  lane?: ListingLane
}

type UseListingAvailabilityOptions = {
  onConflict?: (message: string) => void
  onError?: (message: string) => void
}

/**
 * Shared availability CRUD for utleier manage and listing detail flows.
 */
export function useListingAvailability(
  availability: Record<string, ListingAvailabilityPeriod[]>,
  setAvailability: React.Dispatch<React.SetStateAction<Record<string, ListingAvailabilityPeriod[]>>>,
  options: UseListingAvailabilityOptions = {}
) {
  const [busy, setBusy] = useState(false)

  const addPeriod = useCallback(
    async (input: AddPeriodInput) => {
      const { listingId, start, end, status, lane = 'sosial' } = input
      const effectiveLane = status === 'Formidla' ? 'sosial' : lane
      if (!start || !end) return { ok: false as const, reason: 'missing_dates' as const }
      if (new Date(end) < new Date(start)) {
        return { ok: false as const, reason: 'end_before_start' as const }
      }

      const conflict = await checkAvailabilityConflict(listingId, start, end)
      if (!conflict.ok) {
        options.onConflict?.(conflict.reason ?? '')
        return { ok: false as const, reason: 'conflict' as const }
      }

      setBusy(true)
      try {
        const { data, error } = await supabase
          .from('listing_availability')
          .insert([
            {
              listing_id: listingId,
              start_date: start,
              end_date: end,
              status,
              lane: effectiveLane,
            },
          ])
          .select()
          .single()
        if (error) throw error
        if (data) {
          setAvailability((prev) => ({
            ...prev,
            [listingId]: [...(prev[listingId] ?? []), data as ListingAvailabilityPeriod],
          }))
        }
        return { ok: true as const }
      } catch (err) {
        options.onError?.(err instanceof Error ? err.message : String(err))
        return { ok: false as const, reason: 'error' as const }
      } finally {
        setBusy(false)
      }
    },
    [availability, options, setAvailability]
  )

  const deletePeriod = useCallback(
    async (periodId: string, listingId: string) => {
      setBusy(true)
      try {
        const { error } = await supabase.from('listing_availability').delete().eq('id', periodId)
        if (error) throw error
        setAvailability((prev) => ({
          ...prev,
          [listingId]: (prev[listingId] ?? []).filter((p) => p.id !== periodId),
        }))
        return { ok: true as const }
      } catch (err) {
        options.onError?.(err instanceof Error ? err.message : String(err))
        return { ok: false as const }
      } finally {
        setBusy(false)
      }
    },
    [options, setAvailability]
  )

  return { addPeriod, deletePeriod, busy }
}
