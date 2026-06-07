import { devWarn } from '@/app/lib/appLogger'
import { supabase } from './supabase'

const VAPID_PUBLIC =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BGJpQlyCiUmWuqwKMIf8Tc4eX9vUAT6_HxebrntxaXr638Rf72rYxo9IFrN_e6uY2JTiQlyTWN6t7f_WMgcUnX0'

export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function savePushSubscription(
  ownerId: string,
  sub: PushSubscription
): Promise<boolean> {
  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      owner_id: ownerId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: 'owner_id,endpoint' }
  )

  if (error) {
    devWarn(`[push] save subscription failed: ${error.message}`)
    return false
  }
  return true
}

export type PushEnsureResult =
  | { ok: true; subscribed: true }
  | { ok: true; subscribed: false; reason: 'permission-not-granted' }
  | { ok: false; reason: 'unsupported' | 'denied' | 'error'; error?: string }

/**
 * Registrerer SW, oppretter push-abonnement når tillatelse allerede er gitt,
 * og lagrer nøklene i Supabase. Krever ikke brukertrykk (kun sync).
 */
export async function ensurePushSubscription(userId: string): Promise<PushEnsureResult> {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' }
  if (Notification.permission === 'denied') return { ok: false, reason: 'denied' }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    await reg.update()
    if (!reg.pushManager) return { ok: false, reason: 'unsupported' }

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      if (Notification.permission !== 'granted') {
        return { ok: true, subscribed: false, reason: 'permission-not-granted' }
      }
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as unknown as BufferSource,
      })
    }

    const saved = await savePushSubscription(userId, sub)
    if (!saved) {
      return { ok: false, reason: 'error', error: 'Kunne ikke lagre push-abonnement' }
    }
    return { ok: true, subscribed: true }
  } catch (e) {
    return {
      ok: false,
      reason: 'error',
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

export { VAPID_PUBLIC }
