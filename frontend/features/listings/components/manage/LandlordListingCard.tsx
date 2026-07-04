'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Home as HomeIcon,
  Trash2,
  Edit3,
  Clock,
  FileText,
  Sparkles,
  Compass,
  CalendarDays,
} from 'lucide-react'
import { OptimizedPublicStorageImage } from '@/app/components/OptimizedPublicStorageImage'
import { publicContactInfoFormPdfUrl } from '@/app/lib/storagePublicUrl'
import { listingAvailabilityStatusToday } from '@/app/lib/listingAvailabilityStatusToday'
import { useLanguage } from '@/context/LanguageContext'
import StatusBadge from '@/app/components/design-system/StatusBadge'
import ListingTourismSettings from '@/features/listings/components/ListingTourismSettings'
import ListingCoHostsPanel from '@/features/listings/components/ListingCoHostsPanel'
import ListingEventOptIn from '@/features/listings/components/ListingEventOptIn'
import LandlordAvailabilityHub from '@/features/listings/components/LandlordAvailabilityHub'
import ListingAvailabilityOverview from '@/features/listings/components/ListingAvailabilityOverview'
import type { ListingEventOptInPeriod } from '@/features/listings/types/lanes'
import { type Ref } from 'react'
import '@/features/listings/landlord-manage.css'

export type ManagePanel = 'calendar' | 'events' | 'tourism'

type LandlordListingCardProps = {
  listing: {
    id: string
    address: string
    image_url?: string | null
    bedrooms: number
    size_sqm: number
    type: string
    tourism_enabled?: boolean | null
    tourism_nightly_price_cents?: number | null
    tourism_instant_book?: boolean | null
    cancellation_policy?: string | null
    tourism_check_in_guide?: string | null
  }
  availability: Record<string, any[]>
  eventOptIns: ListingEventOptInPeriod[]
  openPanel: { listingId: string; panel: ManagePanel } | null
  isMobileLayout: boolean
  centralEvents: boolean
  tourism: boolean
  eventCalendarOptIns: ListingEventOptInPeriod[]
  allPublishedEvents: ListingEventOptInPeriod[]
  listingPanelRef: Ref<HTMLDivElement>
  isTodayAvailableOrUnset: (listing: { id: string }) => boolean
  onOpenActionSheet: (listingId: string) => void
  onOpenListingPanel: (listingId: string, panel: ManagePanel) => void
  onClosePanel: () => void
  onOpenPeriodCalendar: (listingId: string, status: 'Tilgjengelig' | 'Utilgjengelig') => void
  onPendingDeleteListing: (listing: { id: string; address: string }) => void
  onListingUpdated: (listingId: string, patch: Record<string, unknown>) => void
  onAddPeriod: (
    listingId: string,
    startDate: string,
    endDate: string,
    status?: string
  ) => Promise<void>
  onDeletePeriod: (periodId: string, listingId: string) => Promise<void>
  onRefreshEvents: () => Promise<void>
}


export default function LandlordListingCard({
  listing,
  availability,
  eventOptIns,
  openPanel,
  isMobileLayout,
  centralEvents,
  tourism,
  eventCalendarOptIns,
  allPublishedEvents,
  listingPanelRef,
  isTodayAvailableOrUnset,
  onOpenActionSheet,
  onOpenListingPanel,
  onClosePanel,
  onOpenPeriodCalendar,
  onPendingDeleteListing,
  onListingUpdated,
  onAddPeriod,
  onDeletePeriod,
  onRefreshEvents,
}: LandlordListingCardProps) {
  const { t } = useLanguage()
  const router = useRouter()
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

  const isPanelOpen = openPanel?.listingId === listing.id
  const calendarPanelActive = isPanelOpen && openPanel?.panel === 'calendar'

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
              <button
                type="button"
                onClick={() => router.push(`/listings/${listing.id}?view=owner`)}
                className="hm-listing-title-link"
              >
                <h3>{listing.address}</h3>
              </button>
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
          {isMobileLayout ? (
            <button
              type="button"
              className="button hm-listing-actions-mobile"
              onClick={() => onOpenActionSheet(listing.id)}
            >
              {t('manageListingActions')}
            </button>
          ) : (
            <>
              {todaySt !== 'Formidla' && (
                <>
                  <div className="hm-status-actions">
                    {isTodayAvailableOrUnset(listing) ? (
                      <button
                        type="button"
                        onClick={() => onOpenPeriodCalendar(listing.id, 'Utilgjengelig')}
                        className="button hm-btn-unavailable"
                      >
                        {t('manageRentalNav')}
                      </button>
                    ) : todaySt === 'Utilgjengelig' ? (
                      <button
                        type="button"
                        onClick={() => onOpenPeriodCalendar(listing.id, 'Tilgjengelig')}
                        className="button hm-btn-available"
                      >
                        {t('markAvailable')}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenPeriodCalendar(listing.id, 'Utilgjengelig')}
                          className="button hm-btn-unavailable"
                        >
                          {t('manageRentalNav')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenPeriodCalendar(listing.id, 'Tilgjengelig')}
                          className="button hm-btn-available"
                        >
                          {t('markAvailable')}
                        </button>
                      </>
                    )}
                  </div>
                  <div className="hm-divider" />
                </>
              )}
              {todaySt !== 'Formidla' && (
                <div className="hm-icon-actions">
                  <button
                    type="button"
                    onClick={() =>
                      calendarPanelActive
                        ? onClosePanel()
                        : onOpenListingPanel(listing.id, 'calendar')
                    }
                    className={`hm-icon-btn${calendarPanelActive ? ' hm-icon-btn--active' : ''}`}
                    title={t('managePanelCalendar')}
                    aria-label={t('managePanelCalendar')}
                  >
                    <Clock size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/listings/${listing.id}?view=owner`)}
                    className="hm-icon-btn"
                    title={t('editListing')}
                    aria-label={t('editListing')}
                  >
                    <Edit3 size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => onPendingDeleteListing({ id: listing.id, address: listing.address })}
                    className="hm-icon-btn hm-icon-btn--danger"
                    title={t('delete')}
                    aria-label={t('delete')}
                  >
                    <Trash2 size={18} aria-hidden />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {todaySt !== 'Formidla' ? (
        <div className="hm-panel-chips" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="button hm-panel-chip"
            onClick={() => onOpenListingPanel(listing.id, 'calendar')}
          >
            <CalendarDays size={16} aria-hidden />
            {t('managePanelCalendar')}
          </button>
          {tourism ? (
            <button
              type="button"
              className="button button-secondary hm-panel-chip"
              onClick={() => onOpenListingPanel(listing.id, 'tourism')}
            >
              <Compass size={16} aria-hidden />
              {listing.tourism_enabled ? t('managePanelTourism') : t('tourismEnableBannerCta')}
            </button>
          ) : null}
          {centralEvents ? (
            <button
              type="button"
              className="button button-secondary hm-panel-chip"
              onClick={() => onOpenListingPanel(listing.id, 'events')}
            >
              <Sparkles size={16} aria-hidden />
              {t('managePanelEvents')}
            </button>
          ) : null}
        </div>
      ) : null}

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

      {openPanel && isPanelOpen && (
        <div ref={listingPanelRef} className="hm-listing-panel" onClick={(e) => e.stopPropagation()}>
          <div className="hm-listing-panel-header">
            <h4 className="hm-listing-panel-title">
              {openPanel.panel === 'events' ? (
                <>
                  <Sparkles size={16} /> {t('managePanelEvents')}
                </>
              ) : openPanel.panel === 'tourism' ? (
                <>
                  <Compass size={16} /> {t('managePanelTourism')}
                </>
              ) : (
                <>
                  <CalendarDays size={16} /> {t('managePanelCalendar')}
                </>
              )}
            </h4>
            <button type="button" onClick={onClosePanel} className="hm-listing-panel-close">
              {t('close')}
            </button>
          </div>

          {openPanel.panel === 'events' && centralEvents ? (
            <ListingEventOptIn listingId={listing.id} />
          ) : null}

          {openPanel.panel === 'tourism' && tourism ? (
            <>
              <ListingTourismSettings
                listingId={listing.id}
                initialEnabled={Boolean(listing.tourism_enabled)}
                initialNightlyPriceCents={
                  typeof listing.tourism_nightly_price_cents === 'number'
                    ? listing.tourism_nightly_price_cents
                    : null
                }
                initialInstantBook={Boolean(listing.tourism_instant_book)}
                initialCancellationPolicy={listing.cancellation_policy ?? 'moderate'}
                initialCheckInGuide={
                  typeof listing.tourism_check_in_guide === 'string'
                    ? listing.tourism_check_in_guide
                    : null
                }
                onUpdated={(patch) => onListingUpdated(listing.id, patch)}
              />
              {listing.tourism_enabled ? <ListingCoHostsPanel listingId={listing.id} /> : null}
            </>
          ) : null}

          {openPanel.panel === 'calendar' ? (
            <LandlordAvailabilityHub
              listing={listing}
              periods={availability[listing.id] ?? []}
              eventOptIns={eventCalendarOptIns}
              allPublishedEvents={allPublishedEvents}
              showTourism={tourism}
              showEvents={centralEvents}
              onAddPeriod={onAddPeriod}
              onDeletePeriod={(periodId, listingId) => void onDeletePeriod(periodId, listingId)}
              onRefreshEvents={onRefreshEvents}
              onOpenTourismSettings={() => onOpenListingPanel(listing.id, 'tourism')}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
