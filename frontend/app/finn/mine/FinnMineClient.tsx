'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail, CalendarCheck } from 'lucide-react'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { PageSkeleton, useToast } from '@/app/components/design-system'
import { Button, buttonClassName } from '@/app/components/ui/Button'
import { formatDateNo } from '@/app/lib/dateFormat'

type BookingRow = {
  id: string
  check_in: string
  check_out: string
  status: string
  listing_id: string
  listings: { address: string; city: string } | { address: string; city: string }[] | null
}

export default function FinnMineClient() {
  const { t } = useLanguage()
  const toast = useToast()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('booking')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const user = await getAuthUserDeduped()
      if (cancelled) return
      if (user?.email) {
        setUserEmail(user.email)
        const { data } = await supabase
          .from('bookings')
          .select('id, check_in, check_out, status, listing_id, listings(address, city)')
          .or(`guest_user_id.eq.${user.id},guest_email.eq.${user.email}`)
          .order('created_at', { ascending: false })
          .limit(20)
        setBookings((data ?? []) as BookingRow[])
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      toast(t('finnInquiryRequired'), 'error')
      return
    }
    setSending(true)
    const redirectTo = `${window.location.origin}/auth/callback?next=/finn/mine`
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: redirectTo },
    })
    setSending(false)
    if (error) {
      toast(error.message, 'error')
      return
    }
    toast(t('finnMagicLinkSent'), 'success')
  }

  const statusLabel = (status: string) => {
    const key = `finnBookingStatus_${status}` as Parameters<typeof t>[0]
    const translated = t(key)
    return translated === key ? status : translated
  }

  if (loading) return <PageSkeleton minHeight={240} />

  return (
    <section>
      <div className="finn-hero">
        <h1>{t('finnMineTitle')}</h1>
        <p>{t('finnMineLead')}</p>
      </div>

      {!userEmail ? (
        <div className="finn-card" style={{ maxWidth: 480, padding: 'var(--space-6)' }}>
          <Mail size={32} style={{ color: 'var(--finn-accent)', marginBottom: 'var(--space-3)' }} aria-hidden />
          <p style={{ lineHeight: 1.6, margin: '0 0 var(--space-4)', color: 'var(--finn-text-secondary)' }}>
            {t('finnMineMagicLinkLead')}
          </p>
          <form onSubmit={(e) => void sendMagicLink(e)} className="finn-inquiry-form" style={{ marginTop: 0 }}>
            <label>
              {t('finnInquiryEmail')}
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <Button type="submit" variant="accent" disabled={sending}>
              {t('finnMineMagicLinkCta')}
            </Button>
          </form>
        </div>
      ) : (
        <>
          <p className="finn-card-meta" style={{ marginBottom: 'var(--space-4)' }}>
            {t('finnMineLoggedInAs')} <strong style={{ color: 'var(--finn-text)' }}>{userEmail}</strong>
          </p>
          {bookings.length === 0 ? (
            <div className="finn-empty">
              <CalendarCheck size={36} style={{ marginBottom: 12, opacity: 0.5 }} aria-hidden />
              <p>{t('finnMineNoBookings')}</p>
              <Link href="/finn" className={buttonClassName('accent')} style={{ marginTop: 16, display: 'inline-flex' }}>
                {t('finnNavSearch')}
              </Link>
            </div>
          ) : (
            <ul className="finn-event-list">
              {bookings.map((b) => {
                const listing = Array.isArray(b.listings) ? b.listings[0] : b.listings
                return (
                <li
                  key={b.id}
                  className="finn-event-item"
                  style={{
                    borderColor: b.id === highlightId ? 'var(--finn-accent)' : undefined,
                  }}
                >
                  <p style={{ margin: '0 0 6px', fontWeight: 700 }}>
                    {listing?.address ?? '—'}
                  </p>
                  <p className="finn-card-meta" style={{ margin: '0 0 8px' }}>
                    {listing?.city} · {formatDateNo(b.check_in)} – {formatDateNo(b.check_out)}
                  </p>
                  <span className="finn-badge">{statusLabel(b.status)}</span>
                </li>
              )})}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
