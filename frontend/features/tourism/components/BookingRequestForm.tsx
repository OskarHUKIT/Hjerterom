'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import { Button } from '@/app/components/ui/Button'
import { submitBookingRequest, bookingErrorTranslationKey } from '@/features/tourism/lib/submitBookingRequest'

type Props = {
  listingId: string
  eventId?: string | null
  nightlyPriceCents: number | null
  listingAddress: string
  instantBook?: boolean
  cancellationPolicy?: string | null
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
  const [submitting, setSubmitting] = useState(false)
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.checkIn || !form.checkOut) {
      toast(t('finnBookingRequired'), 'error')
      return
    }
    if (form.checkOut < form.checkIn) {
      toast(t('finnBookingInvalidDates'), 'error')
      return
    }
    if (!form.acceptTerms) {
      toast(t('finnGuestTermsAccept'), 'error')
      return
    }
    setSubmitting(true)
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
    setSubmitting(false)
    if (!result.ok) {
      const key = bookingErrorTranslationKey(result.errorCode)
      toast(key ? t(key) : result.error, 'error')
      return
    }
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
      {priceLabel ? <p className="finn-price">{priceLabel} / {t('finnPerNight')}</p> : null}
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
      <form className="finn-inquiry-form" onSubmit={(e) => void onSubmit(e)}>
        <label>
          {t('finnInquiryName')}
          <input
            required
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>
        <label>
          {t('finnInquiryEmail')}
          <input
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </label>
        <label>
          {t('finnInquiryPhone')}
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </label>
        <label>
          {t('finnFilterCheckIn')}
          <input
            type="date"
            required
            value={form.checkIn}
            onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
          />
        </label>
        <label>
          {t('finnFilterCheckOut')}
          <input
            type="date"
            required
            value={form.checkOut}
            onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
          />
        </label>
        <label>
          {t('finnInquiryMessage')}
          <textarea
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          />
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={form.acceptTerms}
            onChange={(e) => setForm((f) => ({ ...f, acceptTerms: e.target.checked }))}
          />
          <span>{t('finnGuestTermsAccept')}</span>
        </label>
        <Button type="submit" variant="accent" disabled={submitting}>
          {t('finnBookingSubmit')}
        </Button>
      </form>
    </section>
  )
}
