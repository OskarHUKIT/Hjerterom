'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Heart, Star } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { GalleryGrid, PageSkeleton } from '@/app/components/design-system'
import BookingRequestForm from '@/features/tourism/components/BookingRequestForm'
import { normalizeListingImageUrls } from '@/features/listings/lib/listingDetailsUtils'

type ListingDetail = {
  id: string
  address: string
  city: string
  description: string | null
  tourism_nightly_price_cents: number | null
  tourism_instant_book: boolean
  cancellation_policy: string | null
  image_url: string | null
  image_urls: unknown
  type: string | null
  beds: number | null
  map_lat: number | null
  map_lng: number | null
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
  const router = useRouter()
  const eventId = searchParams.get('event')
  const id = params?.id
  const { t } = useLanguage()
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [eventContext, setEventContext] = useState<EventContext | null>(null)
  const [eventOptInOk, setEventOptInOk] = useState(true)
  const [loading, setLoading] = useState(true)
  const [reviewSummary, setReviewSummary] = useState<{ count: number; avg_rating: number } | null>(null)
  const [showBooking, setShowBooking] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      const { data } = await supabase
        .from('listings')
        .select(
          'id, address, city, description, tourism_nightly_price_cents, tourism_instant_book, cancellation_policy, image_url, image_urls, type, beds, tourism_enabled, map_lat, map_lng'
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
      const { data: rev } = await supabase.rpc('get_listing_review_summary', { p_listing_id: id })
      if (!cancelled && rev && typeof rev === 'object') {
        const r = rev as { count?: number; avg_rating?: number }
        if ((r.count ?? 0) > 0) setReviewSummary({ count: r.count ?? 0, avg_rating: Number(r.avg_rating ?? 0) })
      }

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
      <div className="finn-empty" style={{ paddingTop: 24 }}>
        <p>{t('finnListingNotFound')}</p>
        <Link href="/finn" className="finn-footer-link">
          {t('finnBackToSearch')}
        </Link>
      </div>
    )
  }

  const price =
    listing.tourism_nightly_price_cents != null
      ? `${Math.round(listing.tourism_nightly_price_cents / 100).toLocaleString('nb-NO')} kr`
      : null

  const eventBlocksBooking =
    Boolean(eventContext) && (eventContext?.routing_mode !== 'turisme' || !eventOptInOk)

  const bookableEventId =
    eventContext?.routing_mode === 'turisme' && eventOptInOk ? eventContext.id : null

  const images = normalizeListingImageUrls(listing.image_urls)
  const heroImages = images.length > 0 ? images : listing.image_url ? [listing.image_url] : []
  const galleryImages = heroImages.map((src) => ({ src, alt: listing.address }))

  return (
    <article className="finn-anim-fade-up">
      <div style={{ position: 'relative', aspectRatio: '4 / 3' }}>
        {galleryImages.length > 0 ? (
          <GalleryGrid
            images={galleryImages}
            variant="simple"
            closeLabel={t('close')}
            prevLabel={t('finnGalleryPrev')}
            nextLabel={t('finnGalleryNext')}
          />
        ) : (
          <div className="finn-card-image">{t('finnNoPhoto')}</div>
        )}
        <button
          type="button"
          onClick={() => router.push('/finn')}
          aria-label={t('finnBackToSearch')}
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            width: 40,
            height: 40,
            borderRadius: 999,
            border: 'none',
            background: 'color-mix(in srgb, #000 30%, transparent)',
            backdropFilter: 'blur(4px)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 2,
          }}
        >
          <ArrowLeft size={20} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={t('finnWishlistSave')}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 40,
            height: 40,
            borderRadius: 999,
            border: 'none',
            background: 'color-mix(in srgb, #000 30%, transparent)',
            backdropFilter: 'blur(4px)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 2,
          }}
        >
          <Heart size={20} aria-hidden />
        </button>
      </div>

      <div style={{ padding: '16px 0 96px' }}>
        {eventContext ? (
          <p className="finn-badge" style={{ marginBottom: 12, display: 'inline-block' }}>
            {t('finnEventBookingContext').replace('{name}', eventContext.name)}
          </p>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.35 }}>{listing.address}</h1>
          {reviewSummary ? (
            <span className="finn-listing-card__rating">
              <Star size={16} fill="currentColor" aria-hidden />
              {reviewSummary.avg_rating.toFixed(2)}
            </span>
          ) : null}
        </div>
        <p className="finn-card-meta" style={{ margin: '4px 0' }}>
          {listing.city}
        </p>
        <p className="finn-card-meta">
          {listing.type ?? ''}
          {listing.beds ? ` · ${listing.beds} ${t('finnBeds')}` : ''}
          {reviewSummary ? ` · ${reviewSummary.count} ${t('finnReviews')}` : ''}
        </p>

        <div style={{ marginTop: 12 }}>
          <span className="finn-listing-card__badge finn-listing-card__badge--lane">{t('finnLaneTourismBadge')}</span>
        </div>

        {listing.description ? (
          <p style={{ margin: '16px 0', fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--finn-text-secondary)' }}>
            {listing.description}
          </p>
        ) : null}

        {listing.tourism_instant_book ? (
          <span className="finn-badge" style={{ display: 'inline-block', marginBottom: 8 }}>
            {t('finnInstantBookBadge')}
          </span>
        ) : null}

        {showBooking && !eventBlocksBooking ? (
          <div style={{ marginTop: 16 }}>
            <BookingRequestForm
              listingId={listing.id}
              eventId={bookableEventId}
              nightlyPriceCents={listing.tourism_nightly_price_cents}
              listingAddress={`${listing.address}, ${listing.city}`}
              instantBook={listing.tourism_instant_book}
              cancellationPolicy={listing.cancellation_policy}
            />
          </div>
        ) : eventBlocksBooking ? (
          <div className="finn-empty" style={{ marginTop: 16 }}>
            <p>{t('finnEventBookingNotAllowed')}</p>
          </div>
        ) : null}
      </div>

      {!eventBlocksBooking && price ? (
        <div className="finn-detail-cta">
          <div>
            <p style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <strong style={{ fontSize: '1.125rem' }}>{price}</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--finn-text-muted)' }}>/ {t('finnPerNight')}</span>
            </p>
          </div>
          <button type="button" className="finn-cta-primary" style={{ width: 'auto', padding: '12px 24px' }} onClick={() => setShowBooking(true)}>
            {t('finnReserveCta')}
          </button>
        </div>
      ) : null}
    </article>
  )
}
