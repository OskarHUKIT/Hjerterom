'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { fetchOpsAccess, opsAccessQueryKey, type OpsAccess } from '../lib/queries/opsAccess'

const staleMs = 2 * 60 * 1000

export function useOpsAccess(options?: { redirectUnauthenticated?: boolean; enabled?: boolean }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const redirectUnauthenticated = options?.redirectUnauthenticated !== false
  const enabled = options?.enabled !== false

  const q = useQuery<OpsAccess, Error>({
    queryKey: opsAccessQueryKey,
    queryFn: () => fetchOpsAccess(queryClient),
    staleTime: staleMs,
    gcTime: 10 * 60 * 1000,
    enabled,
  })

  useEffect(() => {
    if (!enabled || !redirectUnauthenticated) return
    if (q.data?.kind === 'unauthenticated') {
      router.replace('/login?redirect=/ops')
      return
    }
    if (q.data?.kind === 'forbidden') {
      router.replace('/')
    }
  }, [enabled, q.data, redirectUnauthenticated, router])

  return q
}
