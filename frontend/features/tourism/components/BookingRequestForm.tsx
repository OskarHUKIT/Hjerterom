'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import { Button, buttonClassName } from '@/app/components/ui/Button'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import { submitBookingRequest, bookingErrorTranslationKey } from '@/features/tourism/lib/submitBookingRequest'
import TourismAvailabilityCalendar from '@/features/tourism/components/TourismAvailabilityCalendar'
import { ensureGuestProfile } from '@/app/lib/ensureGuestProfile'

type Props = {
  listingId: string
  eventId?: string | null
  nightlyPriceCents: number | null
  listingAddress: string
  instantBook?: boolean
  cancellationPolicy?: string | null
}

function nightsBetween(checkIn: string, checkOut: string) {
  const a = new Date(checkIn)
  const b = new Date(checkOut)
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000)
  return Math.max(1, diff)
}

export default function BookingRequestForm({
  listingId,
  eventId,
  nightlyPriceCents,
  listingAddress,
  instantBook,
  cancellationPolicy,
}: Props) {
  const { t } = useLanguage()
  const toast = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const loginHref = `/finn/login?redirect=${encodeURIComponent(pathname || '/finn')}`
  const signupHref = `${loginHref}&signup=1`

  const [authLoading, setAuthLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [datesBlocked, setDatesBlocked] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    checkIn: '',
    checkOut: '',
    message: '',
    acceptTerms: false,
    guestInviteEmail: '',
  })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const user = await getAuthUserDeduped()
      if (cancelled) return
      if (user?.email) {
        setUserId(user.id)
        const metaName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : ''
        const metaPhone =
          typeof user.user_metadata?.contact_phone === 'string' ? user.user_metadata.contact_phone : ''
        const { data: guestProfile } = await supabase
          .from('guest_profiles')
          .select('display_name, phone')
          .eq('id', user.id)
          .maybeSingle()
        setForm((f) => ({
          ...f,
          email: user.email ?? f.email,
          name: guestProfile?.display_name?.trim() || metaName || f.name,
          phone: guestProfile?.phone?.trim() || metaPhone || f.phone,
        }))
      }
      setAuthLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const totalCents = useMemo(() => {
    if (!nightlyPriceCents || !form.checkIn || !form.checkOut || form.checkOut < form.checkIn) return null
    return nightlyPriceCents * nightsBetween(form.checkIn, form.checkOut)
  }, [nightlyPriceCents, form.checkIn, form.checkOut])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) {
      toast(t('finnBookingAuthRequired'), 'error')
      return
    }
    if (!form.name.trim() || !form.email.trim() || !form.checkIn || !form.checkOut) {
      toast(t('finnBookingRequired'), 'error')
      return
    }
    if (form.checkOut < form.checkIn) {
      toast(t('finnBookingInvalidDates'), 'error')
      return
    }
    if (datesBlocked) {
      toast(t('finnDatesNotAvailable'), 'error')
      return
    }
    if (!form.acceptTerms) {
      toast(t('finnGuestTermsAccept'), 'error')
      return
    }
    setSubmitting(true)
    await ensureGuestProfile(supabase, { displayName: form.name, phone: form.phone })
    const result = await submitBookingRequest({
      listingId,
      eventId,
      guestName: form.name,
      guestEmail: form.email,
      guestPhone: form.phone,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      message: form.message,
      amountCents: nightlyPriceCents,
    })
    if (!result.ok) {
      setSubmitting(false)
      const key = bookingErrorTranslationKey(result.errorCode)
      toast(key ? t(key) : result.error, 'error')
      return
    }
    if (form.guestInviteEmail.trim()) {
      await supabase.rpc('invite_booking_guest', {
        p_booking_id: result.id,
        p_guest_email: form.guestInviteEmail.trim(),
        p_guest_name: null,
      })
    }
    setSubmitting(false)
    if (result.instantBook && result.status === 'accepted') {
      toast(t('finnInstantBookConfirmed'), 'success')
      router.push(`/finn/book/${result.id}`)
      return
    }
    toast(t('finnBookingSent'), 'success')
    router.push(`/finn/mine?booking=${result.id}`)
  }

  const priceLabel =
    nightlyPriceCents != null
      ? t('finnFromPrice').replace('{price}', `${Math.round(nightlyPriceCents / 100).toLocaleString('nb-NO')} kr`)
      : null

  return (
    <section aria-labelledby="finn-booking-title">
      <h2 id="finn-booking-title" className="finn-section-title">
        {t('finnBookingTitle')}
      </h2>
      <p className="finn-card-meta">{listingAddress}</p>
      {priceLabel ? (
        <p className="finn-price">
          {priceLabel} / {t('finnPerNight')}
        </p>
      ) : null}
      {totalCents != null ? (
        <p className="finn-price" style={{ fontSize: '1.1rem' }}>
          {t('finnTotalPrice')}: {(totalCents / 100).toLocaleString('nb-NO')} kr ({nightsBetween(form.checkIn, form.checkOut)}{' '}
          {t('finnNights')})
        </p>
      ) : null}
      {instantBook ? (
        <p className="finn-badge" style={{ display: 'inline-block', marginBottom: 8 }}>
          {t('finnInstantBookBadge')}
        </p>
      ) : null}
      {cancellationPolicy ? (
        <p className="finn-card-meta" style={{ marginBottom: 'var(--space-4)' }}>
          {t('finnCancellationPolicy')}: {t(`finnCancellation_${cancellationPolicy}` as Parameters<typeof t>[0])}
        </p>
      ) : (
        <p className="finn-card-meta" style={{ marginBottom: 'var(--space-4)' }}>
          {t('finnBookingLead')}
        </p>
      )}
      <TourismAvailabilityCalendar
        listingId={listingId}
        checkIn={form.checkIn}
        checkOut={form.checkOut}
        onDatesBlocked={setDatesBlocked}
      />

      {authLoading ? (
        <p className="finn-card-meta">{t('loadingPleaseWait')}</p>
      ) : !userId ? (
        <div
          className="finn-card"
          style={{
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
            border: '2px solid var(--finn-accent)',
          }}
        >
          <p style={{ margin: '0 0 var(--space-3)', lineHeight: 1.5 }}>{t('finnGuestAccountRequired')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link href={loginHref} className={buttonClassName('accent')}>
              {t('finnMineLoginCta')}
            </Link>
            <Link href={signupHref} className={buttonClassName('secondary')}>
              {t('finnLoginCreateAccount')}
            </Link>
          </div>
        </div>
      ) : null}

      <form className="finn-inquiry-form" onSubmit={(e) => void onSubmit(e)}>
        <label>
          {t('finnInquiryName')}
          <input
            required
            autoComplete="name"
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
            autoComplete="email"
            readOnly={Boolean(userId)}
            value={form.email}
            disabled={!userId}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </label>
        <label>
          {t('finnInquiryPhone')}
          <input
            type="tel"
            value={form.phone}
            disabled={!userId}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
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
        <label>
          {t('finnInquiryMessage')}
          <textarea
            value={form.message}
            disabled={!userId}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          />
        </label>
        <label>
          {t('finnCoGuestInvite')}
          <input
            type="email"
            placeholder={t('finnCoGuestInvitePlaceholder')}
            value={form.guestInviteEmail}
            disabled={!userId}
            onChange={(e) => setForm((f) => ({ ...f, guestInviteEmail: e.target.value }))}
          />
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={form.acceptTerms}
            disabled={!userId}
            onChange={(e) => setForm((f) => ({ ...f, acceptTerms: e.target.checked }))}
          />
          <span>{t('finnGuestTermsAccept')}</span>
        </label>
        <Button type="submit" variant="accent" disabled={submitting || datesBlocked || !userId}>
          {t('finnBookingSubmit')}
        </Button>
      </form>
    </section>
  )
}
