'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  fetchLandlordNavGate,
  landlordNavGateQueryKey,
} from '../lib/queries/landlordNavGateQuery'

/** Gate for /nav/notifications (and similar): kommune vs landlord redirect. */
export function useLandlordNavGateQuery() {
  const queryClient = useQueryClient()
  const q = useQuery({
    queryKey: landlordNavGateQueryKey,
    queryFn: () => fetchLandlordNavGate(queryClient),
    staleTime: 60_000,
    gcTime: 10 * 60 * 1000,
  })

  useEffect(() => {
    if (!q.data) return
    if (q.data.kind === 'anon') {
      window.location.replace('/login')
      return
    }
    if (q.data.kind === 'redirect') {
      // Full side-navigasjon: unngår at vi blir stående på «Laster…» hvis App Router-klientnavigasjon ikke fullfører.
      window.location.replace(q.data.href)
    }
  }, [q.data])

  return q
}
