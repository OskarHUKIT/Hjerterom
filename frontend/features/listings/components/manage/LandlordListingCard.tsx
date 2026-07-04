'use client'

import Link from 'next/link'
import { Home as HomeIcon, FileText } from 'lucide-react'
import { OptimizedPublicStorageImage } from '@/app/components/OptimizedPublicStorageImage'
import { publicContactInfoFormPdfUrl } from '@/app/lib/storagePublicUrl'
import { listingAvailabilityStatusToday } from '@/app/lib/listingAvailabilityStatusToday'
import { useLanguage } from '@/context/LanguageContext'
import StatusBadge from '@/app/components/design-system/StatusBadge'
import ListingAvailabilityOverview from '@/features/listings/components/ListingAvailabilityOverview'
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
}

export default function LandlordListingCard({
  listing,
  availability,
  eventOptIns,
  isMobileLayout,
  centralEvents,
  tourism,
}: LandlordListingCardProps) {
  const { t } = useLanguage()
  const todaySt = listingAvailabilityStatusToday(listing.id, availability)

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

  return (
    <div className="card hm-listing-card">
      <div className="hm-listing-row">
        <div className="hm-listing-main">
          <div className="hm-listing-thumb">
            {listing.image_url ? (
              <OptimizedPublicStorageImage
                variant="fill"
                src={listing.image_url}
                alt=""
                sizes="100px"
                className="hm-listing-thumb-img"
              />
            ) : (
              <div className="hm-listing-thumb-placeholder">
                <HomeIcon size={30} />
              </div>
            )}
          </div>
          <div className="hm-listing-title-block">
            <div className="hm-listing-title-row">
              <h3 className="hm-listing-title-static">{listing.address}</h3>
              <StatusBadge
                label={
                  todaySt === 'Formidla'
                    ? t('formidlet')
                    : todaySt === 'Utilgjengelig'
                      ? t('unavailable')
                      : t('available')
                }
                variant={
                  todaySt === 'Formidla'
                    ? 'info'
                    : todaySt === 'Utilgjengelig'
                      ? 'danger'
                      : 'success'
                }
              />
            </div>
            <p className="text-sm hm-listing-meta">
              {isMobileLayout
                ? `${listing.bedrooms} ${t('bedroomsUnit')} • ${listing.size_sqm} m²`
                : `${translateType(listing.type)} • ${listing.bedrooms} ${t('bedroomsUnit')} • ${listing.size_sqm} m²`}
            </p>
            {todaySt !== 'Formidla' ? (
              <ListingAvailabilityOverview
                listingId={listing.id}
                periods={availability[listing.id] ?? []}
                eventOptIns={eventOptIns}
                tourismEnabled={Boolean(listing.tourism_enabled)}
                showTourism={tourism}
                showEvents={centralEvents}
              />
            ) : null}
          </div>
        </div>

        <div className="hm-listing-actions-row" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/homeowner/listings/${listing.id}`}
            className={buttonClassName('accent', 'hm-administrer-cta')}
          >
            {t('manageAdministrer')}
          </Link>
        </div>
      </div>

      {todaySt === 'Formidla' && !isMobileLayout && (
        <div className="hm-formidlet-banner" onClick={(e) => e.stopPropagation()}>
          <div className="hm-formidlet-actions">
            <a
              href={publicContactInfoFormPdfUrl()}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="button hm-formidlet-link"
            >
              <FileText size={16} /> {t('contactInfoForm')}
            </a>
            <Link href={`/report/utleier/${listing.id}`} className="button hm-formidlet-handover-link">
              <FileText size={16} /> {t('fillHandoverReport')}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
