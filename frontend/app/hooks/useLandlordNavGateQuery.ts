'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  fetchLandlordNavGate,
  landlordNavGateQueryKey,
} from '../lib/queries/landlordNavGateQuery'

/** Gate for /nav/notifications (and similar): kommune vs landlord redirect. */
export function useLandlordNavGateQuery() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const q = useQuery({
    queryKey: landlordNavGateQueryKey,
    queryFn: () => fetchLandlordNavGate(queryClient),
    staleTime: 60_000,
    gcTime: 10 * 60 * 1000,
  })

  useEffect(() => {
    if (!q.data) return
    if (q.data.kind === 'anon') router.replace('/login')
    else if (q.data.kind === 'redirect') router.replace(q.data.href)
  }, [q.data, router])

  return q
}
