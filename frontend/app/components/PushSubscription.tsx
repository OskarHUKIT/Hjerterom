'use client'

import { useEffect } from 'react'
import { getAuthUserDeduped } from '../lib/supabase'
import { ensurePushSubscription, isPushSupported, savePushSubscription } from '../lib/push-utils'
import { devWarn } from '@/app/lib/appLogger'

export default function PushSubscription() {
  useEffect(() => {
    let cancelled = false

    async function syncExisting() {
      if (!isPushSupported()) return

      const user = await getAuthUserDeduped()
      if (!user || cancelled) return

      try {
        if (Notification.permission === 'granted') {
          const result = await ensurePushSubscription(user.id)
          if (!result.ok && result.reason === 'error') {
            devWarn(`[push] auto-sync failed: ${result.error ?? 'unknown'}`)
          }
          return
        }

        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        await reg.update()
        const existing = await reg.pushManager?.getSubscription()
        if (existing && !cancelled) await savePushSubscription(user.id, existing)
      } catch (e) {
        devWarn(`[push] sync failed: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    syncExisting()
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
