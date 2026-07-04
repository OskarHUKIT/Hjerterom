'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Edit3, Home as HomeIcon, Trash2 } from 'lucide-react'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import LoadingPlaceholder from '@/app/components/LoadingPlaceholder'
import { EmptyState, useToast } from '@/app/components/design-system'
import ListingStatusBadge from '@/app/components/design-system/ListingStatusBadge'
import { OptimizedPublicStorageImage } from '@/app/components/OptimizedPublicStorageImage'
import { listingAvailabilityStatusToday } from '@/app/lib/listingAvailabilityStatusToday'
import { isKommuneSocialActiveForCity } from '@/app/lib/kommuneSocialSubscription'
import { usePlatformMode } from '@/context/PlatformModeContext'
import { useListingAvailability } from '@/features/listings/hooks/useListingAvailability'
import { useListingEventCalendarData } from '@/features/listings/hooks/useListingEventCalendarData'
import LandlordAvailabilityHub from '@/features/listings/components/LandlordAvailabilityHub'
import ListingLaneBentoRow from '@/features/listings/components/hub/ListingLaneBentoRow'
import ListingHubSettingsAccordion from '@/features/listings/components/hub/ListingHubSettingsAccordion'
import ConfirmDeleteDialog from '@/features/listings/components/ConfirmDeleteDialog'
import { buttonClassName } from '@/app/components/ui/Button'
import '@/features/listings/listing-hub.css'

type Props = {
  listingId: string
}

export default function ListingHubPage({ listingId }: Props) {
  const { t } = useLanguage()
  const toast = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { flags: platformFlags } = usePlatformMode()
  const openSection = searchParams.get('section')?.trim() || null

  const [listing, setListing] = useState<any | null>(null)
  const [availability, setAvailability] = useState<Record<string, any[]>>({})
  const [eventOptIns, setEventOptIns] = useState<any[]>([])
  const [socialKommuneActive, setSocialKommuneActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [pendingDeleteListing, setPendingDeleteListing] = useState<{
    id: string
    address: string
  } | null>(null)
  const [pendingDeletePeriod, setPendingDeletePeriod] = useState<{
    id: string
    listingId: string
  } | null>(null)

  const { activeOptIns: eventCalendarOptIns } = useListingEventCalendarData(listingId)

  const fetchListing = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const user = await getAuthUserDeduped()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: row, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .eq('owner_id', user.id)
        .maybeSingle()

      if (error) throw error
      if (!row) {
        setFetchError('not_found')
        setListing(null)
        return
      }

      const [{ data: periods }, socialActive] = await Promise.all([
        supabase
          .from('listing_availability')
          .select('*')
          .eq('listing_id', listingId)
          .order('start_date', { ascending: true }),
        isKommuneSocialActiveForCity(supabase, row.city?.trim() || ''),
      ])

      setListing(row)
      setAvailability({ [listingId]: periods ?? [] })
      setSocialKommuneActive(socialActive)
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : t('manageDataLoadTimeout'))
    } finally {
      setLoading(false)
    }
  }, [listingId, router, t])

  useEffect(() => {
    void fetchListing()
  }, [fetchListing])

  useEffect(() => {
    setEventOptIns(eventCalendarOptIns)
  }, [eventCalendarOptIns])

  const availabilityErrorContextRef = { current: 'add' as 'add' | 'delete' }
  const { addPeriod, deletePeriod } = useListingAvailability(availability, setAvailability, {
    onConflict: () => toast(t('availabilityConflict'), 'error'),
    onError: (message) => {
      toast(
        availabilityErrorContextRef.current === 'delete'
          ? t('errDeletePeriod') + message
          : t('errSaveListing') + message,
        'error'
      )
    },
  })

  const addAvailability = async (
    lid: string,
    startDate: string,
    endDate: string,
    status: string = 'Tilgjengelig'
  ) => {
    availabilityErrorContextRef.current = 'add'
    const result = await addPeriod({
      listingId: lid,
      start: startDate,
      end: endDate,
      status: status as 'Tilgjengelig' | 'Utilgjengelig' | 'Formidla',
    })
    if (!result.ok) return

    if (status === 'Tilgjengelig' || status === 'Utilgjengelig') {
      await supabase
        .from('listings')
        .update({ status, is_available: status === 'Tilgjengelig' })
        .eq('id', lid)
      setListing((prev: any) =>
        prev ? { ...prev, status, is_available: status === 'Tilgjengelig' } : prev
      )
    }
  }

  const deleteAvailability = async (id: string, lid: string) => {
    availabilityErrorContextRef.current = 'delete'
    const result = await deletePeriod(id, lid)
    if (result.ok) setPendingDeletePeriod(null)
  }

  const executeDeleteListing = async () => {
    if (!pendingDeleteListing || !listing) return
    const { id, address } = pendingDeleteListing
    if (listingAvailabilityStatusToday(id, availability) === 'Formidla') {
      toast(t('ownerCannotEditListingWhenFormidlet'), 'error')
      setPendingDeleteListing(null)
      return
    }

    try {
      const { error } = await supabase.from('listings').delete().eq('id', id)
      if (error) throw error

      const user = await getAuthUserDeduped()
      await supabase.from('audit_logs').insert([
        {
          user_id: user?.id,
          action_type: 'DELETE_LISTING',
          listing_address: address,
          details: { address },
        },
      ])

      toast(t('listingHubDeleted'), 'success')
      router.push('/homeowner/manage')
    } catch (err: unknown) {
      toast(t('errDeleteGeneric') + (err instanceof Error ? err.message : ''), 'error')
    } finally {
      setPendingDeleteListing(null)
    }
  }

  if (loading) {
    return (
      <main className="container listing-hub-page">
        <LoadingPlaceholder minHeight={200} />
      </main>
    )
  }

  if (fetchError === 'not_found' || !listing) {
    return (
      <main className="container listing-hub-page">
        <EmptyState
          title={t('listingHubNotFound')}
          action={
            <Link href="/homeowner/manage" className={buttonClassName('accent')}>
              {t('listingHubBackManage')}
            </Link>
          }
        />
      </main>
    )
  }

  const todaySt = listingAvailabilityStatusToday(listing.id, availability)
  const isFormidla = todaySt === 'Formidla'

  return (
    <main className="container listing-hub-page">
      <ConfirmDeleteDialog
        pendingDeleteListing={pendingDeleteListing}
        onCancelListing={() => setPendingDeleteListing(null)}
        onConfirmListing={() => void executeDeleteListing()}
        pendingDeletePeriod={pendingDeletePeriod}
        onCancelPeriod={() => setPendingDeletePeriod(null)}
        onConfirmPeriod={() =>
          pendingDeletePeriod &&
          void deleteAvailability(pendingDeletePeriod.id, pendingDeletePeriod.listingId)
        }
      />

      <div className="listing-hub-header">
        <Link href="/homeowner/manage" className="nav-link listing-hub-back">
          <ArrowLeft size={18} aria-hidden />
          {t('listingHubBackManage')}
        </Link>

        <div className="listing-hub-title-row">
          <div className="listing-hub-thumb">
            {listing.image_url ? (
              <OptimizedPublicStorageImage
                variant="fill"
                src={listing.image_url}
                alt=""
                sizes="120px"
                className="listing-hub-thumb-img"
              />
            ) : (
              <div className="listing-hub-thumb-placeholder">
                <HomeIcon size={32} aria-hidden />
              </div>
            )}
          </div>
          <div className="listing-hub-title-block">
            <h1 className="listing-hub-title">{listing.address}</h1>
            <p className="listing-hub-meta">
              {listing.city}
              {listing.postal_code ? ` · ${listing.postal_code}` : ''}
            </p>
            <ListingStatusBadge availability={todaySt} />
          </div>
          <div className="listing-hub-actions">
            <Link
              href={`/listings/${listing.id}?view=owner`}
              className="button button-secondary listing-hub-action-btn"
            >
              <Edit3 size={16} aria-hidden />
              {t('editListing')}
            </Link>
            {!isFormidla ? (
              <button
                type="button"
                className="button listing-hub-action-btn listing-hub-action-btn--danger"
                onClick={() =>
                  setPendingDeleteListing({ id: listing.id, address: listing.address })
                }
              >
                <Trash2 size={16} aria-hidden />
                {t('delete')}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <ListingLaneBentoRow
        listingId={listing.id}
        city={listing.city ?? ''}
        periods={availability[listing.id] ?? []}
        eventOptIns={eventOptIns}
        tourismEnabled={Boolean(listing.tourism_enabled)}
        showTourism={platformFlags.tourism}
        showEvents={platformFlags.centralEvents}
        socialKommuneActive={socialKommuneActive}
      />

      {!isFormidla ? (
        <section className="card listing-hub-calendar-card" aria-labelledby="hub-calendar-heading">
          <h2 id="hub-calendar-heading" className="listing-hub-section-title">
            {t('managePanelCalendar')}
          </h2>
          <LandlordAvailabilityHub
            listing={listing}
            periods={availability[listing.id] ?? []}
            eventOptIns={eventOptIns}
            onAddPeriod={addAvailability}
            onDeletePeriod={(periodId, lid) => {
              setPendingDeletePeriod({ id: periodId, listingId: lid })
            }}
          />
        </section>
      ) : (
        <div className="card listing-hub-formidla-note" role="status">
          <p>{t('listingHubFormidlaReadOnly')}</p>
        </div>
      )}

      {!isFormidla ? (
        <ListingHubSettingsAccordion
          listing={listing}
          tourism={platformFlags.tourism}
          centralEvents={platformFlags.centralEvents}
          openSection={openSection}
          onListingUpdated={(patch) => setListing((prev: any) => (prev ? { ...prev, ...patch } : prev))}
        />
      ) : null}
    </main>
  )
}
