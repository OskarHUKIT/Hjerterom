'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  fetchKommuneNavAccess,
  kommuneNavAccessQueryKey,
  type KommuneNavAccess,
} from '../lib/queries/kommuneNavAccess'

const staleMs = 2 * 60 * 1000

export function useKommuneNavAccess(options?: { redirectUnauthenticated?: boolean }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const redirectUnauthenticated = options?.redirectUnauthenticated !== false

  const q = useQuery<KommuneNavAccess, Error>({
    queryKey: kommuneNavAccessQueryKey,
    queryFn: () => fetchKommuneNavAccess(queryClient),
    staleTime: staleMs,
    gcTime: 10 * 60 * 1000,
  })

  useEffect(() => {
    if (!redirectUnauthenticated || q.data?.kind !== 'unauthenticated') return
    router.replace('/login')
  }, [q.data, redirectUnauthenticated, router])

  return q
}
