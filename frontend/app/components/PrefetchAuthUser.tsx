'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthSession } from '../../context/AuthSessionContext'
import { QK } from '../lib/queries/queryKeys'

/**
 * Seeds `['auth', 'user']` from `AuthSessionProvider` so feature code that reads
 * TanStack Query does not trigger an extra `/auth/v1/user` round trip right after
 * `getSession` / `onAuthStateChange` already populated the session.
 */
export default function PrefetchAuthUser() {
  const { user, isReady } = useAuthSession()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isReady) return
    queryClient.setQueryData(QK.authUser, user ?? null)
  }, [isReady, user, queryClient])

  return null
}
