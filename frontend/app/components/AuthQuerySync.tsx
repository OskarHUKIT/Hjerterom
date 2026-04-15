'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { QK } from '../lib/queries/queryKeys'

const DEBOUNCE_MS = 400

/**
 * Invalidates TanStack Query caches when auth session changes so UI does not show
 * stale role, header counts, or kommune gate after login/logout/switch.
 *
 * - Debounces bursts (e.g. TOKEN_REFRESHED + focus) into one invalidation pass.
 * - `TOKEN_REFRESHED`: light invalidation (header counts, notifications). Same user/JWT rotation.
 * - Other events: full invalidation (login, logout, user metadata updates).
 */
export default function AuthQuerySync() {
  const queryClient = useQueryClient()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const runDebounced = (fn: () => void) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        fn()
      }, DEBOUNCE_MS)
    }

    const invalidateLight = () => {
      void queryClient.invalidateQueries({ queryKey: QK.headerBundle })
      void queryClient.invalidateQueries({ queryKey: QK.notificationsList })
    }

    const invalidateFull = () => {
      void queryClient.invalidateQueries({ queryKey: QK.auth })
      void queryClient.invalidateQueries({ queryKey: QK.kommuneNavAccess })
      void queryClient.invalidateQueries({ queryKey: QK.landlordNavGate })
      void queryClient.invalidateQueries({ queryKey: QK.chatUserBootstrap })
      void queryClient.invalidateQueries({ queryKey: QK.headerBundle })
      void queryClient.invalidateQueries({ queryKey: QK.notificationsList })
      void queryClient.invalidateQueries({ queryKey: QK.appUserProfile })
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION') return

      if (event === 'TOKEN_REFRESHED') {
        runDebounced(invalidateLight)
        return
      }

      runDebounced(invalidateFull)
    })

    return () => {
      subscription.unsubscribe()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [queryClient])

  return null
}
