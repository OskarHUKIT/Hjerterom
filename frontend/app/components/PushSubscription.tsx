'use client'

import { useEffect } from 'react'
import { getAuthUserDeduped } from '../lib/supabase'
import { savePushSubscription } from '../lib/push-utils'

export default function PushSubscription() {
  useEffect(() => {
    let cancelled = false

    async function syncExisting() {
      if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window)
      )
        return

      const user = await getAuthUserDeduped()
      if (!user || cancelled) return

      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        await reg.update()
        const existing = await reg.pushManager.getSubscription()
        if (existing && !cancelled) await savePushSubscription(user.id, existing)
      } catch {
        // ignore
      }
    }

    syncExisting()
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
