'use client'

import { useState, useCallback, useRef, type MutableRefObject } from 'react'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { useQueryClient } from '@tanstack/react-query'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import { isKommuneStaffRole } from '@/app/lib/kommuneRoles'
import { landlordOnboardingKey, LANDLORD_ONBOARDING_PREFIX } from '@/app/lib/landlordOnboarding'
import {
  PWA_PROMPT_MANAGE_SESSION_KEY,
  shouldShowPwaPrompt,
} from '@/app/components/PWAInstallPrompt'
import { getLandlordPostLoginHref } from '@/app/lib/landlordNavGate'
import { logError } from '@/app/lib/appLogger'
import type { ListingEventOptInPeriod } from '@/features/listings/types/lanes'
import {
  fetchPublishedEventsWithOptIns,
  publishedEventsQueryKey,
} from '@/features/events/hooks/usePublishedEventsQuery'

export type ListingsOnboardingCallbacks = {
  setPendingPwaBeforeOverview: (v: boolean) => void
  setShowOverviewIntro: (v: boolean) => void
  setShowMineBoligerIntro: (v: boolean) => void
}

type UseLandlordListingsQueryOptions = {
  router: AppRouterInstance
  centralEvents: boolean
  onboardingRef: MutableRefObject<ListingsOnboardingCallbacks | null>
}

export function useLandlordListingsQuery({
  router,
  centralEvents,
  onboardingRef,
}: UseLandlordListingsQueryOptions) {
  const queryClient = useQueryClient()
  const [myListings, setMyListings] = useState<any[]>([])
  const [availability, setAvailability] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<'timeout' | string | null>(null)
  const [eventOptInsByListing, setEventOptInsByListing] = useState<
    Record<string, ListingEventOptInPeriod[]>
  >({})

  const refetch = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const user = await getAuthUserDeduped()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (isKommuneStaffRole(profile?.role)) {
        router.replace('/nav/database')
        return
      }

      const gateHref = await getLandlordPostLoginHref(supabase, user.id, user.email, {
        reuseProfileRole: profile?.role ?? null,
      })
      if (gateHref !== '/homeowner/manage') {
        router.replace(gateHref)
        return
      }

      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (listingsError) throw listingsError
      setMyListings(listingsData || [])

      if (listingsData && listingsData.length > 0) {
        const listingIds = listingsData.map((l) => l.id)
        const { data: availabilityData } = await supabase
          .from('listing_availability')
          .select('*')
          .in('listing_id', listingIds)
          .order('start_date', { ascending: true })

        const availMap: Record<string, any[]> = {}
        availabilityData?.forEach((item) => {
          if (!availMap[item.listing_id]) availMap[item.listing_id] = []
          availMap[item.listing_id].push(item)
        })
        setAvailability(availMap)
      }

      if (listingsData && listingsData.length > 0 && centralEvents) {
        const listingIds = listingsData.map((l) => l.id)
        const { events: published, optIns } = await queryClient.fetchQuery({
          queryKey: publishedEventsQueryKey(listingIds),
          queryFn: () => fetchPublishedEventsWithOptIns(listingIds),
        })
        const eventMeta = new Map(published.map((e) => [e.id, e]))
        const byListing: Record<string, ListingEventOptInPeriod[]> = {}
        optIns
          .filter((row) => row.status === 'active')
          .forEach((row) => {
            const meta = eventMeta.get(row.event_id)
            if (!meta) return
            if (!byListing[row.listing_id]) byListing[row.listing_id] = []
            byListing[row.listing_id].push({
              event_id: row.event_id,
              event_name: meta.name,
              start_date: meta.start_date,
              end_date: meta.end_date,
              status: 'active',
            })
          })
        setEventOptInsByListing(byListing)
      } else {
        setEventOptInsByListing({})
      }

      if (typeof window !== 'undefined') {
        const uid = user.id
        const ovKey = landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.overview, uid)
        const mineKey = landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.mineBoliger, uid)
        const onboarding = onboardingRef.current
        if (!localStorage.getItem(ovKey)) {
          let managePwaDone = false
          try {
            managePwaDone = sessionStorage.getItem(PWA_PROMPT_MANAGE_SESSION_KEY) === '1'
          } catch {
            managePwaDone = false
          }
          if (shouldShowPwaPrompt() && !managePwaDone) {
            onboarding?.setPendingPwaBeforeOverview(true)
          } else {
            onboarding?.setShowOverviewIntro(true)
          }
        } else if (!localStorage.getItem(mineKey) && (listingsData || []).length > 0) {
          onboarding?.setShowMineBoligerIntro(true)
        }
      }
    } catch (err: unknown) {
      logError('Unexpected error:', err)
      setFetchError(err instanceof Error ? err.message : 'error')
    } finally {
      setLoading(false)
    }
  }, [router, centralEvents, onboardingRef, queryClient])

  return {
    myListings,
    setMyListings,
    availability,
    setAvailability,
    eventOptInsByListing,
    setEventOptInsByListing,
    loading,
    setLoading,
    fetchError,
    setFetchError,
    refetch,
  }
}
