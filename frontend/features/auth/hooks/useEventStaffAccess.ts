'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  eventStaffAccessQueryKey,
  fetchEventStaffAccess,
  type EventStaffAccess,
} from '@/app/lib/queries/eventStaffAccess'

const staleMs = 2 * 60 * 1000

type UseEventStaffAccessOptions = {
  enabled?: boolean
  /** When set, unauthenticated users are sent to `/login?redirect=…`. */
  loginRedirect?: string
  /** When true, forbidden users are sent to `/`. */
  redirectForbidden?: boolean
}

export function useEventStaffAccess(options: UseEventStaffAccessOptions = {}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { enabled = true, loginRedirect, redirectForbidden = false } = options

  const q = useQuery<EventStaffAccess, Error>({
    queryKey: eventStaffAccessQueryKey,
    queryFn: () => fetchEventStaffAccess(queryClient),
    staleTime: staleMs,
    gcTime: 10 * 60 * 1000,
    enabled,
  })

  useEffect(() => {
    if (!loginRedirect || q.data?.kind !== 'unauthenticated') return
    router.replace(`/login?redirect=${encodeURIComponent(loginRedirect)}`)
  }, [q.data, loginRedirect, router])

  useEffect(() => {
    if (!redirectForbidden || q.data?.kind !== 'forbidden') return
    router.replace('/')
  }, [q.data, redirectForbidden, router])

  return q
}
