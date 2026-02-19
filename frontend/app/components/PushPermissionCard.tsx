'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { savePushSubscription, urlBase64ToUint8Array, VAPID_PUBLIC } from '../lib/push-utils'
import { Bell } from 'lucide-react'

export default function PushPermissionCard() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        await reg.update()
        const existing = await reg.pushManager.getSubscription()
        if (existing || Notification.permission === 'granted') return
        if (!cancelled) setShow(true)
      } catch {
        // ignore
      }
    }

    check()
  }, [])

  async function requestPermission() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      setShow(false)
      if (permission !== 'granted') {
        setLoading(false)
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as unknown as BufferSource
      })
      await savePushSubscription(user.id, sub)
    } catch (err) {
      console.warn('Push subscription:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!show) return null

  return (
    <div
      className="card"
      style={{
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-4)',
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.3)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'rgba(59, 130, 246, 0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-sky-blue)', flexShrink: 0
        }}>
          <Bell size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Push-varsler på mobil</h3>
          <p style={{ margin: '4px 0 12px', opacity: 0.9, fontSize: '0.95rem' }}>
            Trykk nedenfor for å aktivere varsler på telefonen når du er logget inn.
          </p>
          <button
            type="button"
            onClick={requestPermission}
            disabled={loading}
            className="button"
            style={{
              padding: '10px 20px',
              background: 'var(--color-sky-blue)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-2)'
            }}
          >
            {loading ? 'Aktiverer...' : 'Aktiver varsler'}
          </button>
        </div>
      </div>
    </div>
  )
}
