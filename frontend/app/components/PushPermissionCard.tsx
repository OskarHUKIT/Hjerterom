'use client'

import { useEffect, useState } from 'react'
import { getAuthUserDeduped } from '../lib/supabase'
import {
  ensurePushSubscription,
  isPushSupported,
  savePushSubscription,
  urlBase64ToUint8Array,
  VAPID_PUBLIC,
} from '../lib/push-utils'
import { Bell, CheckCircle2 } from 'lucide-react'
import { useAuthSession } from '../../context/AuthSessionContext'
import { useLanguage } from '../../context/LanguageContext'
import { isMobileUserAgent } from '../lib/mobile'
import { devWarn } from '@/app/lib/appLogger'

type Status = 'loading' | 'show-button' | 'granted' | 'unsupported' | 'denied'

export default function PushPermissionCard() {
  const { user } = useAuthSession()
  const { t } = useLanguage()
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setIsMobile(isMobileUserAgent())
  }, [])

  useEffect(() => {
    if (isMobile !== true) return
    let cancelled = false

    async function check() {
      if (typeof window === 'undefined') return

      const u = await getAuthUserDeduped()
      if (!u || cancelled) {
        if (!cancelled) setStatus('loading')
        return
      }

      if (!isPushSupported()) {
        if (!cancelled) setStatus('unsupported')
        return
      }

      if (Notification.permission === 'denied') {
        if (!cancelled) setStatus('denied')
        return
      }

      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        await reg.update()
        // iOS Safari: pushManager finnes bare når appen er lagt til på hjemskjerm
        if (!reg.pushManager) {
          if (!cancelled) setStatus('unsupported')
          return
        }

        const existing = await reg.pushManager.getSubscription()
        if (existing) {
          await savePushSubscription(u.id, existing)
          if (!cancelled) setStatus('granted')
          return
        }

        if (Notification.permission === 'granted') {
          const result = await ensurePushSubscription(u.id)
          if (!cancelled) {
            setStatus(result.ok && result.subscribed ? 'granted' : 'show-button')
          }
          return
        }

        if (!cancelled) setStatus('show-button')
      } catch {
        if (!cancelled) setStatus('unsupported')
      }
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [isMobile, user?.id])

  async function requestPermission() {
    if (!isPushSupported()) return
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'show-button')
        return
      }
      const u = await getAuthUserDeduped()
      if (!u) return

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as unknown as BufferSource,
      })
      const saved = await savePushSubscription(u.id, sub)
      if (!saved) {
        devWarn('[push] subscription created but not saved to database')
        setStatus('show-button')
        return
      }
      setStatus('granted')
    } catch (err) {
      devWarn('Push subscription:', err)
      setStatus('show-button')
    } finally {
      setLoading(false)
    }
  }

  if (isMobile === null || isMobile === false) return null
  if (status === 'loading') return null

  return (
    <div
      className="card"
      style={{
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-4)',
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-sky-blue)',
            flexShrink: 0,
          }}
        >
          {status === 'granted' ? <CheckCircle2 size={20} /> : <Bell size={20} />}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('pushNotificationsMobile')}</h3>
          {status === 'granted' && (
            <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '0.95rem' }}>
              {t('pushGrantedDesc')}
            </p>
          )}
          {status === 'unsupported' && (
            <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '0.95rem' }}>
              {t('pushUnsupportedDesc')}
            </p>
          )}
          {status === 'denied' && (
            <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '0.95rem' }}>
              {t('pushDeniedDesc')}
            </p>
          )}
          {status === 'show-button' && (
            <>
              <p style={{ margin: '4px 0 12px', opacity: 0.9, fontSize: '0.95rem' }}>
                {t('pushActivateDesc')}
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
                  borderRadius: 'var(--radius-2)',
                }}
              >
                {loading ? t('activating') : t('activateNotifications')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
