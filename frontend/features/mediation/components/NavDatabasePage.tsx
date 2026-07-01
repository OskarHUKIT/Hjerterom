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
  const timelineScrollRef = useRef<HTMLDivElement>(null)
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

  const translateValue = (
    id: string,
    val: unknown,
    listing?: NavDatabaseListingRow,
    statusForToday?: 'Formidla' | 'Utilgjengelig' | 'Tilgjengelig' | null
  ) => {
    if (id === 'status') {
      const s = statusForToday !== undefined ? (statusForToday ?? 'Tilgjengelig') : val
      const label =
        s === 'Formidla'
          ? t('formidlet')
          : s === 'Utilgjengelig'
            ? t('unavailable')
            : t('available')
      if (isKommuneStaffRole(userRole) && isMobile) {
        const icon =
          s === 'Formidla' ? (
            <ShieldCheck size={18} style={{ color: 'var(--color-sky-blue)' }} aria-hidden />
          ) : s === 'Utilgjengelig' ? (
            <XCircle size={18} style={{ color: '#ef4444' }} aria-hidden />
          ) : (
            <CheckCircle2 size={18} style={{ color: 'var(--color-teal)' }} aria-hidden />
          )
        return (
          <span
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            title={label}
            aria-label={label}
          >
            {icon}
          </span>
        )
      }
      if (s === 'Formidla') return t('formidlet')
      if (s === 'Utilgjengelig') return t('unavailable')
      return t('available')
    }
    if (!val && val !== 0) return '-'
    if (id === 'price_daily') return `${String(val)},-`
    if (id === 'address' && listing) {
      return (
        <Link
          href={`/listings/${listing.id}?view=nav`}
          style={{ color: 'var(--color-sky-blue)', fontWeight: 600, textDecoration: 'none' }}
        >
          {String(val)}
        </Link>
      )
    }
    if (id === 'owner_name' && listing) {
      return (
        <Link
          href={`/nav/users?id=${listing.owner_id}`}
          style={{ color: 'inherit', textDecoration: 'none' }}
        >
          {String(val)}
        </Link>
      )
    }
    if (id === 'type') {
      const v = String(val)
      const mapping: Record<string, string> = {
        'Short-term': t('shortTerm'),
        'Long-term': t('longTerm'),
        Apartment: t('apartment'),
        House: t('house'),
        Shared: t('shared'),
      }
      return mapping[v] || v
    }
    return val as ReactNode
  }

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
      <div
        className="db-header-row animate-delay-1"
        style={{
          marginBottom: isMobile ? 'var(--space-3)' : 'var(--space-8)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: isMobile ? 'var(--space-2)' : 'var(--space-4)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          {overviewBack && (
            <Link
              href={overviewBack.href}
              className="nav-link"
              style={{
                marginLeft: '-1rem',
                marginBottom: isMobile ? 0 : 'var(--space-2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontSize: isMobile ? '0.85rem' : undefined,
              }}
            >
              ← {overviewBack.label}
            </Link>
          )}
          <h1
            style={{
              fontSize: isMobile ? 'clamp(1.35rem, 5vw, 1.75rem)' : 'clamp(1.5rem, 5vw, 2.75rem)',
              margin: isMobile ? '2px 0 0' : undefined,
              lineHeight: isMobile ? 1.2 : undefined,
            }}
          >
            {t('housingBank')}
          </h1>
        </div>
        {!isMobile && (
          <div className="db-view-btns" style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              type="button"
              onClick={() =>
                startViewTransition(() => {
                  clearFocusListingFromUrl()
                  setViewMode('table')
                })
              }
              style={{
                padding: 'var(--space-3)',
                borderRadius: '10px',
                background: viewMode === 'table' ? 'var(--color-accent)' : 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                color: viewMode === 'table' ? 'white' : 'var(--text-main)',
              }}
              title={t('dbViewTable')}
            >
              <LayoutList size={20} />
            </button>
            <button
              type="button"
              onClick={() => startViewTransition(() => setViewMode('map'))}
              style={{
                padding: 'var(--space-3)',
                borderRadius: '10px',
                background: viewMode === 'map' ? 'var(--color-accent)' : 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                color: viewMode === 'map' ? 'white' : 'var(--text-main)',
              }}
              title={t('dbViewMap')}
            >
              <MapPin size={20} />
            </button>
            <button
              type="button"
              onClick={() =>
                startViewTransition(() => {
                  clearFocusListingFromUrl()
                  setViewMode('timeline')
                })
              }
              style={{
                padding: 'var(--space-3)',
                borderRadius: '10px',
                background: viewMode === 'timeline' ? 'var(--color-accent)' : 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                color: viewMode === 'timeline' ? 'white' : 'var(--text-main)',
              }}
              title={t('dbViewTimeline')}
            >
              <Calendar size={20} />
            </button>
          </div>
        )}
        {isMobile && (
          <div
            className="db-view-btns"
            style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', width: '100%' }}
          >
            <button
              type="button"
              onClick={() => {
                startViewTransition(() => {
                  clearFocusListingFromUrl()
                  setViewMode('list')
                  persistMobileDbView('list')
                })
              }}
              style={{
                padding: 'var(--space-3)',
                borderRadius: '10px',
                minHeight: 'var(--touch-target)',
                minWidth: 'var(--touch-target)',
                background: viewMode === 'list' ? 'var(--color-accent)' : 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                color: viewMode === 'list' ? 'white' : 'var(--text-main)',
              }}
              title={t('dbViewList')}
              aria-pressed={viewMode === 'list'}
              aria-label={t('dbViewList')}
            >
              <List size={20} />
            </button>
            <button
              type="button"
              onClick={() => {
                startViewTransition(() => {
                  setViewMode('map')
                  persistMobileDbView('map')
                })
              }}
              style={{
                padding: 'var(--space-3)',
                borderRadius: '10px',
                minHeight: 'var(--touch-target)',
                minWidth: 'var(--touch-target)',
                background: viewMode === 'map' ? 'var(--color-accent)' : 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                color: viewMode === 'map' ? 'white' : 'var(--text-main)',
              }}
              title={t('dbViewMap')}
              aria-pressed={viewMode === 'map'}
              aria-label={t('dbViewMap')}
            >
              <MapPin size={20} />
            </button>
          </div>
        )}
      </div>

      <div
        className="db-tabs-row animate-delay-2"
        style={{
          display: 'flex',
          gap: isMobile ? 'var(--space-2)' : 'var(--space-4)',
          marginBottom: isMobile ? 'var(--space-3)' : 'var(--space-6)',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 'var(--space-1)',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          rowGap: isMobile ? 'var(--space-2)' : 'var(--space-4)',
        }}
      >
        <div
          className="tabs-scroll"
          style={{
            display: 'flex',
            gap: 'var(--space-4)',
            flex: '1 1 auto',
            minWidth: 0,
            overflowX: 'auto',
            paddingBottom: '4px',
            alignItems: 'flex-end',
          }}
        >
          {viewMode === 'map' ? null : viewMode !== 'timeline' ? (
            (['Tilgjengelig', 'Utilgjengelig', 'Formidlet'] as const).map((tab) => {
              const tabLabel =
                tab === 'Tilgjengelig'
                  ? t('available')
                  : tab === 'Utilgjengelig'
                    ? t('unavailable')
                    : t('formidlet')
              const iconOnly = isKommuneStaffRole(userRole) && isMobile
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  aria-label={tabLabel}
                  title={tabLabel}
                  style={{
                    padding: iconOnly ? 'var(--space-3)' : 'var(--space-3) var(--space-4)',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    color: activeTab === tab ? 'var(--color-sky-blue)' : 'var(--text-muted)',
                    borderBottom:
                      activeTab === tab
                        ? '2px solid var(--color-sky-blue)'
                        : '2px solid transparent',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: iconOnly ? 0 : 8,
                  }}
                >
                  {tab === 'Tilgjengelig' && (
                    <CheckCircle2
                      size={iconOnly ? 22 : 16}
                      style={{ color: activeTab === tab ? 'var(--color-teal)' : undefined }}
                      aria-hidden
                    />
                  )}
                  {tab === 'Utilgjengelig' && (
                    <XCircle
                      size={iconOnly ? 22 : 16}
                      style={{ color: activeTab === tab ? '#ef4444' : undefined }}
                      aria-hidden
                    />
                  )}
                  {tab === 'Formidlet' && (
                    <ShieldCheck
                      size={iconOnly ? 22 : 16}
                      style={{ color: activeTab === tab ? 'var(--color-sky-blue)' : undefined }}
                      aria-hidden
                    />
                  )}
                  {!iconOnly && tabLabel}
                </button>
              )
            })
          ) : (
            <div
              style={{
                padding: 'var(--space-3) 0',
                color: 'var(--color-sky-blue)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Calendar size={18} /> {t('dbAvailabilityCalendarTitle')}
            </div>
          )}
        </div>
        <div
          className="db-action-btns"
          style={{
            display: 'flex',
            gap: isMobile ? 'var(--space-2)' : 'var(--space-2)',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {isMobile ? (
            <button
              type="button"
              onClick={() => {
                setShowFilters(!showFilters)
                setShowColumnSettings(false)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: '12px',
                background: showFilters ? 'var(--color-accent)' : 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                color: showFilters ? 'white' : 'var(--text-main)',
                cursor: 'pointer',
                fontWeight: 600,
                minHeight: 'var(--touch-target)',
              }}
            >
              <Filter size={18} />{' '}
              <span className="btn-label">
                {showFilters ? t('dbFilterClose') : t('dbFilterOpen')}
              </span>
            </button>
          ) : (
            <>
              {viewMode !== 'map' && (
                <button
                  type="button"
                  onClick={() => {
                    setShowColumnSettings(!showColumnSettings)
                    setShowFilters(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: 'var(--space-2) var(--space-5)',
                    borderRadius: '12px',
                    background: showColumnSettings ? 'var(--color-accent)' : 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    color: showColumnSettings ? 'white' : 'var(--text-main)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    minHeight: 'var(--touch-target)',
                  }}
                >
                  <Settings size={18} />{' '}
                  <span className="btn-label">{t('dbCustomizeColumns')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowFilters(!showFilters)
                  setShowColumnSettings(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: 'var(--space-2) var(--space-5)',
                  borderRadius: '12px',
                  background: showFilters ? 'var(--color-accent)' : 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  color: showFilters ? 'white' : 'var(--text-main)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  minHeight: 'var(--touch-target)',
                }}
              >
                <Filter size={18} />{' '}
                <span className="btn-label">
                  {showFilters ? t('dbFilterClose') : t('dbFilterOpen')}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

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

      {showColumnSettings && viewMode !== 'map' &&
        (isMobile ? (
          <BottomSheet
            open={showColumnSettings}
            title={t('dbColumnSettingsTitle')}
            titleId="db-column-settings"
            closeLabel={t('dbDone')}
            onClose={() => setShowColumnSettings(false)}
            zIndex={2100}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 'var(--space-3)',
              }}
            >
              {ALL_COLUMNS.map((col) => (
                <label
                  key={col.id}
                  className="card-settings-option"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                  padding: 'var(--space-2)',
                    borderRadius: '8px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(col.id)}
                    onChange={() => toggleColumn(col.id)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)' }}
                  />
                  <span style={{ fontSize: 'clamp(0.85rem, 1vw + 0.65rem, 0.9rem)', color: 'var(--text-main)' }}>
                    {col.label}
                  </span>
                </label>
              ))}
            </div>
          </BottomSheet>
        ) : (
          <div
            className="card card-settings-panel"
            style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-8)' }}
          >
            <h3
              style={{
                marginBottom: 'var(--space-4)',
                fontSize: 'clamp(1rem, 1.1vw + 0.8rem, 1.1rem)',
                color: 'var(--text-main)',
              }}
            >
              {t('dbColumnSettingsTitle')}
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 'var(--space-3)',
              }}
            >
              {ALL_COLUMNS.map((col) => (
                <label
                  key={col.id}
                  className="card-settings-option"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                  padding: 'var(--space-2)',
                    borderRadius: '8px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(col.id)}
                    onChange={() => toggleColumn(col.id)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)' }}
                  />
                  <span style={{ fontSize: 'clamp(0.85rem, 1vw + 0.65rem, 0.9rem)', color: 'var(--text-main)' }}>
                    {col.label}
                  </span>
                </label>
              ))}
            </div>
            <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="button"
                variant="primary"
                onClick={() => setShowColumnSettings(false)}
                style={{ padding: '8px 24px' }}
              >
                {t('dbDone')}
              </Button>
            </div>
          </div>
        ))}

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {listings.map((l) => (
                <div
                  key={l.id}
                  className="card"
                  style={{
                    padding: 'var(--space-4)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/listings/${l.id}?view=nav`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        router.push(`/listings/${l.id}?view=nav`)
                      }
                    }}
                    onMouseEnter={() => prefetchListingDetail(l.id)}
                    onFocus={() => prefetchListingDetail(l.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                      {ALL_COLUMNS.filter((col) => visibleColumns.includes(col.id)).map((col) => (
                        <div
                          key={col.id}
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 'var(--space-2)',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {col.label}
                          </span>
                          <span style={{ fontSize: '0.95rem', color: 'var(--text-main)', textAlign: 'right' }}>
                            {col.id === 'status'
                              ? translateValue(
                                  col.id,
                                  l[col.id],
                                  l,
                                  getStatusForToday(l.id, availability)
                                )
                              : translateValue(col.id, l[col.id], l)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 'var(--space-2)',
                      marginTop: 'var(--space-4)',
                      paddingTop: 'var(--space-3)',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      href={`/listings/${l.id}?view=nav`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 'var(--touch-target)',
                        minWidth: 'var(--touch-target)',
                        padding: 'var(--space-2)',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '10px',
                        color: 'var(--color-sky-blue)',
                      }}
                      title={t('seeDetails')}
                      aria-label={t('seeDetails')}
                    >
                      <Eye size={18} />
                    </Link>
                    {activeTab === 'Tilgjengelig' && kommuneCanEdit && (
                      <button
                        type="button"
                        onClick={() => openFormidletModal(l)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: 'var(--touch-target)',
                          minWidth: 'var(--touch-target)',
                          padding: 'var(--space-2)',
                          background: 'rgba(59, 130, 246, 0.1)',
                          borderRadius: '10px',
                          color: 'var(--color-sky-blue)',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        title={t('dbTitleAddFormidletPeriod')}
                        aria-label={t('dbTitleAddFormidletPeriod')}
                      >
                        <ShieldCheck size={18} />
                      </button>
                    )}
                    {activeTab === 'Formidlet' && kommuneCanEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => openFormidletExtendModal(l)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 'var(--touch-target)',
                            minWidth: 'var(--touch-target)',
                            padding: 'var(--space-2)',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: '10px',
                            color: 'var(--color-sky-blue)',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          title={t('dbTitleExtendPeriod')}
                          aria-label={t('dbTitleExtendPeriod')}
                        >
                          <CalendarPlus size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFormidlet(l.id, String(l.address ?? ''))}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 'var(--touch-target)',
                            minWidth: 'var(--touch-target)',
                            padding: 'var(--space-2)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '10px',
                            color: '#ef4444',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          title={t('dbTitleRemoveMediation')}
                          aria-label={t('dbTitleRemoveMediation')}
                        >
                          <RotateCcw size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              {timelineColorHelpOpen &&
                (isMobile ? (
                  <BottomSheet
                    open={timelineColorHelpOpen}
                    title={t('timelineColorHelpTitle')}
                    titleId="timeline-color-help-title"
                    closeLabel={t('close')}
                    onClose={() => setTimelineColorHelpOpen(false)}
                    zIndex={10050}
                  >
                    <p
                      style={{
                        margin: '0 0 var(--space-4)',
                        fontSize: '0.95rem',
                        opacity: 0.9,
                        lineHeight: 1.5,
                      }}
                    >
                      {t('timelineColorHelpIntro')}
                    </p>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: '1.1rem',
                        display: 'grid',
                        gap: 'var(--space-3)',
                        fontSize: '0.9rem',
                        lineHeight: 1.45,
                      }}
                    >
                      <li
                        style={{
                          listStyle: 'none',
                          marginLeft: '-1.1rem',
                          paddingLeft: 0,
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'flex-start',
                        }}
                      >
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            background: 'var(--color-teal)',
                            borderRadius: 3,
                            flexShrink: 0,
                            marginTop: 3,
                          }}
                        />
                        <span>{t('timelineColorHelpTeal')}</span>
                      </li>
                      <li
                        style={{
                          listStyle: 'none',
                          marginLeft: '-1.1rem',
                          paddingLeft: 0,
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'flex-start',
                        }}
                      >
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            background: 'var(--color-sky-blue)',
                            borderRadius: 3,
                            flexShrink: 0,
                            marginTop: 3,
                          }}
                        />
                        <span>{t('timelineColorHelpBlue')}</span>
                      </li>
                      <li
                        style={{
                          listStyle: 'none',
                          marginLeft: '-1.1rem',
                          paddingLeft: 0,
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'flex-start',
                        }}
                      >
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            background: '#ef4444',
                            borderRadius: 3,
                            flexShrink: 0,
                            marginTop: 3,
                          }}
                        />
                        <span>{t('timelineColorHelpRed')}</span>
                      </li>
                      <li
                        style={{
                          listStyle: 'none',
                          marginLeft: '-1.1rem',
                          paddingLeft: 0,
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'flex-start',
                        }}
                      >
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            background: '#991b1b',
                            borderRadius: 3,
                            flexShrink: 0,
                            marginTop: 3,
                          }}
                        />
                        <span>{t('timelineColorHelpConflict')}</span>
                      </li>
                    </ul>
                  </BottomSheet>
                ) : (
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="timeline-color-help-title"
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 10050,
                      background: 'rgba(0,0,0,0.55)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 'var(--space-4)',
                    }}
                    onClick={() => setTimelineColorHelpOpen(false)}
                  >
                    <div
                      className="card"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        maxWidth: 460,
                        width: '100%',
                        padding: 'var(--space-6)',
                        textAlign: 'left',
                        boxShadow: 'var(--shadow-lg, 0 12px 40px rgba(0,0,0,0.35))',
                      }}
                    >
                      <h2
                        id="timeline-color-help-title"
                        style={{ margin: '0 0 var(--space-3)', fontSize: '1.2rem' }}
                      >
                        {t('timelineColorHelpTitle')}
                      </h2>
                      <p
                        style={{
                          margin: '0 0 var(--space-4)',
                          fontSize: '0.95rem',
                          opacity: 0.9,
                          lineHeight: 1.5,
                        }}
                      >
                        {t('timelineColorHelpIntro')}
                      </p>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: '1.1rem',
                          display: 'grid',
                          gap: 'var(--space-3)',
                          fontSize: '0.9rem',
                          lineHeight: 1.45,
                        }}
                      >
                        <li
                          style={{
                            listStyle: 'none',
                            marginLeft: '-1.1rem',
                            paddingLeft: 0,
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-start',
                          }}
                        >
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              background: 'var(--color-teal)',
                              borderRadius: 3,
                              flexShrink: 0,
                              marginTop: 3,
                            }}
                          />
                          <span>{t('timelineColorHelpTeal')}</span>
                        </li>
                        <li
                          style={{
                            listStyle: 'none',
                            marginLeft: '-1.1rem',
                            paddingLeft: 0,
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-start',
                          }}
                        >
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              background: 'var(--color-sky-blue)',
                              borderRadius: 3,
                              flexShrink: 0,
                              marginTop: 3,
                            }}
                          />
                          <span>{t('timelineColorHelpBlue')}</span>
                        </li>
                        <li
                          style={{
                            listStyle: 'none',
                            marginLeft: '-1.1rem',
                            paddingLeft: 0,
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-start',
                          }}
                        >
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              background: '#ef4444',
                              borderRadius: 3,
                              flexShrink: 0,
                              marginTop: 3,
                            }}
                          />
                          <span>{t('timelineColorHelpRed')}</span>
                        </li>
                        <li
                          style={{
                            listStyle: 'none',
                            marginLeft: '-1.1rem',
                            paddingLeft: 0,
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-start',
                          }}
                        >
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              background: '#991b1b',
                              borderRadius: 3,
                              flexShrink: 0,
                              marginTop: 3,
                            }}
                          />
                          <span>{t('timelineColorHelpConflict')}</span>
                        </li>
                      </ul>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => setTimelineColorHelpOpen(false)}
                        style={{ marginTop: 'var(--space-6)', width: '100%' }}
                      >
                        {t('close')}
                      </Button>
                    </div>
                  </div>
                ))}
              <div
                ref={timelineScrollRef}
                className="card"
                style={{ padding: 'var(--space-6)', overflowX: 'auto', position: 'relative' }}
              >
                <button
                  type="button"
                  onClick={() => setTimelineColorHelpOpen(true)}
                  aria-label={t('timelineColorHelpTitle')}
                  title={t('timelineColorHelpTitle')}
                  style={{
                    position: 'absolute',
                    top: 'var(--space-3)',
                    right: 'var(--space-3)',
                    zIndex: 5,
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    borderRadius: '10px',
                    padding: 'var(--space-2) var(--space-3)',
                    cursor: 'pointer',
                    color: 'var(--color-sky-blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Info size={18} aria-hidden />
                </button>
                <div style={{ minWidth: '860px', paddingRight: '44px' }}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      marginBottom: 'var(--space-4)',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    {/* Rad 1: Måneder og År.
                        Alle tre rader (måneder, uker/dag, dato-celler) deler samme
                        CSS Grid-mal: `repeat(60, minmax(0, 1fr))`. Det er den eneste
                        måten å garantere at kolonne `i` har samme x-posisjon i alle
                        rader uansett browser-pikselavrunding — flex med `flex: N`
                        på etiketter + `flex: 1` på 60 celler driftet subpikselvis
                        og var det «logiske» problemet med markører som flytter seg
                        relativt til datoblokkene når slideren ble brukt. */}
                    <div
                      style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div style={{ width: '220px', flexShrink: 0 }}></div>
                      <div
                        style={{
                          flex: 1,
                          display: 'grid',
                          gridTemplateColumns: 'repeat(60, minmax(0, 1fr))',
                        }}
                      >
                        {Array.from({ length: 60 }).map((_, i) => {
                          const d = new Date()
                          d.setDate(d.getDate() + i + timelineOffset)
                          const isFirstOfMonth = d.getDate() === 1
                          const isJan1st = d.getMonth() === 0 && d.getDate() === 1

                          if (isFirstOfMonth || i === 0) {
                            // Finn ut hvor mange dager denne måneden har igjen i visningen
                            let daysInView = 0
                            for (let j = i; j < 60; j++) {
                              const nextD = new Date()
                              nextD.setDate(nextD.getDate() + j + timelineOffset)
                              if (nextD.getDate() === 1 && j !== i) break
                              daysInView++
                            }

                            return (
                              <div
                                key={i}
                                style={{
                                  /* Eksplisitt start- og span: etiketten ligger
                                   *  alltid i nøyaktig kolonne `i+1` over `daysInView`
                                   *  spor — auto-flow ville landet på samme sted
                                   *  her (loopen produserer ingen hull), men
                                   *  eksplisitt plassering fjerner enhver tvil. */
                                  gridColumnStart: i + 1,
                                  gridColumnEnd: `span ${daysInView}`,
                                  minWidth: 0,
                                  borderLeft: '2px solid var(--color-sky-blue)',
                                  padding: 'var(--space-1) var(--space-2)',
                                  fontSize: 'clamp(0.62rem, 0.25vw + 0.55rem, 0.72rem)',
                                  fontWeight: 700,
                                  color: 'var(--color-sky-blue)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {d.toLocaleDateString(dateLocaleTag, {
                                  month: 'long',
                                  year: isJan1st || i === 0 ? 'numeric' : undefined,
                                })}
                              </div>
                            )
                          }
                          return null
                        })}
                      </div>
                    </div>
                    {/* Rad 2: Uker og dager */}
                    <div style={{ display: 'flex' }}>
                      <div
                        style={{
                          width: '220px',
                          flexShrink: 0,
                          fontWeight: 700,
                          fontSize: 'clamp(0.7rem, 0.25vw + 0.62rem, 0.78rem)',
                          opacity: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: 'var(--space-2)',
                        }}
                      >
                        {t('dbPropertyRowHeader')}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          display: 'grid',
                          gridTemplateColumns: 'repeat(60, minmax(0, 1fr))',
                        }}
                      >
                        {Array.from({ length: 60 }).map((_, i) => {
                          const d = new Date()
                          d.setDate(d.getDate() + i + timelineOffset)
                          const isMonday = d.getDay() === 1

                          // Beregn ukenummer
                          const getWeek = (date: Date) => {
                            const tempDate = new Date(date.getTime())
                            tempDate.setHours(0, 0, 0, 0)
                            tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7))
                            const week1 = new Date(tempDate.getFullYear(), 0, 4)
                            return (
                              1 +
                              Math.round(
                                ((tempDate.getTime() - week1.getTime()) / 86400000 -
                                  3 +
                                  ((week1.getDay() + 6) % 7)) /
                                  7
                              )
                            )
                          }

                          return (
                            <div
                              key={i}
                              style={{
                                minWidth: 0,
                                textAlign: 'center',
                                fontSize: 'clamp(0.52rem, 0.2vw + 0.48rem, 0.6rem)',
                                borderLeft: isMonday ? '1px solid rgba(59, 130, 246, 0.3)' : 'none',
                                padding: 'var(--space-1) 0',
                                opacity: isMonday ? 1 : 0.4,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 'clamp(0.44rem, 0.15vw + 0.42rem, 0.52rem)',
                                  fontWeight: 600,
                                  visibility: isMonday ? 'visible' : 'hidden',
                                }}
                              >
                                U{getWeek(d)}
                              </div>
                              <span className={isMonday ? '' : 'timeline-date-optional'}>
                                {d.getDate()}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: '2px' }}>
                    {listings.filter((l) => listingMatchesMapTimelineStatusFilter(l.id)).map((l) => (
                      <div
                        key={l.id}
                        style={{
                          display: 'flex',
                          alignItems: 'stretch',
                          minHeight: 'clamp(1.75rem, 2vh + 1rem, 2rem)',
                          background: 'rgba(255,255,255,0.01)',
                          borderRadius: '4px',
                        }}
                      >
                        <div
                          onClick={() => router.push(`/listings/${l.id}?view=nav`)}
                          onMouseEnter={() => prefetchListingDetail(l.id)}
                          style={{
                            width: '220px',
                            flexShrink: 0,
                            fontSize: 'clamp(0.68rem, 0.2vw + 0.6rem, 0.76rem)',
                            padding: 'var(--space-1) var(--space-2)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            opacity: 0.9,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: 2,
                            boxSizing: 'border-box',
                          }}
                        >
                          <div
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: 600,
                            }}
                          >
                            {l.address}
                          </div>
                          {ALL_COLUMNS.filter(
                            (col) => visibleColumns.includes(col.id) && col.id !== 'address'
                          ).map((col) => (
                            <div
                              key={col.id}
                              style={{
                                fontSize: 'clamp(0.58rem, 0.16vw + 0.5rem, 0.66rem)',
                                opacity: 0.88,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {col.id === 'status'
                                ? translateValue(
                                    col.id,
                                    l[col.id],
                                    l,
                                    getStatusForToday(l.id, availability)
                                  )
                                : translateValue(col.id, l[col.id], l)}
                            </div>
                          ))}
                        </div>
                        <div
                          style={{
                            flex: 1,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(60, minmax(0, 1fr))',
                            height: 'clamp(1.1rem, 1.2vw + 0.75rem, 1.25rem)',
                            /* Samme grid-mal som header-radene over (måneder +
                             *  uker/dag): `repeat(60, minmax(0, 1fr))`. Browseren
                             *  bruker da samme kolonneberegning for alle tre
                             *  rader, så kolonne `i` har identisk x-posisjon
                             *  uansett `timelineOffset`. Eldre flex-versjon led
                             *  av subpiksel-avrunding (flex: daysInView vs flex: 1
                             *  × 60) som ga synlig drift når slideren ble brukt. */
                            alignSelf: 'center',
                          }}
                        >
                          {Array.from({ length: 60 }).map((_, i) => {
                            const date = new Date()
                            date.setHours(0, 0, 0, 0)
                            date.setDate(date.getDate() + i + timelineOffset)

                            const isWeekend = date.getDay() === 0 || date.getDay() === 6

                            // Finn alle perioder som overlapper med denne dagen
                            const periodsOnDay =
                              availability[l.id]?.filter((p) => {
                                const start = new Date(String(p.start_date ?? ''))
                                start.setHours(0, 0, 0, 0)
                                const end = new Date(String(p.end_date ?? ''))
                                end.setHours(0, 0, 0, 0)
                                return date >= start && date <= end
                              }) || []

                            const isFormidlet = periodsOnDay.some((p) => p.status === 'Formidla')
                            const isAvailable = periodsOnDay.some(
                              (p) => p.status === 'Tilgjengelig' || !p.status
                            )
                            const isUnavailable = periodsOnDay.some(
                              (p) => p.status === 'Utilgjengelig'
                            )

                            let bgColor = 'rgba(255,255,255,0.06)'
                            let opacity = 1
                            let title = `${l.address}: ${formatDateNo(date)}`

                            if (isFormidlet) {
                              bgColor = 'var(--color-sky-blue)'
                              opacity = 0.9
                              title += ' - Formidlet'
                              if (isUnavailable) {
                                bgColor = '#991b1b' // Mørkerød konflikt
                                title += ' !!! KONFLIKT MED UTILGJENGELIG !!!'
                              }
                            } else if (isAvailable) {
                              bgColor = 'var(--color-teal)'
                              opacity = 0.8
                              title += ' - TILGJENGELIG'
                              if (isUnavailable) {
                                bgColor = '#991b1b' // Mørkerød konflikt
                                title += ' !!! KONFLIKT MED UTILGJENGELIG !!!'
                              }
                            } else if (isUnavailable) {
                              bgColor = '#ef4444'
                              opacity = 0.6
                              title += ' - UTILGJENGELIG'
                            } else if (isWeekend) {
                              bgColor = 'rgba(255,255,255,0.03)'
                            }

                            const isConflict = isFormidlet && isUnavailable
                            return (
                              <div
                                key={i}
                                title={title}
                                style={{
                                  minWidth: 0,
                                  background: bgColor,
                                  borderRadius: '1px',
                                  opacity: opacity,
                                  /* Cellen er nøyaktig ett gridspor bred (1/60 av W).
                                   *  1px-border på venstre kant gir visuelt skille
                                   *  mellom dager uten å forstyrre kolonnebredden
                                   *  (globalt `box-sizing: border-box`). */
                                  border: isConflict ? '1px solid #f87171' : undefined,
                                  borderLeft: isConflict
                                    ? '1px solid #f87171'
                                    : i === 0
                                      ? '1px solid transparent'
                                      : '1px solid var(--bg-card)',
                                  animation: isConflict ? 'pulse 2s infinite' : 'none',
                                }}
                              />
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="card"
                style={{
                  padding: 'var(--space-4)',
                  display: 'grid',
                  gap: 'var(--space-2)',
                  marginTop: 'var(--space-4)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--space-6)',
                    marginBottom: 'var(--space-2)',
                    fontSize: 'clamp(0.72rem, 0.2vw + 0.66rem, 0.8rem)',
                    opacity: 0.8,
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    title={t('calendarLegendAvailableInfo')}
                  >
                    <div
                      style={{
                        width: 'clamp(10px, 1.1vw, 12px)',
                        height: 'clamp(10px, 1.1vw, 12px)',
                        background: 'var(--color-teal)',
                        borderRadius: '2px',
                      }}
                    />{' '}
                    {t('available')}
                  </div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    title={t('calendarLegendFormidletInfo')}
                  >
                    <div
                      style={{
                        width: 'clamp(10px, 1.1vw, 12px)',
                        height: 'clamp(10px, 1.1vw, 12px)',
                        background: 'var(--color-sky-blue)',
                        borderRadius: '2px',
                      }}
                    />{' '}
                    {t('formidlet')}
                  </div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    title={t('calendarLegendUnavailableInfo')}
                  >
                    <div
                      style={{
                        width: 'clamp(10px, 1.1vw, 12px)',
                        height: 'clamp(10px, 1.1vw, 12px)',
                        background: '#ef4444',
                        borderRadius: '2px',
                      }}
                    />{' '}
                    {t('unavailable')}
                  </div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    title={t('calendarLegendConflictInfo')}
                  >
                    <div
                      style={{
                        width: 'clamp(10px, 1.1vw, 12px)',
                        height: 'clamp(10px, 1.1vw, 12px)',
                        background: '#991b1b',
                        borderRadius: '2px',
                      }}
                    />{' '}
                    {t('timelineLegendConflictShort')}
                  </div>
                </div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ fontSize: 'clamp(0.78rem, 0.2vw + 0.7rem, 0.85rem)', fontWeight: 600 }}>
                    {t('dbTimelineControls')}
                  </span>
                  <button
                    onClick={() => {
                      setTimelineOffset(0)
                      /* Scroll-resetten må kjøres ALLTID (også når offset alt er 0),
                       *  ellers blir knappen død når brukeren har scrollet sideveis
                       *  uten å ha rørt slideren. */
                      timelineScrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-sky-blue)',
                      cursor: 'pointer',
                      fontSize: 'clamp(0.72rem, 0.2vw + 0.65rem, 0.8rem)',
                    }}
                  >
                    {t('dbGoToToday')}
                  </button>
                </div>
                <div
                  style={{
                    position: 'relative',
                    height: 'clamp(1.1rem, 1.2vw + 0.75rem, 1.25rem)',
                    margin: 'var(--space-2) 0',
                  }}
                >
                  <input
                    type="range"
                    min="-30"
                    max="365"
                    value={timelineOffset}
                    onChange={(e) => setTimelineOffset(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      cursor: 'pointer',
                      accentColor: 'var(--color-accent)',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      zIndex: 2,
                    }}
                  />
                  {/* Markering for "I dag" på slideren */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${(30 / (365 + 30)) * 100}%`,
                      top: '-5px',
                      bottom: '-5px',
                      width: '2px',
                      background: 'var(--color-sky-blue)',
                      zIndex: 1,
                      opacity: 0.5,
                    }}
                  ></div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 'clamp(0.62rem, 0.18vw + 0.56rem, 0.7rem)',
                    opacity: 0.5,
                  }}
                >
                  <span>{t('dbTimelineRangePast')}</span>
                  <span
                    style={{ color: 'var(--color-sky-blue)', fontWeight: 700, marginLeft: '-15%' }}
                  >
                    {t('dbTimelineRangeToday')}
                  </span>
                  <span>{t('dbTimelineRangeFuture')}</span>
                </div>
              </div>
            </div>
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
