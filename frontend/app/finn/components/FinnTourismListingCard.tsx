'use client'

import Link from 'next/link'
import { Heart, Star } from 'lucide-react'
import { OptimizedPublicStorageImage } from '@/app/components/OptimizedPublicStorageImage'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import { ListingCoverPlaceholder } from '@/features/listings/components/ListingPhotoManager'
import type { FinnListingCard } from '@/features/tourism/types/finn'
import { formatFinnNightlyPrice } from '@/features/tourism/types/finn'

type FinnTourismListingCardProps = {
  listing: FinnListingCard
  href: string
  staggerClass?: string
  wishlisted?: boolean
  onToggleWishlist?: (id: string) => void
  rating?: number | null
}

export default function FinnTourismListingCard({
  listing,
  href,
  staggerClass,
  wishlisted,
  onToggleWishlist,
  rating,
}: FinnTourismListingCardProps) {
  const { t } = useLanguage()
  const toast = useToast()
  const price = formatFinnNightlyPrice(listing.tourism_nightly_price_cents)

  const bedsLabel = listing.beds
    ? `${listing.beds} ${t('finnBeds')}`
    : undefined

  const typeLine = [listing.type, bedsLabel].filter(Boolean).join(' · ')

  return (
    <article className={`finn-anim-fade-up${staggerClass ? ` ${staggerClass}` : ''}`}>
      <Link href={href} className="finn-listing-card">
        <div className="finn-listing-card__media">
          {listing.image_url ? (
            <OptimizedPublicStorageImage
              variant="fill"
              src={listing.image_url}
              alt={listing.address}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
              className="finn-listing-card__cover-img"
            />
          ) : (
            <ListingCoverPlaceholder label={t('finnNoPhoto')} />
          )}
          {onToggleWishlist ? (
            <button
              type="button"
              className={`finn-listing-card__wishlist${wishlisted ? ' finn-listing-card__wishlist--saved' : ''}`}
              aria-label={wishlisted ? t('finnWishlistRemove') : t('finnWishlistSave')}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleWishlist(listing.id)
                toast(wishlisted ? t('finnWishlistRemoved') : t('finnWishlistSaved'), 'success')
              }}
            >
              <Heart size={18} fill={wishlisted ? 'currentColor' : 'none'} aria-hidden />
            </button>
          ) : null}
          <div className="finn-listing-card__badges">
            <span className="finn-listing-card__badge finn-listing-card__badge--lane">{t('finnLaneTourism')}</span>
          </div>
        </div>
        <div>
          <div className="finn-listing-card__head">
            <h3 className="finn-listing-card__title">{listing.address}</h3>
            {rating != null && rating > 0 ? (
              <span className="finn-listing-card__rating">
                <Star size={14} fill="currentColor" aria-hidden />
                {rating.toFixed(2)}
              </span>
            ) : null}
          </div>
          {typeLine ? <p className="finn-listing-card__line">{typeLine}</p> : null}
          <p className="finn-listing-card__line finn-listing-card__line--muted">{listing.city}</p>
          {price ? (
            <p className="finn-listing-card__price">
              <strong>{price}</strong>
              <span className="finn-listing-card__line--muted">/ {t('finnPerNight')}</span>
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  )
}
