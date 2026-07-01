'use client'

import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  useTransition,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Filter,
  MapPin,
  Users,
  Info,
  Home as HomeIcon,
  ShieldCheck,
  ArrowUpDown,
  LayoutList,
  Map as MapIcon,
  CheckCircle2,
  XCircle,
  Phone,
  User,
  Building,
  Tag,
  Ruler,
  Eye,
  Calendar,
  Settings,
  RotateCcw,
  CalendarPlus,
  List,
} from 'lucide-react'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import type { NavDatabaseListingRow } from '@/app/lib/listingUiTypes'
import { useLanguage } from '@/context/LanguageContext'
import { formatDateNo } from '@/app/lib/dateFormat'
import LoadingPlaceholder from '@/app/components/LoadingPlaceholder'
import BottomSheet from '@/app/components/BottomSheet'
import { Button, buttonClassName } from '@/app/components/ui/Button'
import { isKommuneStaffRole } from '@/app/lib/kommuneRoles'
import { isEventStaffRole } from '@/app/lib/eventStaffRoles'
import { getOverviewBackLink } from '@/app/lib/overviewBackNav'
import { useQueryClient } from '@tanstack/react-query'
import { QK } from '@/app/lib/queries/queryKeys'
import { useKommuneNavAccess } from '@/app/hooks/useKommuneNavAccess'
import {
  formidlaPeriodIdsOverlappingToday,
  listingAvailabilityStatusToday,
  listingRowFieldsForAvailabilityToday,
} from '@/app/lib/listingAvailabilityStatusToday'
import { supabaseErrorMessage } from '@/app/lib/supabaseErrorMessage'
import { useToast, useConfirm } from '@/app/components/design-system'
import NavDatabaseTableView from '@/features/mediation/components/NavDatabaseTableView'
import FormidletModal from '@/features/mediation/components/FormidletModal'
import FormidletExtendModal, {
  type FormidletExtendModalData,
} from '@/features/mediation/components/FormidletExtendModal'
import NavDatabaseFilters, {
  DEFAULT_NAV_DATABASE_FILTERS,
} from '@/features/mediation/components/NavDatabaseFilters'
import {
  type NavDbViewMode,
  mobileNavDbViewKey,
  sessionNavDbViewSessionKey,
} from '@/features/mediation/constants/navDatabase'
import { getNavDbColumns } from '@/features/mediation/lib/navDatabaseColumns'
import { useNavDatabasePublishedEvents } from '@/features/mediation/hooks/useNavDatabasePublishedEvents'
import { useNavDatabaseListingsQuery } from '@/features/mediation/hooks/useNavDatabaseListingsQuery'
import { usePlatformMode } from '@/context/PlatformModeContext'
import { useEventStaffAccess } from '@/features/auth/hooks/useEventStaffAccess'
import { useNavDatabaseTranslate } from '@/features/mediation/hooks/useNavDatabaseTranslate'
import NavDatabaseColumnSettings from '@/features/mediation/components/NavDatabaseColumnSettings'
import NavDatabaseMobileListView from '@/features/mediation/components/NavDatabaseMobileListView'
import NavDatabaseTimelineView from '@/features/mediation/components/NavDatabaseTimelineView'
import NavDatabasePageToolbar from '@/features/mediation/components/NavDatabasePageToolbar'

function navDbErrMessage(err: unknown): string {
  return supabaseErrorMessage(err)
}

// Dynamically import Map component to avoid SSR issues
const MapView = dynamic(() => import('@/app/components/MapView'), {
  ssr: false,
  loading: () => <div className="card" style={{ height: '500px' }} />,
})

export type NavDatabasePortalMode = 'kommune' | 'event'

type NavDatabasePageProps = {
  portalMode?: NavDatabasePortalMode
}

export default function NavDatabasePage({ portalMode = 'kommune' }: NavDatabasePageProps) {
  const isEventPortal = portalMode === 'event'
  const { t, locale } = useLanguage()
  const toast = useToast()
  const confirmDialog = useConfirm()
  const queryClient = useQueryClient()
  const { flags: platformFlags } = usePlatformMode()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const focusListingId = searchParams.get('focusListing')?.trim() || ''
  const [, startViewTransition] = useTransition()
  const prefetchedListingIdsRef = useRef(new Set<string>())
  const prefetchListingDetail = useCallback(
    (id: string) => {
      if (!id?.trim() || prefetchedListingIdsRef.current.has(id)) return
      prefetchedListingIdsRef.current.add(id)
      void router.prefetch(`/listings/${id}?view=nav`)
    },
    [router]
  )

  /** Fjern ?focusListing= så kartet blir «vanlig» igjen når man går til tabell/liste eller tidslinje. */
  const clearFocusListingFromUrl = useCallback(() => {
    if (!searchParams.get('focusListing')?.trim()) return
    const next = new URLSearchParams(searchParams.toString())
    next.delete('focusListing')
    const q = next.toString()
    void router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [router, pathname, searchParams])

  const {
    data: access,
    isPending: accessPending,
    isError: accessError,
    error: accessQueryError,
    refetch: refetchKommuneAccess,
  } = useKommuneNavAccess({ redirectUnauthenticated: !isEventPortal })

  const {
    data: eventAccess,
    isPending: eventAccessPending,
  } = useEventStaffAccess({
    enabled: isEventPortal,
    loginRedirect: '/nav/event/database',
  })

  const userRole = isEventPortal
    ? eventAccess?.kind === 'ok'
      ? eventAccess.userRole
      : null
    : access?.kind === 'ok'
      ? access.userRole
      : null
  const kommuneCanEdit = isEventPortal
    ? true
    : access?.kind === 'ok'
      ? access.kommuneCanEdit
      : true
  const kommuneRegion = isEventPortal ? 'event' : access?.kind === 'ok' ? access.kommuneRegion : null
  const isAuthorized: boolean | null = isEventPortal
    ? eventAccessPending || !eventAccess
      ? null
      : eventAccess.kind === 'ok'
        ? true
        : eventAccess.kind === 'forbidden'
          ? false
          : null
    : accessPending || access === undefined
      ? null
      : access.kind === 'unauthenticated'
        ? null
        : access.kind === 'ok'
          ? true
          : access.kind === 'forbidden'
            ? false
            : null

  const [searchTerm, setSearchTerm] = useState('')
  // ... rest of state ...

  const [activeTab, setActiveTab] = useState<'Tilgjengelig' | 'Utilgjengelig' | 'Formidlet'>(
    'Tilgjengelig'
  )
  const [viewMode, setViewMode] = useState<NavDbViewMode>(() => {
    if (typeof window === 'undefined') return 'timeline'
    return new URLSearchParams(window.location.search).get('focusListing')?.trim() ? 'map' : 'timeline'
  })
  const sessionDbViewRestoredRef = useRef(false)
  const [isMobile, setIsMobile] = useState(false)
  /** ≤480px: skjul tidslinje (for kompleks horisontal UI). */
  const mobileViewInitRef = useRef(false)
  const [sortField, setSortField] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [timelineOffset, setTimelineOffset] = useState(0)
  const [timelineColorHelpOpen, setTimelineColorHelpOpen] = useState(false)
  /** Tidslinje-kortet har `overflowX: auto`. Uten denne ref-en kan «Gå til idag»
   *  flytte offset til 0 mens scrollLeft beholdes, så brukeren ser fortsatt
   *  framtidige uker. */
  const [formidletModalListing, setFormidletModalListing] = useState<NavDatabaseListingRow | null>(
    null
  )
  const [formidletExtendModal, setFormidletExtendModal] = useState<FormidletExtendModalData | null>(
    null
  )

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'address',
    'city',
    'owner_name',
    'price_daily',
  ])
  /** Kart og tidslinje: filtrer synlige boliger etter dagens status (velges i filterpanelet). */
  const [mapStatusFilter, setMapStatusFilter] = useState<
    ('Tilgjengelig' | 'Utilgjengelig' | 'Formidlet')[]
  >(['Tilgjengelig', 'Utilgjengelig', 'Formidlet'])
  const [eventFilterId, setEventFilterId] = useState('Alle')
  const publishedEventsQuery = useNavDatabasePublishedEvents(
    platformFlags.centralEvents ? userRole : null
  )
  const publishedEvents = publishedEventsQuery.data ?? []

  const ALL_COLUMNS = getNavDbColumns(t, isMobile)

  const persistVisibleColumns = useCallback(
    (cols: string[]) => {
      try {
        const key = isMobile ? 'boly-nav-db-columns-mobile' : 'boly-nav-db-columns'
        localStorage.setItem(key, JSON.stringify(cols))
      } catch {
        /* ignore */
      }
    },
    [isMobile]
  )

  const toggleColumn = (id: string) => {
    setVisibleColumns((prev) => {
      let next: string[]
      if (prev.includes(id)) {
        next = prev.length > 1 ? prev.filter((c) => c !== id) : prev
      } else {
        next = [...prev, id]
      }
      persistVisibleColumns(next)
      return next
    })
  }

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    try {
      if (isMobile) {
        const m = localStorage.getItem('boly-nav-db-columns-mobile')
        if (m) {
          const parsed = JSON.parse(m) as string[]
          if (Array.isArray(parsed) && parsed.length >= 1) setVisibleColumns(parsed)
          else setVisibleColumns(['address', 'price_daily'])
        } else {
          setVisibleColumns(['address', 'price_daily'])
        }
      } else {
        const saved = localStorage.getItem('boly-nav-db-columns')
        if (saved) {
          const parsed = JSON.parse(saved) as string[]
          if (Array.isArray(parsed) && parsed.length >= 1) setVisibleColumns(parsed)
        } else {
          setVisibleColumns(['address', 'city', 'owner_name', 'price_daily'])
        }
      }
    } catch {
      setVisibleColumns(
        isMobile ? ['address', 'price_daily'] : ['address', 'city', 'owner_name', 'price_daily']
      )
    }
  }, [isMobile])

  /** Første mobil-visning: liste som standard (ikke kart), hent evt. lagret valg. */
  useLayoutEffect(() => {
    if (!isMobile) {
      mobileViewInitRef.current = false
      return
    }
    if (mobileViewInitRef.current) return
    mobileViewInitRef.current = true
    try {
      if (new URLSearchParams(window.location.search).get('focusListing')?.trim()) {
        setViewMode('map')
        try {
          localStorage.setItem(mobileNavDbViewKey, 'map')
        } catch {
          /* ignore */
        }
        return
      }
      const narrow = window.matchMedia('(max-width: 480px)').matches
      const s = localStorage.getItem(mobileNavDbViewKey)
      let next: NavDbViewMode = 'list'
      if (s === 'map') next = 'map'
      else if (s === 'list') next = 'list'
      else if (s === 'timeline' && !narrow) next = 'timeline'
      setViewMode(next)
      try {
        localStorage.setItem(mobileNavDbViewKey, next)
      } catch {
        /* ignore */
      }
    } catch {
      setViewMode('list')
      try {
        localStorage.setItem(mobileNavDbViewKey, 'list')
      } catch {
        /* ignore */
      }
    }
  }, [isMobile])

  useLayoutEffect(() => {
    if (sessionDbViewRestoredRef.current) return
    sessionDbViewRestoredRef.current = true
    if (focusListingId) return
    try {
      const s = sessionStorage.getItem(sessionNavDbViewSessionKey)
      if (s === 'table' || s === 'map' || s === 'timeline' || s === 'list') {
        setViewMode(s)
      }
    } catch {
      /* ignore */
    }
  }, [focusListingId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      sessionStorage.setItem(sessionNavDbViewSessionKey, viewMode)
    } catch {
      /* ignore */
    }
  }, [viewMode])

  const persistMobileDbView = useCallback((mode: NavDbViewMode) => {
    if (mode === 'table') return
    try {
      localStorage.setItem(mobileNavDbViewKey, mode)
    } catch {
      /* ignore */
    }
  }, [])

  /** Kart med én bolig markert: Next hydrering ga ofte «timeline» (tilgjengelighetskalender) trass ?focusListing=. */
  useEffect(() => {
    if (!focusListingId) return
    setViewMode('map')
    if (isMobile) persistMobileDbView('map')
  }, [focusListingId, isMobile, persistMobileDbView])

  useEffect(() => {
    if (isMobile && viewMode === 'table') {
      setViewMode('list')
      persistMobileDbView('list')
    }
  }, [isMobile, viewMode, persistMobileDbView])

  useEffect(() => {
    if (!isMobile || viewMode !== 'timeline') return
    setViewMode('list')
    persistMobileDbView('list')
  }, [isMobile, viewMode, persistMobileDbView])

  useEffect(() => {
    if (!isMobile && viewMode === 'list') setViewMode('timeline')
  }, [isMobile, viewMode])

  const translateValue = useNavDatabaseTranslate(isMobile, userRole)

  // Filters
  const [filters, setFilters] = useState(DEFAULT_NAV_DATABASE_FILTERS)

  const listingsQueryEnabled =
    isAuthorized === true &&
    (isEventPortal || !isKommuneStaffRole(userRole ?? undefined) || kommuneRegion != null)

  const listingsQuery = useNavDatabaseListingsQuery({
    enabled: listingsQueryEnabled,
    isEventPortal,
    userRole,
    isAuthorized: isAuthorized === true,
    searchTerm,
    filters,
    eventFilterId,
    sortField,
    sortOrder,
    viewMode,
    activeTab,
    rpcErrorHint: t('dbRpcFetchErrorHint'),
    kommuneRegion: Array.isArray(kommuneRegion) ? kommuneRegion.join('|') : kommuneRegion,
  })

  const listings = listingsQuery.data?.listings ?? []
  const availability = listingsQuery.data?.availability ?? {}
  const kommuneFetchError = listingsQuery.data?.fetchError ?? null
  const waitingForKommuneRegion =
    isAuthorized === true &&
    !isEventPortal &&
    isKommuneStaffRole(userRole ?? undefined) &&
    kommuneRegion == null
  const loading = waitingForKommuneRegion ? false : listingsQuery.isPending

  const invalidateListings = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: QK.navDatabaseListings })
  }, [queryClient])

  /** Status for dagens dato (lokal tid, normaliserte datoer). Null = ingen periode dekker i dag → i filter vises som tilgjengelig. */
  const getStatusForToday = listingAvailabilityStatusToday

  const effectiveMapTimelineStatusFilter: Array<'Tilgjengelig' | 'Utilgjengelig' | 'Formidlet'> =
    mapStatusFilter.length > 0
      ? mapStatusFilter
      : ['Tilgjengelig', 'Utilgjengelig', 'Formidlet']

  const listingMatchesMapTimelineStatusFilter = (lid: string) => {
    const s = getStatusForToday(lid, availability)
    const status: 'Tilgjengelig' | 'Utilgjengelig' | 'Formidlet' =
      s === 'Formidla'
        ? 'Formidlet'
        : s === 'Utilgjengelig'
          ? 'Utilgjengelig'
          : 'Tilgjengelig'
    return effectiveMapTimelineStatusFilter.includes(status)
  }

  if (!isEventPortal && accessError) {
    return (
      <main className="container" style={{ padding: 'var(--space-8)' }}>
        <div className="card" style={{ padding: 'var(--space-6)', maxWidth: 480, margin: '0 auto' }}>
          <p style={{ marginBottom: 'var(--space-4)' }}>{navDbErrMessage(accessQueryError)}</p>
          <Button type="button" variant="primary" onClick={() => void refetchKommuneAccess()}>
            {t('retryLoad')}
          </Button>
        </div>
      </main>
    )
  }

  if (isAuthorized === false) {
    return (
      <main
        className="container"
        style={{
          textAlign: 'center',
          padding: 'clamp(2.75rem, 8vh, 6.25rem) clamp(var(--space-3), 4vw, var(--space-5))',
        }}
      >
        <div
          className="card"
          style={{ maxWidth: '500px', margin: '0 auto', padding: 'var(--space-10)' }}
        >
          <ShieldCheck size={64} style={{ color: '#ef4444', margin: '0 auto var(--space-6)' }} />
          <h1 style={{ fontSize: 'clamp(1.5rem, 2.4vw + 0.95rem, 2rem)', marginBottom: 'var(--space-4)' }}>
            {t('noAccess')}
          </h1>
          <p style={{ marginBottom: 'var(--space-8)', opacity: 0.8 }}>
            {t('noAccessDatabaseDesc')}
          </p>
          <Link href="/" className={buttonClassName('primary')} style={{ width: '100%' }}>
            {t('goHome')}
          </Link>
        </div>
      </main>
    )
  }

  if (isAuthorized === null) {
    return (
      <main className="container">
        <LoadingPlaceholder minHeight={560} />
      </main>
    )
  }

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const openFormidletModal = (listing: NavDatabaseListingRow) => {
    setFormidletModalListing(listing)
  }

  const openFormidletExtendModal = (listing: NavDatabaseListingRow) => {
    const periods = (availability[listing.id] || [])
      .filter((p) => p.status === 'Formidla')
      .sort((a, b) => String(b.end_date ?? '').localeCompare(String(a.end_date ?? '')))
    const latest = periods[0]
    if (!latest?.end_date) return
    setFormidletExtendModal({ listing, period: latest })
  }

  const handleRemoveFormidlet = async (id: string, address: string) => {
    const removeConfirmed = await confirmDialog({
      title: t('dbTitleRemoveMediation'),
      message: t('dbRemoveFormidletConfirm').replace('{address}', address),
      variant: 'danger',
    })
    if (!removeConfirmed) return
    try {
      const periodIds = formidlaPeriodIdsOverlappingToday(id, availability)
      const nextAvailRows =
        periodIds.length > 0
          ? (availability[id] || []).filter((p) => !periodIds.includes(String(p.id)))
          : availability[id] || []

      if (periodIds.length > 0) {
        const { error: delError } = await supabase.from('listing_availability').delete().in('id', periodIds)
        if (delError) throw delError
      }

      const nextAvailMap = { ...availability, [id]: nextAvailRows }
      const rowSync = listingRowFieldsForAvailabilityToday(id, nextAvailMap)
      const { error } = await supabase.from('listings').update(rowSync).eq('id', id)

      if (error) throw error

      const user = await getAuthUserDeduped()
      const ownerId = listings.find((l) => l.id === id)?.owner_id
      if (ownerId) {
        await supabase.from('audit_logs').insert([
          {
            user_id: ownerId,
            listing_id: id,
            action_type: 'KOMMUNE_REMOVE_FORMIDLA',
            listing_address: address,
            details: { performed_by_user_id: user?.id, by: 'Kommune-ansatt' },
          },
        ])
      }

      invalidateListings()
    } catch (err: unknown) {
      toast(t('errorPrefix') + navDbErrMessage(err), 'error')
    }
  }

  const dateLocaleTag = locale === 'no' ? 'nb-NO' : locale === 'se' ? 'se' : 'en-GB'
  const overviewBack = getOverviewBackLink(pathname, userRole, t)

  return (
    <main className="db-main-shell container">
      {kommuneFetchError && (
        <div
          className="card"
          style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-4)',
            background: 'var(--color-error-bg, #fef2f2)',
            color: 'var(--color-error-text, #b91c1c)',
            border: '1px solid var(--color-error-border, #fecaca)',
          }}
        >
          <strong>{t('dbFetchErrorLabel')}</strong> {kommuneFetchError}
        </div>
      )}
      <NavDatabasePageToolbar
        isMobile={isMobile}
        overviewBack={overviewBack}
        viewMode={viewMode}
        userRole={userRole}
        activeTab={activeTab}
        showFilters={showFilters}
        showColumnSettings={showColumnSettings}
        onViewModeChange={setViewMode}
        onActiveTabChange={setActiveTab}
        onShowFiltersChange={setShowFilters}
        onShowColumnSettingsChange={setShowColumnSettings}
        onClearFocusListingFromUrl={clearFocusListingFromUrl}
        onPersistMobileDbView={persistMobileDbView}
        startViewTransition={startViewTransition}
        t={t}
      />
      {viewMode === 'map' && (
        <p
          className="text-sm"
          style={{
            margin: '0 0 var(--space-4)',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            maxWidth: 720,
          }}
        >
          {t('dbMapModeHint')}
        </p>
      )}

      <NavDatabaseColumnSettings
        open={showColumnSettings && viewMode !== 'map'}
        isMobile={isMobile}
        allColumns={ALL_COLUMNS}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
        onClose={() => setShowColumnSettings(false)}
        t={t}
      />

      <NavDatabaseFilters
        open={showFilters}
        isMobile={isMobile}
        viewMode={viewMode}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        filters={filters}
        onFiltersChange={setFilters}
        mapStatusFilter={mapStatusFilter}
        onMapStatusFilterChange={setMapStatusFilter}
        eventFilterId={eventFilterId}
        onEventFilterIdChange={setEventFilterId}
        publishedEvents={publishedEvents}
        showCentralEvents={platformFlags.centralEvents}
        onClose={() => setShowFilters(false)}
        onReset={() => {
          setSearchTerm('')
          setFilters(DEFAULT_NAV_DATABASE_FILTERS)
        }}
      />

      <FormidletModal
        listing={formidletModalListing}
        availability={availability}
        isEventPortal={isEventPortal}
        eventFilterId={eventFilterId}
        onClose={() => setFormidletModalListing(null)}
        onSuccess={invalidateListings}
      />

      <FormidletExtendModal
        data={formidletExtendModal}
        availability={availability}
        onClose={() => setFormidletExtendModal(null)}
        onSuccess={invalidateListings}
      />

      <div>
        {loading ? (
          <LoadingPlaceholder minHeight={300} />
        ) : listings.length > 0 ? (
          viewMode === 'table' ? (
            <NavDatabaseTableView
              listings={listings}
              availability={availability}
              visibleColumnIds={visibleColumns}
              allColumns={ALL_COLUMNS}
              activeTab={activeTab}
              kommuneCanEdit={kommuneCanEdit}
              isMobile={isMobile}
              translateValue={translateValue}
              getStatusForToday={getStatusForToday}
              toggleSort={toggleSort}
              prefetchListingDetail={prefetchListingDetail}
              openFormidletModal={openFormidletModal}
              openFormidletExtendModal={openFormidletExtendModal}
              handleRemoveFormidlet={handleRemoveFormidlet}
              actionColumnLabel={t('dbActionColumn')}
              seeDetailsLabel={t('seeDetails')}
              addFormidletTitle={t('dbTitleAddFormidletPeriod')}
              extendTitle={t('dbTitleExtendPeriod')}
              removeMediationTitle={t('dbTitleRemoveMediation')}
            />
          ) : viewMode === 'list' ? (
            <NavDatabaseMobileListView
              listings={listings}
              availability={availability}
              visibleColumns={visibleColumns}
              allColumns={ALL_COLUMNS}
              activeTab={activeTab}
              kommuneCanEdit={kommuneCanEdit}
              translateValue={translateValue}
              getStatusForToday={getStatusForToday}
              prefetchListingDetail={prefetchListingDetail}
              openFormidletModal={openFormidletModal}
              openFormidletExtendModal={openFormidletExtendModal}
              handleRemoveFormidlet={handleRemoveFormidlet}
              t={t}
            />
          ) : viewMode === 'map' ? (
            <MapView
              listings={listings.filter((l) => {
                if (focusListingId && l.id === focusListingId) return true
                return listingMatchesMapTimelineStatusFilter(l.id)
              })}
              availability={availability}
              focusListingId={focusListingId || null}
              listingDetailQuery="?view=nav"
            />
          ) : (
            <NavDatabaseTimelineView
              listings={listings}
              availability={availability}
              visibleColumns={visibleColumns}
              allColumns={ALL_COLUMNS}
              timelineOffset={timelineOffset}
              onTimelineOffsetChange={setTimelineOffset}
              timelineColorHelpOpen={timelineColorHelpOpen}
              onTimelineColorHelpOpenChange={setTimelineColorHelpOpen}
              isMobile={isMobile}
              listingMatchesFilter={listingMatchesMapTimelineStatusFilter}
              translateValue={translateValue}
              getStatusForToday={getStatusForToday}
              prefetchListingDetail={prefetchListingDetail}
              t={t}
            />
          )
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
            <Info
              size={40}
              className="empty-state-icon"
              style={{ margin: '0 auto var(--space-3)' }}
            />
            <p>{t('noResults')}</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 1200px) {
          .timeline-date-optional {
            display: none;
          }
        }
        @media (max-width: 768px) {
          .db-header-row {
            flex-direction: column;
            align-items: stretch !important;
          }
          .db-view-btns {
            width: 100%;
            justify-content: flex-start;
            flex-wrap: wrap;
          }
          .db-tabs-row {
            flex-direction: column;
            align-items: stretch;
          }
          .db-action-btns {
            justify-content: flex-start;
            width: 100%;
          }
          .db-table-wrapper {
            padding: 0 !important;
          }
          .db-table {
            font-size: 0.8rem;
          }
          .db-table th,
          .db-table td {
            padding: var(--space-2) var(--space-3) !important;
          }
        }
        @media (max-width: 480px) {
          .btn-label {
            display: none;
          }
          .db-table {
            min-width: 500px;
            font-size: 0.75rem;
          }
          .db-table th,
          .db-table td {
            padding: 8px 10px !important;
          }
        }
      `}</style>
    </main>
  )
}
