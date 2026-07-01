'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, CalendarCheck, Star } from 'lucide-react'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { PageSkeleton, PortalPageShell, useConfirm, useToast } from '@/app/components/design-system'
import { QK } from '@/app/lib/queries/queryKeys'
import { Button, buttonClassName } from '@/app/components/ui/Button'
import { formatDateNo } from '@/app/lib/dateFormat'
import GuestBookingChatPanel from '@/features/messaging/components/GuestBookingChatPanel'
import BookingGuestListPanel from '@/features/tourism/components/BookingGuestListPanel'

type BookingRow = {
  id: string
  check_in: string
  check_out: string
  status: string
  listing_id: string
  listings: { address: string; city: string } | { address: string; city: string }[] | null
}

type FinnMineBookingsData = {
  bookings: BookingRow[]
  reviewedIds: Set<string>
}

async function fetchFinnMineBookings(uid: string, em: string): Promise<FinnMineBookingsData> {
  const { data } = await supabase
    .from('bookings')
    .select('id, check_in, check_out, status, listing_id, listings(address, city)')
    .or(`guest_user_id.eq.${uid},guest_email.eq.${em}`)
    .order('created_at', { ascending: false })
    .limit(20)
  const bookings = (data ?? []) as BookingRow[]
  const ids = bookings.map((b) => b.id)
  let reviewedIds = new Set<string>()
  if (ids.length > 0) {
    const { data: revs } = await supabase
      .from('booking_reviews')
      .select('booking_id')
      .in('booking_id', ids)
    reviewedIds = new Set((revs ?? []).map((r) => r.booking_id))
  }
  return { bookings, reviewedIds }
}

export default function FinnMineClient() {
  const { t } = useLanguage()
  const toast = useToast()
  const confirmDialog = useConfirm()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('booking')
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [termsOpen, setTermsOpen] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewBody, setReviewBody] = useState('')
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [checkInGuides, setCheckInGuides] = useState<Record<string, string>>({})

  const {
    data: bookingsData,
    isPending: bookingsLoading,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: [...QK.finnMineBookings, userId, userEmail],
    queryFn: () => fetchFinnMineBookings(userId!, userEmail!),
    enabled: !!userId && !!userEmail,
    staleTime: 30_000,
  })

  const bookings = bookingsData?.bookings ?? []
  const reviewedIds = bookingsData?.reviewedIds ?? new Set<string>()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const user = await getAuthUserDeduped()
      if (cancelled) return
      if (user?.email) {
        setUserId(user.id)
        setUserEmail(user.email)
        await supabase.from('guest_profiles').upsert(
          { id: user.id, email: user.email, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        )
        const { data: termsOk } = await supabase.rpc('guest_has_tourism_terms_accepted', {
          p_user_id: user.id,
        })
        if (termsOk === false) setTermsOpen(true)
        await supabase.rpc('link_guest_bookings_on_login')
        if (highlightId) setExpandedBookingId(highlightId)
        if (searchParams.get('paid') === '1') {
          toast(t('finnPaymentConfirmed'), 'success')
        }
      }
      setAuthLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!userId || !userEmail || searchParams.get('paid') !== '1') return
    void refetchBookings()
  }, [userId, userEmail, searchParams, refetchBookings])

  const acceptGuestTerms = async () => {
    if (!termsAccepted || !userId) return
    const { data: doc } = await supabase
      .from('terms_documents')
      .select('id')
      .eq('scope', 'turisme')
      .eq('signing_method', 'click_wrap')
      .eq('approved_for_utleier_signing', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!doc?.id) {
      setTermsOpen(false)
      return
    }
    const { error } = await supabase.from('guest_terms_acceptances').insert([
      { user_id: userId, terms_document_id: doc.id },
    ])
    if (error) {
      toast(error.message, 'error')
      return
    }
    setTermsOpen(false)
    toast(t('finnGuestTermsCta'), 'success')
  }

  const submitReview = async (bookingId: string) => {
    if (!userId) return
    const { error } = await supabase.from('booking_reviews').insert([
      {
        booking_id: bookingId,
        reviewer_user_id: userId,
        rating: reviewRating,
        body: reviewBody.trim() || null,
      },
    ])
    if (error) {
      toast(error.message, 'error')
      return
    }
    toast(t('finnReviewThanks'), 'success')
    setReviewedIdsLocal(bookingId)
    setReviewBookingId(null)
    setReviewBody('')
    void queryClient.invalidateQueries({ queryKey: QK.finnMineBookings })
  }

  const setReviewedIdsLocal = (bookingId: string) => {
    queryClient.setQueryData<FinnMineBookingsData>(
      [...QK.finnMineBookings, userId, userEmail],
      (prev) => {
        if (!prev) return prev
        const next = new Set(prev.reviewedIds)
        next.add(bookingId)
        return { ...prev, reviewedIds: next }
      }
    )
  }

  const loadCheckInGuide = async (bookingId: string) => {
    const { data } = await supabase.rpc('get_booking_check_in_guide', { p_booking_id: bookingId })
    if (typeof data === 'string' && data.trim()) {
      setCheckInGuides((prev) => ({ ...prev, [bookingId]: data }))
    }
  }

  const cancelBooking = async (bookingId: string) => {
    if (
      !(await confirmDialog({
        title: t('finnCancelBooking'),
        message: t('finnCancelBookingConfirm'),
        variant: 'danger',
      }))
    )
      return
    setCancellingId(bookingId)
    const { data, error } = await supabase.rpc('guest_cancel_booking', { p_booking_id: bookingId })
    setCancellingId(null)
    if (error || data?.ok === false) {
      toast(error?.message ?? t('finnCancelBookingError'), 'error')
      return
    }
    toast(t('finnCancelBookingDone'), 'success')
    void refetchBookings()
  }

  const statusLabel = (status: string) => {
    const key = `finnBookingStatus_${status}` as Parameters<typeof t>[0]
    const translated = t(key)
    return translated === key ? status : translated
  }

  const pageLoading = authLoading || (!!userEmail && bookingsLoading)

  return (
    <PortalPageShell loading={pageLoading} loadingFallback={<PageSkeleton minHeight={240} />}>
    <section>
      {termsOpen ? (
        <div
          className="finn-card"
          style={{
            maxWidth: 480,
            padding: 'var(--space-6)',
            marginBottom: 'var(--space-4)',
            border: '2px solid var(--finn-accent)',
          }}
          role="dialog"
          aria-labelledby="guest-terms-title"
        >
          <h2 id="guest-terms-title" style={{ margin: '0 0 8px' }}>
            {t('finnGuestTermsTitle')}
          </h2>
          <p style={{ margin: '0 0 12px', lineHeight: 1.5 }}>{t('finnGuestTermsLead')}</p>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16 }}>
            <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
            <span>{t('finnGuestTermsAccept')}</span>
          </label>
          <Button type="button" variant="accent" disabled={!termsAccepted} onClick={() => void acceptGuestTerms()}>
            {t('finnGuestTermsCta')}
          </Button>
        </div>
      ) : null}
      <div className="finn-hero">
        <h1>{t('finnMineTitle')}</h1>
        <p>{t('finnMineLead')}</p>
      </div>

      {!userEmail ? (
        <div className="finn-card" style={{ maxWidth: 480, padding: 'var(--space-6)' }}>
          <Mail size={32} style={{ color: 'var(--finn-accent)', marginBottom: 'var(--space-3)' }} aria-hidden />
          <p style={{ lineHeight: 1.6, margin: '0 0 var(--space-4)', color: 'var(--finn-text-secondary)' }}>
            {t('finnGuestAccountRequired')}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link href="/finn/login?redirect=/finn/mine" className={buttonClassName('accent')}>
              {t('finnMineLoginCta')}
            </Link>
            <Link href="/finn/login?redirect=/finn/mine&signup=1" className={buttonClassName('secondary')}>
              {t('finnLoginCreateAccount')}
            </Link>
          </div>
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
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {(b.status === 'accepted' || b.status === 'pending') && (
                      <Link
                        href={`/finn/book/${b.id}`}
                        className={buttonClassName('accent')}
                        style={{ display: 'inline-flex' }}
                      >
                        {t('finnCheckoutPay')}
                      </Link>
                    )}
                    {(b.status === 'accepted' || b.status === 'pending') && (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={cancellingId === b.id}
                        onClick={() => void cancelBooking(b.id)}
                      >
                        {t('finnCancelBooking')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        const next = expandedBookingId === b.id ? null : b.id
                        setExpandedBookingId(next)
                        if (next && !checkInGuides[b.id]) void loadCheckInGuide(b.id)
                      }}
                    >
                      {expandedBookingId === b.id ? t('finnHideChat') : t('finnOpenChat')}
                    </Button>
                  </div>
                  {expandedBookingId === b.id ? (
                    <>
                      {checkInGuides[b.id] &&
                      (b.status === 'accepted' || b.status === 'paid' || b.status === 'completed') ? (
                        <div
                          className="finn-card"
                          style={{
                            marginTop: 12,
                            padding: 'var(--space-3)',
                            background: 'rgba(59, 130, 246, 0.08)',
                          }}
                        >
                          <p style={{ fontWeight: 600, margin: '0 0 6px' }}>{t('checkInGuideTitle')}</p>
                          <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                            {checkInGuides[b.id]}
                          </p>
                        </div>
                      ) : null}
                      {(b.status === 'accepted' || b.status === 'paid' || b.status === 'completed') && (
                        <BookingGuestListPanel bookingId={b.id} />
                      )}
                      <GuestBookingChatPanel bookingId={b.id} compact />
                    </>
                  ) : null}
                  {(b.status === 'paid' || b.status === 'completed') && !reviewedIds.has(b.id) ? (
                    <div style={{ marginTop: 12 }}>
                      {reviewBookingId === b.id ? (
                        <div className="finn-inquiry-form" style={{ marginTop: 8 }}>
                          <p style={{ fontWeight: 600, margin: '0 0 8px' }}>{t('finnReviewTitle')}</p>
                          <label>
                            {t('finnReviewRating')}
                            <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
                              {[5, 4, 3, 2, 1].map((n) => (
                                <option key={n} value={n}>
                                  {n} ★
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <textarea value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} rows={3} />
                          </label>
                          <Button type="button" variant="accent" onClick={() => void submitReview(b.id)}>
                            {t('finnReviewSubmit')}
                          </Button>
                        </div>
                      ) : (
                        <Button type="button" variant="secondary" onClick={() => setReviewBookingId(b.id)}>
                          <Star size={16} aria-hidden /> {t('finnReviewTitle')}
                        </Button>
                      )}
                    </div>
                  ) : null}
                </li>
              )})}
            </ul>
          )}
        </>
      )}
    </section>
    </PortalPageShell>
  )
}
