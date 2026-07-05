'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import { PageSkeleton } from '@/app/components/design-system'
import { buttonClassName } from '@/app/components/ui/Button'
import BookingRequestForm from '@/features/tourism/components/BookingRequestForm'
import { normalizeListingImageUrls } from '@/features/listings/lib/listingDetailsUtils'
import { useFinnListingDetail } from './useFinnListingDetail'

export default function FinnListingDesktop() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('event')
  const id = params?.id
  const { t } = useLanguage()
  const { listing, eventContext, eventOptInOk, loading, reviewSummary } = useFinnListingDetail(id, eventId)

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
    Boolean(eventContext) && (eventContext?.routing_mode !== 'turisme' || !eventOptInOk)

  const bookableEventId =
    eventContext?.routing_mode === 'turisme' && eventOptInOk ? eventContext.id : null

  const images = normalizeListingImageUrls(listing.image_urls)
  const heroImages = images.length > 0 ? images : listing.image_url ? [listing.image_url] : []

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
        {heroImages.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: heroImages.length > 1 ? '1fr 1fr' : '1fr', gap: 4 }}>
            {heroImages.slice(0, 4).map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                style={{ width: '100%', maxHeight: 280, objectFit: 'cover' }}
              />
            ))}
          </div>
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
          {reviewSummary ? (
            <p className="finn-card-meta" style={{ marginBottom: 8 }}>
              ★ {reviewSummary.avg_rating} · {reviewSummary.count} {t('finnReviews')}
            </p>
          ) : null}
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
