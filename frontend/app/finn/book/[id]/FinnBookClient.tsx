'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { PageSkeleton, useToast } from '@/app/components/design-system'
import { Button, buttonClassName } from '@/app/components/ui/Button'

export default function FinnBookClient() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const id = params?.id
  const cancelled = searchParams.get('cancelled')
  const { t } = useLanguage()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'vipps'>('stripe')
  const [booking, setBooking] = useState<{
    id: string
    status: string
    amount_cents: number | null
    check_in: string
    check_out: string
    guest_email: string
  } | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelledFlag = false
    void (async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, status, amount_cents, check_in, check_out, guest_email')
        .eq('id', id)
        .maybeSingle()
      if (!cancelledFlag) {
        setBooking(data)
        setLoading(false)
      }
    })()
    return () => {
      cancelledFlag = true
    }
  }, [id])

  useEffect(() => {
    if (cancelled) toast(t('finnCheckoutCancelled'), 'info')
  }, [cancelled, t, toast])

  const pay = async () => {
    if (!booking) return
    setPaying(true)
    try {
      const endpoint = paymentMethod === 'vipps' ? '/api/vipps/checkout' : '/api/stripe/checkout'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      })
      const data = (await res.json()) as { url?: string; error?: string; code?: string }
      if (!res.ok) {
        if (data.code === 'vipps_not_configured' || data.code === 'vipps_stub') {
          toast(t('finnVippsNotReady'), 'info')
        } else {
          toast(data.error ?? t('finnCheckoutError'), 'error')
        }
        return
      }
      if (data.url) window.location.href = data.url
    } catch {
      toast(t('finnCheckoutError'), 'error')
    } finally {
      setPaying(false)
    }
  }

  if (loading) return <PageSkeleton minHeight={240} />

  if (!booking) {
    return (
      <div className="finn-empty">
        <p>{t('finnBookingNotFound')}</p>
        <Link href="/finn/mine" className={buttonClassName('secondary')}>
          {t('finnNavMine')}
        </Link>
      </div>
    )
  }

  const amount =
    booking.amount_cents != null
      ? `${Math.round(booking.amount_cents / 100).toLocaleString('nb-NO')} kr`
      : null

  return (
    <section>
      <div className="finn-hero">
        <h1>{t('finnCheckoutTitle')}</h1>
        <p>{t('finnCheckoutLead')}</p>
      </div>
      <div className="finn-card" style={{ maxWidth: 480, padding: 'var(--space-6)' }}>
        <p className="finn-card-meta">
          {booking.check_in} – {booking.check_out}
        </p>
        {amount ? <p className="finn-price" style={{ fontSize: '1.5rem' }}>{amount}</p> : null}
        <p className="finn-card-meta" style={{ marginBottom: 'var(--space-4)' }}>
          {t('finnCheckoutStatus')}: <strong>{booking.status}</strong>
        </p>
        {booking.status === 'accepted' || booking.status === 'pending' ? (
          <>
            <fieldset style={{ border: 'none', margin: '0 0 var(--space-4)', padding: 0 }}>
              <legend style={{ fontWeight: 600, marginBottom: 8 }}>{t('finnPaymentMethod')}</legend>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'stripe'}
                  onChange={() => setPaymentMethod('stripe')}
                />
                Stripe
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'vipps'}
                  onChange={() => setPaymentMethod('vipps')}
                />
                Vipps
              </label>
            </fieldset>
            <Button type="button" variant="accent" disabled={paying} onClick={() => void pay()}>
              {paying ? t('finnCheckoutPaying') : t('finnCheckoutPay')}
            </Button>
          </>
        ) : booking.status === 'paid' ? (
          <p style={{ color: 'var(--finn-accent)', fontWeight: 600 }}>{t('finnBookingStatus_paid')}</p>
        ) : (
          <Link href="/finn/mine" className={buttonClassName('secondary')}>
            {t('finnNavMine')}
          </Link>
        )}
      </div>
    </section>
  )
}
