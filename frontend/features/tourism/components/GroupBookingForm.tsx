'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import { Button, buttonClassName } from '@/app/components/ui/Button'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import { submitBookingRequest, bookingErrorTranslationKey } from '@/features/tourism/lib/submitBookingRequest'
import { ensureGuestProfile } from '@/app/lib/ensureGuestProfile'

type Props = {
  eventId: string
  primaryListingId: string
  nightlyPriceCents: number | null
}

export default function GroupBookingForm({ eventId, primaryListingId, nightlyPriceCents }: Props) {
  const { t } = useLanguage()
  const toast = useToast()
  const pathname = usePathname()
  const loginHref = `/finn/login?redirect=${encodeURIComponent(pathname || '/finn')}`

  const [authLoading, setAuthLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [extraListingId, setExtraListingId] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    checkIn: '',
    checkOut: '',
    acceptTerms: false,
  })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const user = await getAuthUserDeduped()
      if (cancelled) return
      if (user?.email) {
        setUserId(user.id)
        const { data: guestProfile } = await supabase
          .from('guest_profiles')
          .select('display_name')
          .eq('id', user.id)
          .maybeSingle()
        const metaName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : ''
        setForm((f) => ({
          ...f,
          email: user.email ?? f.email,
          name: guestProfile?.display_name?.trim() || metaName || f.name,
        }))
      }
      setAuthLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) {
      toast(t('finnBookingAuthRequired'), 'error')
      return
    }
    if (!form.acceptTerms || !form.name.trim() || !form.email.trim()) {
      toast(t('finnBookingRequired'), 'error')
      return
    }
    setBusy(true)
    await ensureGuestProfile(supabase, { displayName: form.name })
    const listingIds = [primaryListingId, extraListingId.trim()].filter(Boolean)
    const { data: group, error: groupErr } = await supabase
      .from('booking_groups')
      .insert([{ guest_user_id: userId, guest_email: form.email.trim(), event_id: eventId }])
      .select('id')
      .single()
    if (groupErr || !group) {
      toast(groupErr?.message ?? t('finnCheckoutError'), 'error')
      setBusy(false)
      return
    }
    for (const listingId of listingIds) {
      const result = await submitBookingRequest({
        listingId,
        eventId,
        guestName: form.name,
        guestEmail: form.email,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        amountCents: nightlyPriceCents,
      })
      if (!result.ok) {
        const key = bookingErrorTranslationKey(result.errorCode)
        toast(key ? t(key) : result.error, 'error')
        setBusy(false)
        return
      }
      await supabase.from('bookings').update({ booking_group_id: group.id }).eq('id', result.id)
    }
    setBusy(false)
    toast(t('finnBookingSent'), 'success')
  }

  return (
    <section className="finn-card" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <h3 style={{ margin: '0 0 8px' }}>{t('finnGroupBookingTitle')}</h3>
      <p className="finn-card-meta" style={{ marginBottom: 12 }}>
        {t('finnGroupBookingLead')}
      </p>

      {authLoading ? (
        <p className="finn-card-meta">{t('loadingPleaseWait')}</p>
      ) : !userId ? (
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: '0 0 8px' }}>{t('finnGuestAccountRequired')}</p>
          <Link href={loginHref} className={buttonClassName('accent')}>
            {t('finnMineLoginCta')}
          </Link>
        </div>
      ) : null}

      <form className="finn-inquiry-form" onSubmit={(e) => void submit(e)}>
        <label>
          {t('finnGroupBookingAdd')}
          <input
            value={extraListingId}
            disabled={!userId}
            onChange={(e) => setExtraListingId(e.target.value)}
            placeholder="uuid"
          />
        </label>
        <label>
          {t('finnInquiryName')}
          <input
            required
            value={form.name}
            disabled={!userId}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>
        <label>
          {t('finnInquiryEmail')}
          <input
            type="email"
            required
            readOnly={Boolean(userId)}
            value={form.email}
            disabled={!userId}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </label>
        <label>
          {t('finnFilterCheckIn')}
          <input
            type="date"
            required
            value={form.checkIn}
            disabled={!userId}
            onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
          />
        </label>
        <label>
          {t('finnFilterCheckOut')}
          <input
            type="date"
            required
            value={form.checkOut}
            disabled={!userId}
            onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
          />
        </label>
        <label style={{ display: 'flex', gap: 8 }}>
          <input
            type="checkbox"
            checked={form.acceptTerms}
            disabled={!userId}
            onChange={(e) => setForm((f) => ({ ...f, acceptTerms: e.target.checked }))}
          />
          <span>{t('finnGuestTermsAccept')}</span>
        </label>
        <Button type="submit" variant="accent" disabled={busy || !userId}>
          {t('finnBookingSubmit')}
        </Button>
      </form>
    </section>
  )
}
