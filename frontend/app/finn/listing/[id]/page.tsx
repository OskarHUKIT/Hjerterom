'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { PageSkeleton } from '@/app/components/design-system'
import { buttonClassName } from '@/app/components/ui/Button'
import BookingRequestForm from '@/features/tourism/components/BookingRequestForm'

type ListingDetail = {
  id: string
  address: string
  city: string
  description: string | null
  tourism_nightly_price_cents: number | null
  tourism_instant_book: boolean
  cancellation_policy: string | null
  image_url: string | null
  type: string | null
  beds: number | null
}

type EventContext = {
  id: string
  slug: string
  name: string
  routing_mode: 'saksbehandler' | 'turisme'
}

export default function FinnListingDetailPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('event')
  const id = params?.id
  const { t } = useLanguage()
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [eventContext, setEventContext] = useState<EventContext | null>(null)
  const [eventOptInOk, setEventOptInOk] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      const { data } = await supabase
        .from('listings')
        .select(
          'id, address, city, description, tourism_nightly_price_cents, tourism_instant_book, cancellation_policy, image_url, type, beds, tourism_enabled'
        )
        .eq('id', id)
        .eq('tourism_enabled', true)
        .maybeSingle()

      if (cancelled) return
      if (!data) {
        setListing(null)
        setLoading(false)
        return
      }
      setListing(data as ListingDetail)

      if (eventId) {
        const { data: eventRow } = await supabase
          .from('central_events')
          .select('id, slug, name, routing_mode, status')
          .eq('id', eventId)
          .eq('status', 'published')
          .maybeSingle()

        if (!cancelled && eventRow) {
          setEventContext(eventRow as EventContext)
          const { data: optIn } = await supabase
            .from('listing_event_availability')
            .select('id')
            .eq('event_id', eventId)
            .eq('listing_id', id)
            .eq('status', 'active')
            .maybeSingle()
          setEventOptInOk(Boolean(optIn))
        } else if (!cancelled) {
          setEventContext(null)
          setEventOptInOk(false)
        }
      } else {
        setEventContext(null)
        setEventOptInOk(true)
      }

      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [id, eventId])

  if (loading) return <PageSkeleton minHeight={240} />

  if (!listing) {
    return (
      <div className="finn-empty">
        <p>{t('finnListingNotFound')}</p>
        <Link href="/finn" className={buttonClassName('secondary')}>
          {t('finnNavSearch')}
        </Link>
      </div>
    )
  }

  const price =
    listing.tourism_nightly_price_cents != null
      ? `${Math.round(listing.tourism_nightly_price_cents / 100).toLocaleString('nb-NO')} kr`
      : null

  const eventBlocksBooking =
    Boolean(eventContext) &&
    (eventContext?.routing_mode !== 'turisme' || !eventOptInOk)

  const bookableEventId =
    eventContext?.routing_mode === 'turisme' && eventOptInOk ? eventContext.id : null

  return (
    <article>
      <Link href="/finn" className="finn-footer-link" style={{ marginBottom: 'var(--space-4)', display: 'inline-flex' }}>
        ← {t('finnBackToSearch')}
      </Link>
      {eventContext ? (
        <p className="finn-badge" style={{ marginBottom: 'var(--space-3)', display: 'inline-block' }}>
          {t('finnEventBookingContext').replace('{name}', eventContext.name)}
        </p>
      ) : null}
      <div className="finn-card" style={{ maxWidth: 720, marginBottom: 'var(--space-8)' }}>
        {listing.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.image_url}
            alt=""
            style={{ width: '100%', maxHeight: 360, objectFit: 'cover' }}
          />
        ) : (
          <div className="finn-card-image">{t('finnNoPhoto')}</div>
        )}
        <div className="finn-card-body" style={{ padding: 'var(--space-6)' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.5rem' }}>{listing.address}</h1>
          <p className="finn-card-meta">
            {listing.city}
            {listing.type ? ` · ${listing.type}` : ''}
            {listing.beds ? ` · ${listing.beds} ${t('finnBeds')}` : ''}
          </p>
          {price ? (
            <p className="finn-price" style={{ fontSize: '1.25rem', margin: 'var(--space-4) 0' }}>
              {t('finnFromPrice').replace('{price}', price)} / {t('finnPerNight')}
            </p>
          ) : null}
          {listing.tourism_instant_book ? (
            <span className="finn-badge" style={{ marginBottom: 8, display: 'inline-block' }}>
              {t('finnInstantBookBadge')}
            </span>
          ) : null}
          {listing.cancellation_policy ? (
            <p className="finn-card-meta" style={{ margin: '0 0 var(--space-4)' }}>
              {t('finnCancellationPolicy')}:{' '}
              {t(`finnCancellation_${listing.cancellation_policy}` as Parameters<typeof t>[0])}
            </p>
          ) : null}
          {listing.description ? (
            <p style={{ lineHeight: 1.6, margin: 'var(--space-4) 0 0', color: 'var(--finn-text-secondary)' }}>
              {listing.description}
            </p>
          ) : null}
        </div>
      </div>

      {eventBlocksBooking ? (
        <div className="finn-empty">
          <p>{t('finnEventBookingNotAllowed')}</p>
          {eventContext ? (
            <Link href={`/finn/arrangement/${eventContext.slug}`} className={buttonClassName('secondary')}>
              {t('finnNavEvents')}
            </Link>
          ) : null}
        </div>
      ) : (
        <BookingRequestForm
          listingId={listing.id}
          eventId={bookableEventId}
          nightlyPriceCents={listing.tourism_nightly_price_cents}
          listingAddress={`${listing.address}, ${listing.city}`}
          instantBook={listing.tourism_instant_book}
          cancellationPolicy={listing.cancellation_policy}
        />
      )}
    </article>
  )
}
