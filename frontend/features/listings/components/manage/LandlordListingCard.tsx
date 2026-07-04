'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home as HomeIcon, MoreHorizontal } from 'lucide-react'
import { OptimizedPublicStorageImage } from '@/app/components/OptimizedPublicStorageImage'
import PropertyCard from '@/app/components/design-system/PropertyCard'
import ListingStatusBadge from '@/app/components/design-system/ListingStatusBadge'
import ListingAvailabilityOverview from '@/features/listings/components/ListingAvailabilityOverview'
import LandlordListingCardMenu, {
  type LandlordListingMenuItem,
} from '@/features/listings/components/manage/LandlordListingCardMenu'
import { listingAvailabilityStatusToday } from '@/app/lib/listingAvailabilityStatusToday'
import { useLanguage } from '@/context/LanguageContext'
import type { ListingEventOptInPeriod } from '@/features/listings/types/lanes'
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
    tourism_enabled?: boolean | null
  }
  availability: Record<string, any[]>
  eventOptIns: ListingEventOptInPeriod[]
  isMobileLayout: boolean
  centralEvents: boolean
  tourism: boolean
  onOpenActionSheet: (listingId: string) => void
  onPendingDeleteListing: (listing: { id: string; address: string }) => void
}

export default function LandlordListingCard({
  listing,
  availability,
  eventOptIns,
  isMobileLayout,
  centralEvents,
  tourism,
  onOpenActionSheet,
  onPendingDeleteListing,
}: LandlordListingCardProps) {
  const { t } = useLanguage()
  const router = useRouter()
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

  const secondaryItems: LandlordListingMenuItem[] = [
    {
      id: 'messages',
      label: t('messagesToKommuneShort'),
      onSelect: () => router.push('/nav/messages'),
    },
    {
      id: 'edit',
      label: todaySt === 'Formidla' ? t('viewListing') : t('editListing'),
      onSelect: () => router.push(`/listings/${listing.id}?view=owner`),
    },
    ...(todaySt !== 'Formidla'
      ? [
          {
            id: 'delete',
            label: t('delete'),
            tone: 'danger' as const,
            onSelect: () => onPendingDeleteListing({ id: listing.id, address: listing.address }),
          },
        ]
      : []),
  ]

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
      footer={
        todaySt !== 'Formidla' ? (
          <ListingAvailabilityOverview
            listingId={listing.id}
            periods={availability[listing.id] ?? []}
            eventOptIns={eventOptIns}
            tourismEnabled={Boolean(listing.tourism_enabled)}
            showTourism={tourism}
            showEvents={centralEvents}
          />
        ) : null
      }
      actions={
        <div className="hm-listing-card-actions">
          <Link href={hubHref} className={buttonClassName('accent', 'hm-open-listing-cta')}>
            {t('manageOpenListing')}
          </Link>
          {isMobileLayout ? (
            <button
              type="button"
              className="hm-listing-card-actions__sheet-trigger"
              aria-label={t('manageListingActions')}
              onClick={() => onOpenActionSheet(listing.id)}
            >
              <MoreHorizontal size={18} aria-hidden />
            </button>
          ) : (
            <LandlordListingCardMenu items={secondaryItems} label={t('manageListingActions')} />
          )}
        </div>
      }
    />
  )
}
