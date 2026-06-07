'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthSession } from '../../context/AuthSessionContext'
import { QK } from '../lib/queries/queryKeys'
import { isKommuneStaffRole } from '../lib/kommuneRoles'

/**
 * Refresher varsel-liste og badge når:
 * - nye varsler insertes for brukeren
 * - delt kommune-hendelse (kommune_notification_events) oppdateres av kollega
 */
export default function NotificationsRealtimeSync() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()
  const [isKommuneStaff, setIsKommuneStaff] = useState(false)

  useEffect(() => {
    const userId = user?.id
    if (!userId) {
      setIsKommuneStaff(false)
      return
    }

    let cancelled = false
    void (async () => {
      const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
      if (!cancelled) setIsKommuneStaff(isKommuneStaffRole(data?.role))
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id])

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
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `owner_id=eq.${userId}`,
        },
        () => invalidate()
      )

    if (isKommuneStaff) {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kommune_notification_events',
        },
        () => invalidate()
      )
    }

    channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user?.id, isKommuneStaff, queryClient])

  return null
}
