'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import { Button } from '@/app/components/ui/Button'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import { submitBookingRequest, bookingErrorTranslationKey } from '@/features/tourism/lib/submitBookingRequest'
import TourismBookingCalendar from '@/features/tourism/components/TourismBookingCalendar'
import { ensureGuestProfile } from '@/app/lib/ensureGuestProfile'
import { ensureOwnProfile } from '@/app/lib/ensureProfile'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import {
  clearPendingBooking,
  loadPendingBooking,
  savePendingBooking,
} from '@/features/tourism/lib/pendingBookingStorage'
import AuthCard from '@/features/auth/components/AuthCard'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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

  const [authLoading, setAuthLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [datesBlocked, setDatesBlocked] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const pendingSubmitRef = useRef(false)
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
    const pending = loadPendingBooking(listingId)
    if (pending?.checkIn || pending?.checkOut) {
      setForm((f) => ({
        ...f,
        checkIn: pending.checkIn ?? f.checkIn,
        checkOut: pending.checkOut ?? f.checkOut,
        name: pending.name ?? f.name,
        phone: pending.phone ?? f.phone,
        message: pending.message ?? f.message,
      }))
    }
  }, [listingId])

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

  const submitBooking = async () => {
    if (!userId) return
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
    clearPendingBooking(listingId)
    setSubmitting(false)
    if (result.instantBook && result.status === 'accepted') {
      toast(t('finnInstantBookConfirmed'), 'success')
      router.push(`/finn/book/${result.id}`)
      return
    }
    toast(t('finnBookingSent'), 'success')
    router.push(`/finn/mine?booking=${result.id}`)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.checkIn || !form.checkOut) {
      toast(t('finnBookingRequired'), 'error')
      return
    }
    if (!userId) {
      savePendingBooking(listingId, {
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        name: form.name,
        phone: form.phone,
        message: form.message,
      })
      pendingSubmitRef.current = true
      setLoginOpen(true)
      return
    }
    await submitBooking()
  }

  const handleAuthenticated = async (user: SupabaseUser) => {
    if (!user.email) return
    await ensureOwnProfile(supabase)
    await ensureGuestProfile(supabase, {
      displayName: form.name.trim() || undefined,
      phone: form.phone.trim() || undefined,
    })
    await supabase.rpc('link_guest_bookings_on_login')
    setUserId(user.id)
    setLoginOpen(false)
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
    if (pendingSubmitRef.current) {
      pendingSubmitRef.current = false
      await submitBooking()
    }
  }

  const priceLabel =
    nightlyPriceCents != null
      ? t('finnFromPrice').replace('{price}', `${Math.round(nightlyPriceCents / 100).toLocaleString('nb-NO')} kr`)
      : null

  const redirectAfterLogin = pathname || '/finn'

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

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <TourismBookingCalendar
          listingId={listingId}
          checkIn={form.checkIn}
          checkOut={form.checkOut}
          onChange={({ checkIn, checkOut }) => {
            setForm((f) => ({ ...f, checkIn, checkOut }))
          }}
          onDatesBlocked={setDatesBlocked}
        />
      </div>

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
            readOnly={Boolean(userId)}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder={userId ? undefined : t('finnBookingEmailAfterLogin')}
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
          {t('finnInquiryMessage')}
          <textarea
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          />
        </label>
        {userId ? (
          <label>
            {t('finnCoGuestInvite')}
            <input
              type="email"
              placeholder={t('finnCoGuestInvitePlaceholder')}
              value={form.guestInviteEmail}
              onChange={(e) => setForm((f) => ({ ...f, guestInviteEmail: e.target.value }))}
            />
          </label>
        ) : null}
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={form.acceptTerms}
            onChange={(e) => setForm((f) => ({ ...f, acceptTerms: e.target.checked }))}
          />
          <span>{t('finnGuestTermsAccept')}</span>
        </label>
        <Button type="submit" variant="accent" disabled={submitting || datesBlocked || authLoading}>
          {authLoading ? t('loadingPleaseWait') : t('finnBookingSubmit')}
        </Button>
        {!userId && !authLoading ? (
          <p className="finn-card-meta" style={{ marginTop: 'var(--space-2)' }}>
            {t('finnBookingLoginOnSubmit')}
          </p>
        ) : null}
      </form>

      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="auth-dialog-content sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>{t('finnLoginTitle')}</DialogTitle>
            <DialogDescription>{t('finnBookingLoginDialogLead')}</DialogDescription>
          </DialogHeader>
          <AuthCard
            context="guest"
            compact
            redirectTo={redirectAfterLogin}
            onAuthenticated={(user) => {
              void handleAuthenticated(user)
            }}
          />
        </DialogContent>
      </Dialog>
    </section>
  )
}
