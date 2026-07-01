'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Home as HomeIcon,
  Info,
  FileText,
  MessageSquare,
  Sparkles,
  LayoutDashboard,
} from 'lucide-react'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import { landlordOnboardingKey, LANDLORD_ONBOARDING_PREFIX } from '@/app/lib/landlordOnboarding'
import LandlordOnboardingModal from '@/app/components/LandlordOnboardingModal'
import {
  PwaInstallPromptDialog,
  PWA_PROMPT_DISMISSED_KEY,
  PWA_PROMPT_MANAGE_SESSION_KEY,
} from '@/app/components/PWAInstallPrompt'
import { useLanguage } from '@/context/LanguageContext'
import LoadingPlaceholder from '@/app/components/LoadingPlaceholder'
import { EmptyState, useToast } from '@/app/components/design-system'
import EventTaskCards from '@/features/listings/components/EventTaskCards'
import { useListingEventCalendarData } from '@/features/listings/hooks/useListingEventCalendarData'
import LandlordBookingRequests from '@/features/bookings/components/LandlordBookingRequests'
import LandlordStripeConnect from '@/features/bookings/components/LandlordStripeConnect'
import { useListingAvailability } from '@/features/listings/hooks/useListingAvailability'
import type { ListingEventOptInPeriod, ListingLane } from '@/features/listings/types/lanes'
import { buttonClassName } from '@/app/components/ui/Button'
import { listingAvailabilityStatusToday } from '@/app/lib/listingAvailabilityStatusToday'
import { usePlatformMode } from '@/context/PlatformModeContext'
import { shouldShowManageFullScreenSpinner } from '@/features/listings/lib/landlordManagePageGate'
import { useLandlordManageBootstrap } from '@/features/listings/hooks/useLandlordManageBootstrap'
import {
  useLandlordListingsQuery,
  type ListingsOnboardingCallbacks,
} from '@/features/listings/hooks/useLandlordListingsQuery'
import ConfirmDeleteDialog from '@/features/listings/components/ConfirmDeleteDialog'
import LandlordManageFilters, {
  type ManageListingFilter,
} from '@/features/listings/components/manage/LandlordManageFilters'
import LandlordListingCard, {
  type ManagePanel,
} from '@/features/listings/components/manage/LandlordListingCard'
import LandlordListingActionSheet from '@/features/listings/components/manage/LandlordListingActionSheet'
import LandlordNonSubscribedBanner from '@/features/listings/components/LandlordNonSubscribedBanner'

export default function HomeownerManage() {
  const { t } = useLanguage()
  const toast = useToast()
  const { flags: platformFlags } = usePlatformMode()
  const router = useRouter()
  const [showOverviewIntro, setShowOverviewIntro] = useState(false)
  const [showMineBoligerIntro, setShowMineBoligerIntro] = useState(false)
  const onboardingRef = useRef<ListingsOnboardingCallbacks | null>(null)
  const {
    myListings,
    setMyListings,
    availability,
    setAvailability,
    eventOptInsByListing,
    setEventOptInsByListing,
    loading,
    setLoading,
    fetchError,
    setFetchError,
    refetch: fetchData,
  } = useLandlordListingsQuery({
    router,
    centralEvents: platformFlags.centralEvents,
    onboardingRef,
  })
  const {
    pageGate,
    pendingPwaAfterWelcome,
    pendingPwaBeforeOverview,
    setPendingPwaBeforeOverview,
    dismissLandlordWelcome,
    dismissPwaAfterWelcome,
  } = useLandlordManageBootstrap({
    refetch: fetchData,
    loading,
    setLoading,
    setFetchError,
  })
  onboardingRef.current = {
    setPendingPwaBeforeOverview,
    setShowOverviewIntro,
    setShowMineBoligerIntro,
  }
  const [filter, setFilter] = useState<ManageListingFilter>('Alle')
  const [openPanel, setOpenPanel] = useState<{ listingId: string; panel: ManagePanel } | null>(
    null
  )
  const [pendingDeletePeriod, setPendingDeletePeriod] = useState<{
    id: string
    listingId: string
  } | null>(null)
  const [pendingDeleteListing, setPendingDeleteListing] = useState<{
    id: string
    address: string
  } | null>(null)
  const availabilityErrorContextRef = useRef<'add' | 'delete'>('add')
  const filtersRowRef = useRef<HTMLDivElement>(null)
  const listingPanelRef = useRef<HTMLDivElement>(null)
  const [isMobileLayout, setIsMobileLayout] = useState(false)
  const [actionSheetListingId, setActionSheetListingId] = useState<string | null>(null)

  const calendarListingId = openPanel?.panel === 'calendar' ? openPanel.listingId : null
  const {
    activeOptIns: eventCalendarOptIns,
    allPublished: allPublishedEvents,
    refresh: refreshEventCalendar,
  } = useListingEventCalendarData(calendarListingId)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 768px)')
    const sync = () => setIsMobileLayout(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const scrollFiltersIntoViewMobile = useCallback(() => {
    if (typeof window === 'undefined' || window.innerWidth > 768) return
    requestAnimationFrame(() => {
      filtersRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }, [])

  const scrollListingPanelIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      listingPanelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }, [])

  const openListingPanel = useCallback(
    (listingId: string, panel: ManagePanel) => {
      setOpenPanel({ listingId, panel })
      scrollListingPanelIntoView()
    },
    [scrollListingPanelIntoView]
  )

  const openPeriodCalendar = (listingId: string, _status: 'Tilgjengelig' | 'Utilgjengelig') => {
    openListingPanel(listingId, 'calendar')
  }

  const { addPeriod, deletePeriod } = useListingAvailability(availability, setAvailability, {
    onConflict: () => toast(t('availabilityConflict'), 'error'),
    onError: (message) => {
      if (availabilityErrorContextRef.current === 'delete') {
        toast(t('errDeletePeriod') + message, 'error')
      } else {
        toast('Feil ved lagring av periode: ' + message, 'error')
      }
    },
  })

  const dismissOverviewIntro = async () => {
    const user = await getAuthUserDeduped()
    if (user && typeof window !== 'undefined') {
      localStorage.setItem(landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.overview, user.id), '1')
    }
    setShowOverviewIntro(false)
    if (user && myListings.length > 0 && typeof window !== 'undefined') {
      const mineKey = landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.mineBoliger, user.id)
      if (!localStorage.getItem(mineKey)) {
        setShowMineBoligerIntro(true)
      }
    }
  }

  const dismissMineBoligerIntro = async () => {
    const user = await getAuthUserDeduped()
    if (user && typeof window !== 'undefined') {
      localStorage.setItem(
        landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.mineBoliger, user.id),
        '1'
      )
    }
    setShowMineBoligerIntro(false)
  }

  useEffect(() => {
    if (typeof window === 'undefined' || myListings.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const listingId = params.get('listing')?.trim() || ''
    const panelRaw = params.get('panel')?.trim() || ''
    const panel = (panelRaw === 'periods' ? 'calendar' : panelRaw) as ManagePanel | ''
    if (!listingId || !panel || !['calendar', 'events', 'tourism'].includes(panel)) return
    if (!myListings.some((l) => l.id === listingId)) return
    setOpenPanel({ listingId, panel })
    scrollListingPanelIntoView()
  }, [myListings, scrollListingPanelIntoView])

  const refreshListingEventOptIns = useCallback(
    async (listingId: string) => {
      if (!platformFlags.centralEvents) return
      const [{ data: published }, { data: optIns }] = await Promise.all([
        supabase
          .from('central_events')
          .select('id, name, start_date, end_date')
          .eq('status', 'published'),
        supabase
          .from('listing_event_availability')
          .select('listing_id, event_id, status')
          .eq('listing_id', listingId)
          .eq('status', 'active'),
      ])
      const eventMeta = new Map((published ?? []).map((e) => [e.id, e]))
      const rows: ListingEventOptInPeriod[] = []
      ;(optIns ?? []).forEach((row) => {
        const meta = eventMeta.get(row.event_id)
        if (!meta) return
        rows.push({
          event_id: row.event_id,
          event_name: meta.name,
          start_date: meta.start_date,
          end_date: meta.end_date,
          status: 'active',
        })
      })
      setEventOptInsByListing((prev) => ({ ...prev, [listingId]: rows }))
    },
    [platformFlags.centralEvents, setEventOptInsByListing]
  )

  const executeDeleteListing = async () => {
    if (!pendingDeleteListing) return
    const { id, address } = pendingDeleteListing
    const listingRow = myListings.find((l) => l.id === id)
    if (listingRow && listingAvailabilityStatusToday(listingRow.id, availability) === 'Formidla') {
      toast(t('ownerCannotEditListingWhenFormidlet'), 'error')
      setPendingDeleteListing(null)
      return
    }

    const prevListings = myListings
    setMyListings((prev) => prev.filter((item) => item.id !== id))

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

      setAvailability((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setPendingDeleteListing(null)
    } catch (err: any) {
      setMyListings(prevListings)
      toast(t('errDeleteGeneric') + err.message, 'error')
    }
  }

  const addAvailability = async (
    listingId: string,
    startDate: string,
    endDate: string,
    status: string = 'Tilgjengelig',
    lane: ListingLane = 'sosial'
  ) => {
    availabilityErrorContextRef.current = 'add'
    const result = await addPeriod({
      listingId,
      start: startDate,
      end: endDate,
      status: status as 'Tilgjengelig' | 'Utilgjengelig' | 'Formidla',
      lane,
    })
    if (!result.ok) return

    if (status === 'Tilgjengelig' || status === 'Utilgjengelig') {
      await supabase
        .from('listings')
        .update({ status, is_available: status === 'Tilgjengelig' })
        .eq('id', listingId)
      setMyListings((prev) =>
        prev.map((l) =>
          l.id === listingId ? { ...l, status, is_available: status === 'Tilgjengelig' } : l
        )
      )
    }
  }

  const deleteAvailability = async (id: string, listingId: string) => {
    availabilityErrorContextRef.current = 'delete'
    const result = await deletePeriod(id, listingId)
    if (result.ok) {
      setPendingDeletePeriod(null)
    }
  }

  const isTodayAvailableOrUnset = (listing: { id: string }) => {
    return listingAvailabilityStatusToday(listing.id, availability) === 'Tilgjengelig'
  }

  const filteredListings = myListings.filter((l) => {
    if (filter === 'Alle') return true
    const s = listingAvailabilityStatusToday(l.id, availability)
    if (filter === 'Tilgjengelig') return s === 'Tilgjengelig'
    return s === filter
  })

  const actionSheetListing = actionSheetListingId
    ? myListings.find((l) => l.id === actionSheetListingId) ?? null
    : null

  if (shouldShowManageFullScreenSpinner(pageGate, loading, fetchError)) {
    return (
      <main className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
        <LoadingPlaceholder minHeight={160} />
      </main>
    )
  }

  if (pageGate === 'welcome') {
    return (
      <>
        <PwaInstallPromptDialog
          open={pendingPwaAfterWelcome}
          onDismiss={(remember) => dismissPwaAfterWelcome(remember)}
        />
        {!pendingPwaAfterWelcome && (
          <LandlordOnboardingModal
            open
            title={t('landlordWelcomeTitle')}
            titleId="landlord-welcome-title"
            onDismiss={() => void dismissLandlordWelcome()}
            ctaLabel={t('landlordWelcomeCta')}
            icon={Sparkles}
            iconAccent="teal"
            skipLinkLabel={t('onboardingSkipIntro')}
            onSkip={() => void dismissLandlordWelcome()}
          >
            <p
              style={{
                margin: '0 0 var(--space-4)',
                fontSize: '1rem',
                color: 'var(--text-body)',
                lineHeight: 1.55,
              }}
            >
              {t('landlordWelcomeIntro')}
            </p>
            <ul
              style={{
                margin: '0 0 var(--space-5)',
                paddingLeft: '1.25rem',
                color: 'var(--text-body)',
                lineHeight: 1.65,
                fontSize: '0.95rem',
              }}
            >
              <li style={{ marginBottom: 'var(--space-2)' }}>
                {t('landlordWelcomeBulletRegister')}
              </li>
              <li style={{ marginBottom: 'var(--space-2)' }}>
                {t('landlordWelcomeBulletMessages')}
              </li>
              <li>{t('landlordWelcomeBulletSign')}</li>
            </ul>
            <div
              style={{
                marginBottom: 'var(--space-6)',
                padding: 'var(--space-4)',
                borderRadius: 12,
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              <h2
                style={{
                  margin: '0 0 var(--space-2)',
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--color-accent)',
                }}
              >
                {t('landlordWelcomeOrderTitle')}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  color: 'var(--text-main)',
                  lineHeight: 1.55,
                }}
              >
                {t('landlordWelcomeOrderBody')}
              </p>
            </div>
          </LandlordOnboardingModal>
        )}
      </>
    )
  }

  const primaryListingCity = myListings[0]?.city ?? null

  return (
    <main className="container hm-manage-page">
      <LandlordNonSubscribedBanner city={primaryListingCity} />
      <PwaInstallPromptDialog
        open={pendingPwaBeforeOverview}
        onDismiss={(remember) => {
          try {
            if (remember) localStorage.setItem(PWA_PROMPT_DISMISSED_KEY, '1')
            sessionStorage.setItem(PWA_PROMPT_MANAGE_SESSION_KEY, '1')
          } catch {
            /* ignore */
          }
          setPendingPwaBeforeOverview(false)
          setShowOverviewIntro(true)
        }}
      />

      <LandlordOnboardingModal
        open={showOverviewIntro}
        title={t('landlordOverviewTitle')}
        titleId="landlord-overview-title"
        onDismiss={() => void dismissOverviewIntro()}
        ctaLabel={t('landlordOverviewCta')}
        icon={LayoutDashboard}
        iconAccent="blue"
        skipLinkLabel={t('onboardingSkipIntro')}
        onSkip={() => void dismissOverviewIntro()}
      >
        <p
          style={{
            margin: '0 0 var(--space-4)',
            fontSize: '1rem',
            color: 'var(--text-body)',
            lineHeight: 1.55,
          }}
        >
          {t('landlordOverviewLead')}
        </p>
        <ul
          style={{
            margin: '0 0 var(--space-5)',
            paddingLeft: '1.25rem',
            color: 'var(--text-body)',
            lineHeight: 1.65,
            fontSize: '0.95rem',
          }}
        >
          <li style={{ marginBottom: 'var(--space-2)' }}>{t('landlordOverviewBullet1')}</li>
          <li style={{ marginBottom: 'var(--space-2)' }}>{t('landlordOverviewBullet2')}</li>
          <li>{t('landlordOverviewBullet3')}</li>
        </ul>
        <div
          style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-4)',
            borderRadius: 12,
            background: 'rgba(45, 212, 191, 0.1)',
            border: '1px solid rgba(45, 212, 191, 0.28)',
          }}
        >
          <h2
            style={{
              margin: '0 0 var(--space-2)',
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-teal)',
            }}
          >
            {t('landlordOverviewExpectTitle')}
          </h2>
          <p
            style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.55 }}
          >
            {t('landlordOverviewExpectBody')}
          </p>
        </div>
      </LandlordOnboardingModal>

      <LandlordOnboardingModal
        open={showMineBoligerIntro && !showOverviewIntro}
        title={t('landlordMineBoligerTitle')}
        titleId="landlord-mineboliger-title"
        onDismiss={() => void dismissMineBoligerIntro()}
        ctaLabel={t('landlordMineBoligerCta')}
        icon={HomeIcon}
        iconAccent="teal"
        skipLinkLabel={t('onboardingSkipIntro')}
        onSkip={() => void dismissMineBoligerIntro()}
      >
        <p
          style={{
            margin: '0 0 var(--space-4)',
            fontSize: '1rem',
            color: 'var(--text-body)',
            lineHeight: 1.55,
          }}
        >
          {t('landlordMineBoligerLead')}
        </p>
        <ul
          style={{
            margin: '0 0 var(--space-6)',
            paddingLeft: '1.25rem',
            color: 'var(--text-body)',
            lineHeight: 1.65,
            fontSize: '0.95rem',
          }}
        >
          <li style={{ marginBottom: 'var(--space-2)' }}>{t('landlordMineBoligerBullet1')}</li>
          <li style={{ marginBottom: 'var(--space-2)' }}>{t('landlordMineBoligerBullet2')}</li>
          <li>{t('landlordMineBoligerBullet3')}</li>
        </ul>
      </LandlordOnboardingModal>

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

      <div
        className="hm-header-row"
        style={{
          marginBottom: 'var(--space-8)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.75rem)', margin: 0 }}>{t('myProperties')}</h1>
        </div>
        <Link
          href="/homeowner/register"
          className="button"
          style={{
            padding: 'var(--space-4) var(--space-8)',
            borderRadius: '14px',
            fontSize: '1.1rem',
            whiteSpace: 'nowrap',
          }}
        >
          <Plus size={22} /> <span className="hm-btn-label">{t('registerNewProperty')}</span>
        </Link>
      </div>

      {platformFlags.centralEvents ? (
        <EventTaskCards listingIds={myListings.map((l) => l.id)} />
      ) : null}
      {platformFlags.stripeBookings ? <LandlordStripeConnect /> : null}
      {platformFlags.stripeBookings ? (
        <LandlordBookingRequests listingIds={myListings.map((l) => l.id)} />
      ) : null}

      <div
        className="hm-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: 'var(--space-8)',
          alignItems: 'start',
        }}
      >
        <aside className="hm-sidebar" style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <div className="card hm-nav-card" style={{ padding: 'var(--space-2)' }}>
            <div
              style={{
                width: '100%',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                background: 'rgba(59, 130, 246, 0.1)',
                color: 'var(--color-sky-blue)',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              <HomeIcon size={18} />
              <span className="hm-nav-label-long">{t('myPropertiesTab')}</span>
              <span className="hm-nav-label-short">{t('myPropertiesTabShort')}</span>
            </div>
            <Link
              href="/homeowner/agreements"
              style={{
                width: '100%',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                color: 'var(--text-main)',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              <FileText size={18} />
              <span className="hm-nav-label-long">{t('landlordAgreementsTitle')}</span>
              <span className="hm-nav-label-short">{t('agreementSigned')}</span>
            </Link>
            <Link
              href="/homeowner/sign-terms"
              style={{
                width: '100%',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                color: 'var(--text-main)',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              <FileText size={18} />
              <span className="hm-nav-label-long">{t('signTermsNav')}</span>
              <span className="hm-nav-label-short">{t('signTermsNavShort')}</span>
            </Link>
            <Link
              href="/nav/messages"
              style={{
                width: '100%',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                color: 'var(--text-main)',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              <MessageSquare size={18} />
              <span className="hm-nav-label-long">{t('messagesToKommune')}</span>
              <span className="hm-nav-label-short">{t('messagesToKommuneShort')}</span>
            </Link>
          </div>
        </aside>

        <div>
          <LandlordManageFilters
            filter={filter}
            onFilterChange={setFilter}
            filteredCount={filteredListings.length}
            filtersRowRef={filtersRowRef}
            onScrollFiltersIntoViewMobile={scrollFiltersIntoViewMobile}
          />

          <div
            style={{
              display: 'grid',
              gap: 'var(--space-4)',
              gridTemplateColumns: 'minmax(0, 1fr)',
            }}
          >
            {loading ? (
              <LoadingPlaceholder minHeight={120} />
            ) : fetchError ? (
              <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                <Info size={36} style={{ margin: '0 auto var(--space-3)', opacity: 0.45 }} />
                <p
                  style={{
                    margin: '0 0 var(--space-4)',
                    color: 'var(--text-body)',
                    lineHeight: 1.55,
                  }}
                >
                  {fetchError === 'timeout' ? t('manageDataLoadTimeout') : fetchError}
                </p>
                <button type="button" className="button" onClick={() => void fetchData()}>
                  {t('retryLoad')}
                </button>
              </div>
            ) : filteredListings.length > 0 ? (
              filteredListings.map((listing) => (
                <LandlordListingCard
                  key={listing.id}
                  listing={listing}
                  availability={availability}
                  eventOptIns={eventOptInsByListing[listing.id] ?? []}
                  openPanel={openPanel}
                  isMobileLayout={isMobileLayout}
                  centralEvents={platformFlags.centralEvents}
                  tourism={platformFlags.tourism}
                  eventCalendarOptIns={eventCalendarOptIns}
                  allPublishedEvents={allPublishedEvents}
                  listingPanelRef={listingPanelRef}
                  isTodayAvailableOrUnset={isTodayAvailableOrUnset}
                  onOpenActionSheet={setActionSheetListingId}
                  onOpenListingPanel={openListingPanel}
                  onClosePanel={() => setOpenPanel(null)}
                  onOpenPeriodCalendar={openPeriodCalendar}
                  onPendingDeleteListing={setPendingDeleteListing}
                  onListingUpdated={(listingId, patch) =>
                    setMyListings((prev) =>
                      prev.map((l) => (l.id === listingId ? { ...l, ...patch } : l))
                    )
                  }
                  onAddPeriod={addAvailability}
                  onDeletePeriod={deleteAvailability}
                  onRefreshEvents={async () => {
                    await refreshEventCalendar()
                    await refreshListingEventOptIns(listing.id)
                  }}
                />
              ))
            ) : (
              <EmptyState
                title={t('noProperties')}
                action={
                  <Link href="/homeowner/register" className={buttonClassName('accent')}>
                    {t('noPropertiesCta')}
                  </Link>
                }
              />
            )}
          </div>
        </div>
      </div>

      {actionSheetListing && (
        <LandlordListingActionSheet
          listing={actionSheetListing}
          open={!!actionSheetListingId}
          availability={availability}
          centralEvents={platformFlags.centralEvents}
          tourism={platformFlags.tourism}
          isTodayAvailableOrUnset={isTodayAvailableOrUnset}
          onClose={() => setActionSheetListingId(null)}
          onOpenPeriodCalendar={openPeriodCalendar}
          onOpenListingPanel={openListingPanel}
          onPendingDeleteListing={setPendingDeleteListing}
        />
      )}
    </main>
  )
}
