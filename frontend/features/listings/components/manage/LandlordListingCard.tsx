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
import ListingTourismSettings from '@/features/listings/components/ListingTourismSettings'
import ListingCoHostsPanel from '@/features/listings/components/ListingCoHostsPanel'
import ListingEventOptIn from '@/features/listings/components/ListingEventOptIn'
import LandlordAvailabilityHub from '@/features/listings/components/LandlordAvailabilityHub'
import ListingAvailabilityOverview from '@/features/listings/components/ListingAvailabilityOverview'
import type { ListingEventOptInPeriod } from '@/features/listings/types/lanes'
import { type Ref } from 'react'

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

  return (
    <div
      className="card hm-listing-card"
      style={{
        padding: 'var(--space-4) var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      <div
        className="hm-listing-row"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-4)',
            alignItems: 'center',
            flex: '1 1 200px',
            minWidth: 0,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100px',
              height: '70px',
              borderRadius: '10px',
              overflow: 'hidden',
              background: 'var(--bg-app)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {listing.image_url ? (
              <OptimizedPublicStorageImage
                variant="fill"
                src={listing.image_url}
                alt=""
                sizes="100px"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-sky-blue)',
                  opacity: 0.3,
                }}
              >
                <HomeIcon size={30} />
              </div>
            )}
          </div>
          <div className="hm-listing-title-block">
            <div
              className="hm-listing-title-row"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
            >
              <button
                type="button"
                onClick={() => router.push(`/listings/${listing.id}?view=owner`)}
                style={{
                  margin: 0,
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  font: 'inherit',
                  color: 'inherit',
                }}
              >
                <h3 style={{ margin: 0 }}>{listing.address}</h3>
              </button>
              {todaySt === 'Formidla' ? (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: 'var(--color-sky-blue)',
                    textTransform: 'uppercase',
                  }}
                >
                  {t('formidlet')}
                </span>
              ) : todaySt === 'Utilgjengelig' ? (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    textTransform: 'uppercase',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  {t('unavailable')}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(45, 212, 191, 0.15)',
                    color: 'var(--color-teal)',
                    textTransform: 'uppercase',
                    border: '1px solid rgba(45, 212, 191, 0.3)',
                  }}
                >
                  {t('available')}
                </span>
              )}
            </div>
            <p className="text-sm" style={{ marginTop: '4px' }}>
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

        <div
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {isMobileLayout ? (
            <button
              type="button"
              className="button"
              onClick={() => onOpenActionSheet(listing.id)}
              style={{
                width: '100%',
                maxWidth: '100%',
                flex: 1,
                justifyContent: 'center',
                padding: 'var(--space-3) var(--space-4)',
                fontSize: '0.9rem',
              }}
            >
              {t('manageListingActions')}
            </button>
          ) : (
            <>
              {todaySt !== 'Formidla' && (
                <>
                  <div
                    className="hm-status-actions"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-2)',
                      minWidth: '200px',
                    }}
                  >
                    {isTodayAvailableOrUnset(listing) ? (
                      <button
                        type="button"
                        onClick={() => onOpenPeriodCalendar(listing.id, 'Utilgjengelig')}
                        className="button"
                        style={{
                          padding: 'var(--space-2) var(--space-4)',
                          fontSize: '0.85rem',
                          borderRadius: '8px',
                          width: '100%',
                          background: 'rgba(239, 68, 68, 0.12)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          cursor: 'pointer',
                        }}
                      >
                        {t('manageRentalNav')}
                      </button>
                    ) : todaySt === 'Utilgjengelig' ? (
                      <button
                        type="button"
                        onClick={() => onOpenPeriodCalendar(listing.id, 'Tilgjengelig')}
                        className="button"
                        style={{
                          padding: 'var(--space-2) var(--space-4)',
                          fontSize: '0.85rem',
                          borderRadius: '8px',
                          width: '100%',
                          background: 'rgba(32, 187, 175, 0.12)',
                          color: 'var(--color-teal)',
                          border: '1px solid rgba(32, 187, 175, 0.25)',
                          cursor: 'pointer',
                        }}
                      >
                        {t('markAvailable')}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenPeriodCalendar(listing.id, 'Utilgjengelig')}
                          className="button"
                          style={{
                            padding: 'var(--space-2) var(--space-4)',
                            fontSize: '0.85rem',
                            borderRadius: '8px',
                            width: '100%',
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            cursor: 'pointer',
                          }}
                        >
                          {t('manageRentalNav')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenPeriodCalendar(listing.id, 'Tilgjengelig')}
                          className="button"
                          style={{
                            padding: 'var(--space-2) var(--space-4)',
                            fontSize: '0.85rem',
                            borderRadius: '8px',
                            width: '100%',
                            background: 'rgba(32, 187, 175, 0.12)',
                            color: 'var(--color-teal)',
                            border: '1px solid rgba(32, 187, 175, 0.25)',
                            cursor: 'pointer',
                          }}
                        >
                          {t('markAvailable')}
                        </button>
                      </>
                    )}
                  </div>
                  <div
                    style={{
                      width: '1px',
                      height: '32px',
                      background: 'var(--border-subtle)',
                      alignSelf: 'stretch',
                    }}
                  />
                </>
              )}
              {todaySt !== 'Formidla' && (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button
                    type="button"
                    onClick={() =>
                      isPanelOpen && openPanel?.panel === 'calendar'
                        ? onClosePanel()
                        : onOpenListingPanel(listing.id, 'calendar')
                    }
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background:
                        isPanelOpen && openPanel?.panel === 'calendar'
                          ? 'rgba(59, 130, 246, 0.2)'
                          : 'var(--bg-app)',
                      border: 'none',
                      cursor: 'pointer',
                      color:
                        isPanelOpen && openPanel?.panel === 'calendar'
                          ? 'var(--color-accent)'
                          : 'var(--text-main)',
                    }}
                    title={t('managePanelCalendar')}
                    aria-label={t('managePanelCalendar')}
                  >
                    <Clock size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/listings/${listing.id}?view=owner`)}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: 'var(--bg-app)',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-main)',
                    }}
                    title={t('editListing')}
                    aria-label={t('editListing')}
                  >
                    <Edit3 size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => onPendingDeleteListing({ id: listing.id, address: listing.address })}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#ef4444',
                    }}
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
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}
        >
          <button
            type="button"
            className="button"
            onClick={() => onOpenListingPanel(listing.id, 'calendar')}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CalendarDays size={16} aria-hidden />
            {t('managePanelCalendar')}
          </button>
          {tourism ? (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => onOpenListingPanel(listing.id, 'tourism')}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Compass size={16} aria-hidden />
              {listing.tourism_enabled ? t('managePanelTourism') : t('tourismEnableBannerCta')}
            </button>
          ) : null}
          {centralEvents ? (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => onOpenListingPanel(listing.id, 'events')}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Sparkles size={16} aria-hidden />
              {t('managePanelEvents')}
            </button>
          ) : null}
        </div>
      ) : null}

      {todaySt === 'Formidla' && !isMobileLayout && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            padding: 'var(--space-4)',
            background: 'rgba(59, 130, 246, 0.08)',
            borderRadius: '12px',
            border: '1px solid rgba(59, 130, 246, 0.25)',
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <a
              href={publicContactInfoFormPdfUrl()}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="button"
              style={{
                padding: 'var(--space-2) var(--space-4)',
                fontSize: '0.9rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                textDecoration: 'none',
              }}
            >
              <FileText size={16} /> {t('contactInfoForm')}
            </a>
            <Link
              href={`/report/utleier/${listing.id}`}
              className="button"
              style={{
                padding: 'var(--space-2) var(--space-4)',
                fontSize: '0.9rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                textDecoration: 'none',
                background: 'var(--color-teal)',
                color: 'white',
                border: 'none',
              }}
            >
              <FileText size={16} /> {t('fillHandoverReport')}
            </Link>
          </div>
        </div>
      )}

      {openPanel && isPanelOpen && (
        <div
          ref={listingPanelRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            padding: 'var(--space-4)',
            background: 'rgba(59, 130, 246, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(59, 130, 246, 0.1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-3)',
              flexWrap: 'wrap',
              gap: 'var(--space-2)',
            }}
          >
            <h4
              style={{
                margin: 0,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
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
            <button
              type="button"
              onClick={onClosePanel}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
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
