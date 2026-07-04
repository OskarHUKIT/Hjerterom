'use client'

import Link from 'next/link'
import { Home as HomeIcon } from 'lucide-react'
import { OptimizedPublicStorageImage } from '@/app/components/OptimizedPublicStorageImage'
import PropertyCard from '@/app/components/design-system/PropertyCard'
import ListingStatusBadge from '@/app/components/design-system/ListingStatusBadge'
import { listingAvailabilityStatusToday } from '@/app/lib/listingAvailabilityStatusToday'
import { useLanguage } from '@/context/LanguageContext'
import { buttonClassName } from '@/app/components/ui/Button'
import '@/features/listings/landlord-manage.css'

type LandlordListingCardProps = {
  listing: {
    id: string
    address: string
    image_url?: string | null
    bedrooms: number
    size_sqm: number
    type: string
  }
  availability: Record<string, any[]>
  isMobileLayout: boolean
}

export default function LandlordListingCard({
  listing,
  availability,
  isMobileLayout,
}: LandlordListingCardProps) {
  const { t } = useLanguage()
  const todaySt = listingAvailabilityStatusToday(listing.id, availability)
  const hubHref = `/homeowner/listings/${listing.id}`

  const translateType = (type: string) => {
    if (!type) return ''
    const mapping: Record<string, string> = {
      'Short-term': t('shortTerm'),
      'Long-term': t('longTerm'),
      Apartment: t('apartment'),
      House: t('house'),
      Shared: t('shared'),
    }
    return mapping[type] || type
  }

  const meta = isMobileLayout
    ? `${listing.bedrooms} ${t('bedroomsUnit')} • ${listing.size_sqm} m²`
    : `${translateType(listing.type)} • ${listing.bedrooms} ${t('bedroomsUnit')} • ${listing.size_sqm} m²`

  const thumb = listing.image_url ? (
    <OptimizedPublicStorageImage
      variant="fill"
      src={listing.image_url}
      alt=""
      sizes="120px"
      className="ds-property-card__thumb-img"
    />
  ) : (
    <div className="ds-property-card__placeholder ds-property-card__placeholder--icon">
      <HomeIcon size={30} aria-hidden />
    </div>
  )

  return (
    <PropertyCard
      layout="row"
      className="hm-listing-card"
      title={listing.address}
      meta={meta}
      image={thumb}
      status={<ListingStatusBadge availability={todaySt} />}
      actions={
        <Link href={hubHref} className={buttonClassName('accent', 'hm-open-listing-cta')}>
          {t('manageAdministrer')}
        </Link>
      }
    />
  )
}
