'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Heart, Star } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { GalleryGrid, PageSkeleton } from '@/app/components/design-system'
import { buttonClassName } from '@/app/components/ui/Button'
import BookingRequestForm from '@/features/tourism/components/BookingRequestForm'
import { ListingCoverPlaceholder } from '@/features/listings/components/ListingPhotoManager'
import { buildListingImageEntries } from '@/features/listings/lib/listingImageMetadata'
import '@/features/listings/listing-photo-manager.css'
import { normalizeListingImageUrls } from '@/features/listings/lib/listingDetailsUtils'
import { useFinnListingDetail } from './useFinnListingDetail'

export default function FinnListingMobile() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const eventId = searchParams.get('event')
  const id = params?.id
  const { t } = useLanguage()
  const { listing, eventContext, eventOptInOk, loading, reviewSummary } = useFinnListingDetail(id, eventId)
  const [showBooking, setShowBooking] = useState(false)

  if (loading) return <PageSkeleton minHeight={240} />

  if (!listing) {
    return (
      <div className="finn-empty" style={{ paddingTop: 24 }}>
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
    Boolean(eventContext) && (eventContext?.routing_mode !== 'turisme' || !eventOptInOk)

  const bookableEventId =
    eventContext?.routing_mode === 'turisme' && eventOptInOk ? eventContext.id : null

  const images = normalizeListingImageUrls(listing.image_urls)
  const heroImages = images.length > 0 ? images : listing.image_url ? [listing.image_url] : []
  const galleryImages = buildListingImageEntries(heroImages, listing.image_alts, listing.address).map(
    (e) => ({ src: e.url, alt: e.alt || listing.address })
  )

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
          <ListingCoverPlaceholder label={t('finnNoPhoto')} className="finn-card-image" />
        )}
        <button
          type="button"
          onClick={() => router.push('/finn')}
          aria-label={t('finnBackToSearch')}
          className="finn-listing-overlay-btn finn-listing-overlay-btn--left"
        >
          <ArrowLeft size={20} aria-hidden />
        </button>
        <button type="button" aria-label={t('finnWishlistSave')} className="finn-listing-overlay-btn finn-listing-overlay-btn--right">
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
          <button
            type="button"
            className="finn-cta-primary"
            style={{ width: 'auto', padding: '12px 24px' }}
            onClick={() => setShowBooking(true)}
          >
            {t('finnReserveCta')}
          </button>
        </div>
      ) : null}
    </article>
  )
}
