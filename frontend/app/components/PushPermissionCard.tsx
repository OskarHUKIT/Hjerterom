'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { savePushSubscription, urlBase64ToUint8Array, VAPID_PUBLIC } from '../lib/push-utils'
import { Bell, CheckCircle2 } from 'lucide-react'

type Status = 'loading' | 'show-button' | 'granted' | 'unsupported'

export default function PushPermissionCard() {
  const [status, setStatus] = useState<Status>('loading')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      if (typeof window === 'undefined') return

      const hasPush = 'serviceWorker' in navigator && 'PushManager' in window

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) {
        if (!cancelled) setStatus('loading')
        return
      }

      if (!hasPush) {
        if (!cancelled) setStatus('unsupported')
        return
      }

      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        await reg.update()
        const existing = await reg.pushManager.getSubscription()
        if (existing || Notification.permission === 'granted') {
          if (!cancelled) setStatus('granted')
          return
        }
        if (!cancelled) setStatus('show-button')
      } catch {
        if (!cancelled) setStatus('unsupported')
      }
    }

    check()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (!cancelled) check()
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  async function requestPermission() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
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
      setStatus('granted')
    } catch (err) {
      console.warn('Push subscription:', err)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') return null

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
          {status === 'granted' ? <CheckCircle2 size={20} /> : <Bell size={20} />}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Push-varsler på mobil</h3>
          {status === 'granted' && (
            <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '0.95rem' }}>
              Du får varsler på telefonen når du er logget inn.
            </p>
          )}
          {status === 'unsupported' && (
            <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '0.95rem' }}>
              Push-varsler krever HTTPS og en mobil-nettleser, eller at du legger appen til hjemskjermen.
            </p>
          )}
          {status === 'show-button' && (
            <>
              <p style={{ margin: '4px 0 12px', opacity: 0.9, fontSize: '0.95rem' }}>
                Trykk nedenfor for å aktivere varsler på telefonen.
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
