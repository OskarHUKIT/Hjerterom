'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthSession } from '../../context/AuthSessionContext'
import { QK } from '../lib/queries/queryKeys'

/**
 * Når en kollega markerer varsel som lest/ulest, oppdateres alle rader med samme event_id
 * i databasen — denne lytter på UPDATE for innlogget brukers owner_id og refresher UI.
 */
export default function NotificationsRealtimeSync() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()

  useEffect(() => {
    const userId = user?.id
    if (!userId) return

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: QK.notificationsList })
      void queryClient.invalidateQueries({ queryKey: QK.headerBundle })
    }

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `owner_id=eq.${userId}`,
        },
        () => invalidate()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `owner_id=eq.${userId}`,
        },
        () => invalidate()
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user?.id, queryClient])

  return null
}
