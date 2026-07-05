'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Share2, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import { usePlatformMode } from '@/context/PlatformModeContext'
import { PageSkeleton, InteractiveEmptyState } from '@/app/components/design-system'
import LandlordStripeConnect from '@/features/bookings/components/LandlordStripeConnect'
import { useLandlordListingsQuery } from '@/features/listings/hooks/useLandlordListingsQuery'
import { useLandlordBookingsQuery } from '@/features/bookings/hooks/useLandlordBookingsQuery'
import type {
  LandlordBookingRow,
  LandlordBookingsFilter,
} from '@/features/bookings/lib/landlordBookings'
import { filterLandlordBookings } from '@/features/bookings/lib/landlordBookings'
import LandlordBookingsTable from '@/features/bookings/components/LandlordBookingsTable'
import LandlordBookingDetailDrawer from '@/features/bookings/components/LandlordBookingDetailDrawer'

const FILTERS: LandlordBookingsFilter[] = ['all', 'pending', 'confirmed', 'history']

export default function LandlordBookingsPageClient() {
  const { t } = useLanguage()
  const { flags } = usePlatformMode()
  const router = useRouter()
  const [filter, setFilter] = useState<LandlordBookingsFilter>('all')
  const [rows, setRows] = useState<LandlordBookingRow[]>([])
  const [selectedBooking, setSelectedBooking] = useState<LandlordBookingRow | null>(null)

  const { myListings, loading: listingsLoading } = useLandlordListingsQuery({
    router,
    centralEvents: flags.centralEvents,
    onboardingRef: { current: null },
  })

  const listingIds = useMemo(() => myListings.map((listing) => listing.id as string), [myListings])

  const { data, isPending, isError, error, refetch } = useLandlordBookingsQuery(listingIds)

  useEffect(() => {
    setRows(data?.bookings ?? [])
  }, [data])

  const filteredCount = useMemo(
    () => filterLandlordBookings(rows, filter).length,
    [rows, filter]
  )

  const filterLabel = (value: LandlordBookingsFilter) => {
    switch (value) {
      case 'pending':
        return t('landlordBookingsFilterPending')
      case 'confirmed':
        return t('landlordBookingsFilterConfirmed')
      case 'history':
        return t('landlordBookingsFilterHistory')
      default:
        return t('landlordBookingsFilterAll')
    }
  }

  const handleBookingUpdated = (id: string, status: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)))
    setSelectedBooking((prev) => (prev?.id === id ? { ...prev, status } : prev))
  }

  const pageLoading = listingsLoading || (listingIds.length > 0 && isPending)

  if (!flags.stripeBookings) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-4)' }}>
        <p style={{ opacity: 0.8 }}>{t('landlordBookingsUnavailable')}</p>
      </div>
    )
  }

  if (pageLoading) {
    return <PageSkeleton minHeight={360} />
  }

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: 'var(--space-4)' }}>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <h1
          style={{
            margin: '0 0 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 'clamp(1.35rem, 2vw, 1.75rem)',
          }}
        >
          <CalendarDays size={28} aria-hidden />
          {t('landlordBookingsPageTitle')}
        </h1>
        <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.55 }}>{t('landlordBookingsPageLead')}</p>
      </div>

      <LandlordStripeConnect />

      {listingIds.length === 0 ? (
        <InteractiveEmptyState
          title={t('landlordBookingsNoListingsTitle')}
          description={t('landlordBookingsNoListingsDesc')}
          action={{
            label: t('registerNewProperty'),
            href: '/homeowner/register',
          }}
        />
      ) : isError ? (
        <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <AlertTriangle
            size={40}
            className="empty-state-icon"
            style={{ margin: '0 auto var(--space-3)', color: 'var(--color-danger, #ef4444)' }}
            aria-hidden
          />
          <p style={{ margin: '0 0 8px', fontWeight: 700 }}>{t('landlordBookingsErrorTitle')}</p>
          <p style={{ margin: '0 0 var(--space-4)', opacity: 0.75, lineHeight: 1.55 }}>
            {error instanceof Error ? error.message : t('landlordBookingsErrorDesc')}
          </p>
          <button type="button" className="button button-accent" onClick={() => void refetch()}>
            {t('retryLoad')}
          </button>
        </div>
      ) : rows.length === 0 ? (
        <InteractiveEmptyState
          title={t('landlordBookingsEmptyTitle')}
          description={t('landlordBookingsEmptyDesc')}
          icons={[
            <CalendarDays key="1" size={22} />,
            <Share2 key="2" size={22} />,
          ]}
          action={{
            label: t('landlordBookingsShareCta'),
            href: '/homeowner/manage',
          }}
        />
      ) : (
        <>
          <div
            role="tablist"
            aria-label={t('landlordBookingsPageTitle')}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 'var(--space-4)',
            }}
          >
            {FILTERS.map((value) => {
              const active = filter === value
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={active ? 'button button-accent' : 'button button-secondary'}
                  onClick={() => setFilter(value)}
                >
                  {filterLabel(value)}
                </button>
              )
            })}
          </div>

          {filteredCount === 0 ? (
            <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
              <p style={{ margin: 0, opacity: 0.75 }}>{t('landlordBookingsFilterEmpty')}</p>
            </div>
          ) : (
            <LandlordBookingsTable
              rows={rows}
              filter={filter}
              onRowClick={setSelectedBooking}
              onBookingUpdated={handleBookingUpdated}
            />
          )}
        </>
      )}

      <LandlordBookingDetailDrawer
        booking={selectedBooking}
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  )
}
