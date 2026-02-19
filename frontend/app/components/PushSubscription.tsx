'use client'

import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BGJpQlyCiUmWuqwKMIf8Tc4eX9vUAT6_HxebrntxaXr638Rf72rYxo9IFrN_e6uY2JTiQlyTWN6t7f_WMgcUnX0'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export default function PushSubscription() {
  useEffect(() => {
    let cancelled = false

    async function setup() {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        await reg.update()
        const subscription = await reg.pushManager.getSubscription()

        if (subscription) {
          if (!cancelled) await saveSubscription(user.id, subscription)
          return
        }

        const permission = await Notification.requestPermission()
        if (permission !== 'granted' || cancelled) return

        const newSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as unknown as BufferSource
        })
        if (!cancelled) await saveSubscription(user.id, newSub)
      } catch (err) {
        console.warn('Push subscription:', err)
      }
    }

    async function saveSubscription(ownerId: string, sub: PushSubscription) {
      const json = sub.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return
      await supabase.from('push_subscriptions').upsert(
        {
          owner_id: ownerId,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth
        },
        { onConflict: 'owner_id,endpoint' }
      )
    }

    setup()
    return () => { cancelled = true }
  }, [])

  return null
}
