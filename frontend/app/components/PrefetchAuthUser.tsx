'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthSession } from '../../context/AuthSessionContext'
import { fetchAuthUserForQueryClient } from '../lib/queries/authUserQuery'

/**
 * Warms `['auth', 'user']` as soon as the cookie session is known so later
 * chunks (messages, notifications) reuse one cached `getUser` instead of a second round trip.
 */
export default function PrefetchAuthUser() {
  const { user, isReady } = useAuthSession()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isReady || !user?.id) return
    void fetchAuthUserForQueryClient(queryClient)
  }, [isReady, user?.id, queryClient])

  return null
}
