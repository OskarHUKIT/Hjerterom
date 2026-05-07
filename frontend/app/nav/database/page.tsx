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
  Search,
  Filter,
  MapPin,
  Users,
  Info,
  ChevronRight,
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
  X,
  CalendarPlus,
  List,
} from 'lucide-react'
import { supabase, getAuthUserDeduped } from '../../lib/supabase'
import type { ListingAvailabilityRow, NavDatabaseListingRow } from '../../lib/listingUiTypes'
import { useLanguage } from '../../../context/LanguageContext'
import { formatDateNo } from '../../lib/dateFormat'
import { DateInput } from '../../components/DateInput'
import LoadingPlaceholder from '../../components/LoadingPlaceholder'
import BottomSheet from '../../components/BottomSheet'
import { Button, buttonClassName } from '../../components/ui/Button'
import {
  appendMediationNoteToOwnerMessage,
  MAX_MEDIATION_NOTE_IN_NOTIFICATION,
} from '../../lib/formidletNotification'
import { notifyLandlordInvoiceBasisIfKonto } from '../../lib/invoiceBasisNotify'
import { isKommuneStaffRole } from '../../lib/kommuneRoles'
import { getOverviewBackLink } from '../../lib/overviewBackNav'
import type { PostgrestError } from '@supabase/supabase-js'
import { logError } from '@/app/lib/appLogger'
import { useKommuneNavAccess } from '../../hooks/useKommuneNavAccess'
import {
  formidlaPeriodIdsOverlappingToday,
  listingAvailabilityStatusToday,
  listingRowFieldsForAvailabilityToday,
} from '../../lib/listingAvailabilityStatusToday'
import { supabaseErrorMessage } from '../../lib/supabaseErrorMessage'
import { dayAvailabilityToneForIso } from '../../lib/listingDayAvailabilityTone'

function navDbErrMessage(err: unknown): string {
  return supabaseErrorMessage(err)
}

type NavDbViewMode = 'table' | 'map' | 'timeline' | 'list'

const mobileNavDbViewKey = 'boly-nav-db-view-mobile'
/** Gjenopprett tabell/kart/tidslinje etter retur fra listing (samme fane). */
const sessionNavDbViewSessionKey = 'boly-nav-db-view-session'

/** Maks rader per Supabase-kall; flere sider hentes i én `fetchListings`-kjøring. */
const navDbListingsPageSize = 800
/** Slutt å hente flere sider etter dette (sikkerhetsgrense). */
const navDbListingsMaxRows = 30_000

// Dynamically import Map component to avoid SSR issues
const MapView = dynamic(() => import('../../components/MapView'), {
  ssr: false,
  loading: () => <div className="card" style={{ height: '500px' }} />,
})

export default function NavDatabase() {
  const { t, locale } = useLanguage()
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
  } = useKommuneNavAccess()

  const userRole = access?.kind === 'ok' ? access.userRole : null
  const kommuneCanEdit = access?.kind === 'ok' ? access.kommuneCanEdit : true
  const kommuneRegion = access?.kind === 'ok' ? access.kommuneRegion : null
  const isAuthorized: boolean | null =
    accessPending || access === undefined
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

  const [listings, setListings] = useState<NavDatabaseListingRow[]>([])
  const [availability, setAvailability] = useState<Record<string, ListingAvailabilityRow[]>>({})
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [tabCache, setTabCache] = useState<
    Record<
      string,
      { listings: NavDatabaseListingRow[]; availability: Record<string, ListingAvailabilityRow[]> }
    >
  >({})
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
  const [formidletModalListing, setFormidletModalListing] = useState<NavDatabaseListingRow | null>(
    null
  )
  const [formidletStart, setFormidletStart] = useState('')
  const [formidletEnd, setFormidletEnd] = useState('')
  const [formidletMediationNote, setFormidletMediationNote] = useState('')
  const [formidletIncludeNoteInOwnerNotif, setFormidletIncludeNoteInOwnerNotif] = useState(false)
  const [formidletSending, setFormidletSending] = useState(false)
  const [formidletExtendModal, setFormidletExtendModal] = useState<{
    listing: NavDatabaseListingRow
    period: ListingAvailabilityRow
  } | null>(null)
  const [formidletExtendEnd, setFormidletExtendEnd] = useState('')
  const [kommuneFetchError, setKommuneFetchError] = useState<string | null>(null)

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

  const ALL_COLUMNS = [
    { id: 'address', label: t('address') },
    { id: 'city', label: t('city') },
    { id: 'owner_name', label: t('owner') },
    { id: 'price_daily', label: isMobile ? t('dailyCost') : t('price') },
    { id: 'type', label: t('type') },
    { id: 'bedrooms', label: t('bedrooms') },
    { id: 'size_sqm', label: t('area') },
    { id: 'max_occupants', label: t('maxOccupants') },
    { id: 'floor_number', label: t('floor') },
    { id: 'status', label: t('status') },
  ]

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
  const [filters, setFilters] = useState({
    city: 'Alle',
    type: 'Alle',
    minPrice: '',
    maxPrice: '',
    accessibility: [] as string[],
    minBedrooms: '',
    minSize: '',
    minOccupants: '',
    floor: 'Alle',
    furnishing: 'Alle',
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  /** Parser kommune_region uansett format: JSON-array ["Narvik","Gratangen"], kommaseparert streng, eller faktisk array fra DB. Fjerner også ekstra anførselstegn (f.eks. "Gratangen,Narvik"). */
  const parseKommuneRegions = (val: string | string[] | null | undefined): string[] => {
    if (val == null) return []
    if (Array.isArray(val)) return val.map((r) => String(r).trim().toLowerCase()).filter(Boolean)
    let s = String(val).trim()
    if (!s) return []
    // Fjern omkringliggende anførselstegn (DB kan lagre "Gratangen,Narvik" med bokstavelige ")
    s = s.replace(/^["\\]+|["\\]+$/g, '').trim()
    if (s.startsWith('[')) {
      try {
        const arr = JSON.parse(s)
        return Array.isArray(arr)
          ? arr.map((r: unknown) => String(r).trim().toLowerCase()).filter(Boolean)
          : []
      } catch {
        return []
      }
    }
    const regionStr = s.replace(/\s+og\s+/gi, ',').replace(/[,;\n]+/g, ',')
    return regionStr
      .split(',')
      .map((r: string) =>
        r
          .replace(/^["'\s\\]+|["'\s\\]+$/g, '')
          .trim()
          .toLowerCase()
      )
      .filter(Boolean)
  }

  /** Cache-nøkkel inkluderer region slik at vi ikke gjenbruker tom cache fra før kommune_region er lastet. Kart og tidslinje: én nøkkel (status filtreres i klient, ikke ved henting). */
  const getTabCacheKey = () => {
    const base =
      viewMode === 'map' ? 'map' : viewMode === 'timeline' ? 'timeline' : `${activeTab}_${viewMode}`
    if (isKommuneStaffRole(userRole)) {
      const regions = parseKommuneRegions(kommuneRegion)
      const regionKey = regions.length ? regions.sort().join(',') : 'none'
      return `${base}_${regionKey}`
    }
    return base
  }

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

  const fetchListings = async (showLoader = true) => {
    const cacheKey = getTabCacheKey()
    if (tabCache[cacheKey]) {
      setListings(tabCache[cacheKey].listings)
      setAvailability(tabCache[cacheKey].availability)
      setLoading(false)
    } else if (!initialLoad) {
      setListings([])
      setAvailability({})
    }
    const useLoader = showLoader && !tabCache[cacheKey] && initialLoad
    if (useLoader) setLoading(true)
    try {
      const { data: terminatedUsers } = await supabase
        .from('user_agreements')
        .select('user_id')
        .eq('is_terminated', true)
      const terminatedIds = new Set(terminatedUsers?.map((u) => u.user_id) || [])

      let data: NavDatabaseListingRow[] = []
      let error: PostgrestError | null = null

      setKommuneFetchError(null)
      if (isAuthorized && isKommuneStaffRole(userRole)) {
        const acc: NavDatabaseListingRow[] = []
        let offset = 0
        let done = false
        while (!done && offset < navDbListingsMaxRows) {
          const res = await supabase.rpc('get_listings_for_kommune_paged', {
            p_limit: navDbListingsPageSize,
            p_offset: offset,
          })
          if (res.error) {
            const msg = res.error.message || ''
            const missingFn =
              res.error.code === '42883' ||
              /function.*does not exist|Could not find the function/i.test(msg)
            if (missingFn && acc.length === 0) {
              const legacy = await supabase.rpc('get_listings_for_kommune')
              if (legacy.error) {
                setKommuneFetchError(legacy.error.message || t('dbRpcFetchErrorHint'))
                error = legacy.error
                data = []
              } else {
                const raw = legacy.data
                data = (Array.isArray(raw) ? raw : raw != null ? [raw] : []) as NavDatabaseListingRow[]
                error = null
              }
            } else {
              setKommuneFetchError(res.error.message || t('dbRpcFetchErrorHint'))
              error = acc.length > 0 ? null : res.error
              data = acc
            }
            done = true
            break
          }
          const raw = res.data
          const batch = (Array.isArray(raw) ? raw : raw != null ? [raw] : []) as NavDatabaseListingRow[]
          acc.push(...batch)
          if (batch.length < navDbListingsPageSize) {
            data = acc
            error = null
            done = true
            break
          }
          offset += batch.length
          if (offset >= navDbListingsMaxRows) {
            data = acc
            error = null
            if (batch.length === navDbListingsPageSize) {
              logError('[nav/database] listings fetch stopped at row cap', navDbListingsMaxRows)
            }
            done = true
          }
        }
        if (!done && acc.length > 0 && data.length === 0) {
          data = acc
          error = null
        }
      } else {
        const acc: NavDatabaseListingRow[] = []
        let from = 0
        let done = false
        while (!done && from < navDbListingsMaxRows) {
          const to = from + navDbListingsPageSize - 1
          const result = await supabase
            .from('listings')
            .select('*')
            .order('created_at', { ascending: false })
            .range(from, to)
          if (result.error) {
            error = result.error
            data = acc.length > 0 ? acc : ((result.data || []) as NavDatabaseListingRow[])
            done = true
            break
          }
          const batch = (result.data || []) as NavDatabaseListingRow[]
          acc.push(...batch)
          if (batch.length === 0 || batch.length < navDbListingsPageSize) {
            data = acc
            error = null
            done = true
            break
          }
          from += batch.length
          if (from >= navDbListingsMaxRows) {
            data = acc
            error = null
            if (batch.length === navDbListingsPageSize) {
              logError('[nav/database] listings fetch stopped at row cap', navDbListingsMaxRows)
            }
            done = true
          }
        }
        if (!done && acc.length > 0 && data.length === 0) {
          data = acc
          error = null
        }
      }

      if (error) throw error
      let filtered = data || []

      const afterTerminatedCount = (() => {
        if (terminatedIds.size > 0) {
          filtered = filtered.filter((item) => !terminatedIds.has(item.owner_id))
        }
        return filtered.length
      })()

      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        filtered = filtered.filter(
          (item) =>
            String(item.address ?? '')
              .toLowerCase()
              .includes(q) ||
            String(item.owner_name ?? '')
              .toLowerCase()
              .includes(q)
        )
      }
      // Tillatelsesområder: kommune ser bare boliger i kommuner de har eksplisitt tilgang til
      const regions =
        isAuthorized && isKommuneStaffRole(userRole) ? parseKommuneRegions(kommuneRegion) : []
      if (isAuthorized && isKommuneStaffRole(userRole)) {
        if (regions.length > 0) {
          filtered = filtered.filter((item) => {
            const city = (item.city || '').trim().toLowerCase()
            return city && regions.some((r: string) => r === city)
          })
        } else {
          filtered = [] // Ingen tillatelsesområder satt = ingen boliger (kun eksplisitt tilgang)
        }
      }
      if (filters.city !== 'Alle') {
        filtered = filtered.filter((item) => item.city === filters.city)
      }
      if (filters.type !== 'Alle') {
        filtered = filtered.filter((item) => item.type === filters.type)
      }
      if (filters.minPrice) {
        const min = parseFloat(filters.minPrice)
        filtered = filtered.filter((item) => Number(item.price_daily) >= min)
      }
      if (filters.maxPrice) {
        const max = parseFloat(filters.maxPrice)
        filtered = filtered.filter((item) => Number(item.price_daily) <= max)
      }
      if (filters.minBedrooms) {
        const minB = parseInt(filters.minBedrooms, 10)
        filtered = filtered.filter((item) => Number(item.bedrooms) >= minB)
      }
      if (filters.minSize) {
        const minS = parseFloat(filters.minSize)
        filtered = filtered.filter((item) => Number(item.size_sqm) >= minS)
      }
      if (filters.minOccupants) {
        const minO = parseInt(filters.minOccupants, 10)
        filtered = filtered.filter((item) => Number(item.max_occupants) >= minO)
      }
      if (filters.floor !== 'Alle') {
        filtered = filtered.filter((item) => item.floor_number === filters.floor)
      }
      if (filters.furnishing !== 'Alle') {
        filtered = filtered.filter((item) => item.furnishing === filters.furnishing)
      }
      if (filters.accessibility.length > 0) {
        filtered = filtered.filter((item) => {
          const acc = item.accessibility
          return (
            Array.isArray(acc) &&
            filters.accessibility.every((a) => (acc as string[]).includes(a))
          )
        })
      }

      let availMap: Record<string, ListingAvailabilityRow[]> = {}
      if (filtered.length > 0) {
        const listingIds = filtered.map((l) => l.id)
        const { data: availabilityData } = await supabase
          .from('listing_availability')
          .select('*')
          .in('listing_id', listingIds)
          .order('start_date', { ascending: true })

        availabilityData?.forEach((item) => {
          if (!availMap[item.listing_id]) availMap[item.listing_id] = []
          availMap[item.listing_id].push(item)
        })

        // Liste/tabell: filtrer på status for dagens dato. Kart og tidslinje: alle boliger hentes; status filtreres i UI (mapStatusFilter).
        if (viewMode === 'table' || viewMode === 'list') {
          const todayStatus = (lid: string) => getStatusForToday(lid, availMap)
          if (activeTab === 'Tilgjengelig') {
            filtered = filtered.filter((l) => {
              const s = todayStatus(l.id)
              return s === 'Tilgjengelig'
            })
          } else if (activeTab === 'Formidlet') {
            filtered = filtered.filter((l) => todayStatus(l.id) === 'Formidla')
          } else if (activeTab === 'Utilgjengelig') {
            filtered = filtered.filter((l) => todayStatus(l.id) === 'Utilgjengelig')
          }
        }
      }

      filtered.sort((a, b) => {
        const valA = (a as Record<string, unknown>)[sortField]
        const valB = (b as Record<string, unknown>)[sortField]
        const sa = valA == null ? '' : String(valA)
        const sb = valB == null ? '' : String(valB)
        const cmp = sa.localeCompare(sb, undefined, { numeric: true })
        return sortOrder === 'asc' ? cmp : -cmp
      })

      setListings(filtered)
      setAvailability(availMap)

      setTabCache((prev) => ({
        ...prev,
        [getTabCacheKey()]: { listings: filtered, availability: availMap },
      }))
      setInitialLoad(false)
    } catch (err: unknown) {
      logError('Error fetching listings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthorized) return
    // For kommune uten region ennå: vis tom liste (ikke blank skjerm), så vi henter på nytt når region er satt
    if (isKommuneStaffRole(userRole) && kommuneRegion == null) {
      setLoading(false)
      setListings([])
      setAvailability({})
      return
    }
    fetchListings()
    // fetchListings leser/oppdaterer tabCache; å liste den som avhengighet gir henteløkke.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- synk med activeTab, filtre, region osv. over
  }, [
    activeTab,
    searchTerm,
    filters,
    sortField,
    sortOrder,
    viewMode,
    isAuthorized,
    userRole,
    kommuneRegion,
  ])

  if (accessError) {
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

  const closeFormidletModal = () => {
    if (formidletSending) return
    setFormidletModalListing(null)
    setFormidletMediationNote('')
    setFormidletIncludeNoteInOwnerNotif(false)
  }

  const openFormidletModal = (listing: NavDatabaseListingRow) => {
    const today = new Date().toISOString().slice(0, 10)
    setFormidletModalListing(listing)
    setFormidletStart(today)
    setFormidletEnd(today)
    setFormidletMediationNote('')
    setFormidletIncludeNoteInOwnerNotif(false)
  }

  const openFormidletExtendModal = (listing: NavDatabaseListingRow) => {
    const periods = (availability[listing.id] || [])
      .filter((p) => p.status === 'Formidla')
      .sort((a, b) => String(b.end_date ?? '').localeCompare(String(a.end_date ?? '')))
    const latest = periods[0]
    if (!latest?.end_date) return
    setFormidletExtendModal({ listing, period: latest })
    setFormidletExtendEnd(latest.end_date)
  }

  const handleExtendFormidlet = async () => {
    if (!formidletExtendModal || !formidletExtendEnd) return
    const { listing, period } = formidletExtendModal
    if (!period.id || !period.end_date) return
    if (listing?.owner_id) {
      const { data: ownerTerm } = await supabase
        .from('user_agreements')
        .select('id')
        .eq('user_id', listing.owner_id)
        .eq('is_terminated', true)
        .maybeSingle()
      if (ownerTerm) {
        alert(t('expiredOwnerNoMediationNav'))
        return
      }
    }
    if (new Date(formidletExtendEnd) < new Date(String(period.end_date))) {
      alert(t('dbExtendEndAfterCurrent'))
      return
    }
    if (
      !confirm(
        t('dbExtendConfirm')
          .replace('{address}', String(listing.address ?? ''))
          .replace('{date}', formatDateNo(formidletExtendEnd))
      )
    )
      return
    setFormidletSending(true)
    try {
      const { error } = await supabase
        .from('listing_availability')
        .update({ end_date: formidletExtendEnd })
        .eq('id', period.id)
      if (error) throw error
      const user = await getAuthUserDeduped()
      if (listing.owner_id) {
        await supabase.from('audit_logs').insert([
          {
            user_id: listing.owner_id,
            listing_id: listing.id,
            action_type: 'KOMMUNE_EXTEND_FORMIDLA',
            listing_address: listing.address,
            details: {
              performed_by_user_id: user?.id,
              period_id: period.id,
              new_end: formidletExtendEnd,
            },
          },
        ])
        await supabase
          .from('notifications')
          .insert([
            {
              owner_id: listing.owner_id,
              type: 'HOUSE_FORMIDLET',
              title: 'Formidlingsperiode forlenget',
              message: `Kommunen har forlenget formidlingsperioden for ${listing.address} til ${formatDateNo(formidletExtendEnd)}.`,
              listing_id: listing.id,
            },
          ])
      }
      setFormidletExtendModal(null)
      fetchListings(false)
    } catch (err: unknown) {
      alert(t('errorPrefix') + navDbErrMessage(err))
    } finally {
      setFormidletSending(false)
    }
  }

  const handleMarkAsFormidlet = async () => {
    if (!formidletModalListing || !formidletStart || !formidletEnd) {
      alert(t('dbSelectStartEnd'))
      return
    }
    if (new Date(formidletEnd) < new Date(formidletStart)) {
      alert(t('endDateAfterStart'))
      return
    }
    const id = formidletModalListing.id
    const address = String(formidletModalListing.address ?? '')
    const listing = formidletModalListing
    if (listing?.owner_id) {
      const { data: ownerTerm } = await supabase
        .from('user_agreements')
        .select('id')
        .eq('user_id', listing.owner_id)
        .eq('is_terminated', true)
        .maybeSingle()
      if (ownerTerm) {
        alert(t('expiredOwnerNoMediationNav'))
        return
      }
    }
    const noteTrimmed = formidletMediationNote.trim()
    const includeNote = !!(formidletIncludeNoteInOwnerNotif && noteTrimmed)
    const attachSchema = confirm(
      t('dbMarkFormidletConfirm')
        .replace('{address}', address)
        .replace('{start}', formatDateNo(formidletStart))
        .replace('{end}', formatDateNo(formidletEnd))
    )
    if (!attachSchema) return

    setFormidletSending(true)
    try {
      // 1. Legg til formidlet-periode i listing_availability (flere perioder per bolig er tillatt)
      const { data: insertedPeriod, error: availError } = await supabase
        .from('listing_availability')
        .insert([
          {
            listing_id: id,
            start_date: formidletStart,
            end_date: formidletEnd,
            status: 'Formidla',
            mediation_note: noteTrimmed || null,
            include_note_in_owner_notification: includeNote,
          },
        ])
        .select()
        .single()

      if (availError) throw availError
      if (!insertedPeriod) throw new Error('listing_availability insert returned no row')

      // 2. Synk listings-rad med status for i dag (f.eks. kun fremtidig periode → fortsatt tilgjengelig)
      const mergedAvail = [...(availability[id] || []), insertedPeriod as ListingAvailabilityRow]
      const rowSync = listingRowFieldsForAvailabilityToday(id, { ...availability, [id]: mergedAvail })
      const { error } = await supabase.from('listings').update(rowSync).eq('id', id)

      if (error) throw error

      const user = await getAuthUserDeduped()
      if (listing?.owner_id) {
        await supabase.from('audit_logs').insert([
          {
            user_id: listing.owner_id,
            listing_id: id,
            action_type: 'KOMMUNE_MARK_FORMIDLA',
            listing_address: address,
            details: {
              performed_by_user_id: user?.id,
              by: 'Kommune-ansatt',
              attached_schema: attachSchema,
              start_date: formidletStart,
              end_date: formidletEnd,
              include_note_in_owner_notification: includeNote,
              has_mediation_note: !!noteTrimmed,
            },
          },
        ])
      }

      if (listing?.owner_id) {
        await supabase
          .from('listing_tenant_tokens')
          .upsert([{ listing_id: id }], { onConflict: 'listing_id' })
        const baseMsg = `Kommunen har markert boligen din i ${address} som formidlet for perioden ${formatDateNo(formidletStart)}–${formatDateNo(formidletEnd)}. Lever overtakelsesrapport ved overtakelse – klikk for å åpne skjema.`
        const message = appendMediationNoteToOwnerMessage(baseMsg, noteTrimmed, includeNote)
        await supabase.from('notifications').insert([
          {
            owner_id: listing.owner_id,
            type: 'HOUSE_FORMIDLET',
            title: 'Bolig formidlet',
            message,
            listing_id: id,
          },
        ])
        await notifyLandlordInvoiceBasisIfKonto(supabase, {
          ownerId: listing.owner_id,
          listingId: id,
          address,
          paymentMethod: listing.payment_method as string | null | undefined,
        })
      }

      setAvailability((prev) => ({ ...prev, [id]: mergedAvail }))
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, ...rowSync } : l)))
      setFormidletMediationNote('')
      setFormidletIncludeNoteInOwnerNotif(false)
      setFormidletModalListing(null)
      fetchListings(false) // Synk tab-filter m.m.
    } catch (err: unknown) {
      alert(t('errorPrefix') + navDbErrMessage(err))
    } finally {
      setFormidletSending(false)
    }
  }

  const handleRemoveFormidlet = async (id: string, address: string) => {
    if (!confirm(t('dbRemoveFormidletConfirm').replace('{address}', address))) return
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

      setAvailability((prev) => ({ ...prev, [id]: nextAvailRows }))
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, ...rowSync } : l)))
      fetchListings(false)
    } catch (err: unknown) {
      alert(t('errorPrefix') + navDbErrMessage(err))
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

      {showFilters &&
        (() => {
          const filtersInner = (
            <>
          {(viewMode === 'map' || viewMode === 'timeline') && (
            <div
              style={{
                marginBottom: 'var(--space-6)',
                paddingBottom: 'var(--space-6)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <label className="label" style={{ display: 'block', marginBottom: 'var(--space-3)' }}>
                {t('dbMapShowStatuses')}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                {(['Tilgjengelig', 'Utilgjengelig', 'Formidlet'] as const).map((status) => {
                  const statusLabel =
                    status === 'Tilgjengelig'
                      ? t('available')
                      : status === 'Utilgjengelig'
                        ? t('unavailable')
                        : t('formidlet')
                  return (
                    <label
                      key={status}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        color: 'var(--text-main)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={mapStatusFilter.includes(status)}
                        onChange={() =>
                          setMapStatusFilter((prev) => {
                            if (prev.includes(status)) {
                              if (prev.length <= 1) return prev
                              return prev.filter((s) => s !== status)
                            }
                            return [...prev, status].sort()
                          })
                        }
                        style={{
                          width: '18px',
                          height: '18px',
                          accentColor: 'var(--color-accent)',
                        }}
                      />
                      {status === 'Tilgjengelig' && (
                        <CheckCircle2 size={16} style={{ color: 'var(--color-teal)' }} />
                      )}
                      {status === 'Utilgjengelig' && (
                        <XCircle size={16} style={{ color: '#ef4444' }} />
                      )}
                      {status === 'Formidlet' && (
                        <ShieldCheck size={16} style={{ color: 'var(--color-sky-blue)' }} />
                      )}
                      {statusLabel}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-6)',
            }}
          >
            <div>
              <label className="label">{t('dbSearch')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input"
                  placeholder={t('dbSearchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Search
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '14px', opacity: 0.5 }}
                />
              </div>
            </div>
            <div>
              <label className="label">{t('dbRegion')}</label>
              <select
                className="input"
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              >
                <option value="Alle">{t('all')}</option>
                <option>Narvik</option>
                <option>Gratangen</option>
                <option>Evenes</option>
                <option>Oslo</option>
                <option>Bergen</option>
                <option>Trondheim</option>
                <option>Stavanger</option>
              </select>
            </div>
            <div>
              <label className="label">{t('dbPropertyType')}</label>
              <select
                className="input"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="Alle">{t('all')}</option>
                <option>Enebolig/flermannsbolig</option>
                <option>Leilighet</option>
                <option>Hybelleilighet</option>
                <option>Hybel</option>
                <option>Bokollektiv</option>
              </select>
            </div>
          </div>

          <div
            style={{
              marginTop: 'var(--space-6)',
              paddingTop: 'var(--space-6)',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              aria-expanded={showAdvancedFilters}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-accent)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
                transition: `color var(--transition-fast) var(--ease-out-soft)`,
              }}
            >
              {showAdvancedFilters ? t('dbAdvancedFiltersHide') : t('dbAdvancedFiltersShow')}
              <ChevronRight
                size={16}
                style={{
                  transform: showAdvancedFilters ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            </button>

            {showAdvancedFilters && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 'var(--space-6)',
                  marginTop: 'var(--space-6)',
                }}
              >
                <div>
                  <label className="label">{t('dbPricePerDay')}</label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <input
                      type="number"
                      className="input"
                      placeholder={t('dbFrom')}
                      value={filters.minPrice}
                      onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                      style={{ marginBottom: 0 }}
                    />
                    <input
                      type="number"
                      className="input"
                      placeholder={t('dbTo')}
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                      style={{ marginBottom: 0 }}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">{t('dbMinBedrooms')}</label>
                  <input
                    type="number"
                    className="input"
                    placeholder={t('dbPlaceholderEg2')}
                    value={filters.minBedrooms}
                    onChange={(e) => setFilters({ ...filters, minBedrooms: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{t('dbMinArea')}</label>
                  <input
                    type="number"
                    className="input"
                    placeholder={t('dbPlaceholderEg50')}
                    value={filters.minSize}
                    onChange={(e) => setFilters({ ...filters, minSize: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{t('dbMinPeople')}</label>
                  <input
                    type="number"
                    className="input"
                    placeholder={t('dbPlaceholderEg3')}
                    value={filters.minOccupants}
                    onChange={(e) => setFilters({ ...filters, minOccupants: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{t('dbFurnishing')}</label>
                  <select
                    className="input"
                    value={filters.furnishing}
                    onChange={(e) => setFilters({ ...filters, furnishing: e.target.value })}
                  >
                    <option value="Alle">{t('all')}</option>
                    <option>Umøblert</option>
                    <option>Kun hvitevarer</option>
                    <option>Fullt møblert</option>
                    <option>
                      Fullt møblert og boligen har alt nødvendig inventar for matlaging og
                      overnatting.
                    </option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">{t('dbAccessibility')}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[
                      'Alt på ett plan',
                      'Heis i bygget',
                      'Terskelfritt',
                      'Universell utforming',
                      'Omsorgsboligstandard',
                    ].map((acc) => (
                      <button
                        key={acc}
                        onClick={() => {
                          const newAcc = filters.accessibility.includes(acc)
                            ? filters.accessibility.filter((a) => a !== acc)
                            : [...filters.accessibility, acc]
                          setFilters({ ...filters, accessibility: newAcc })
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          background: filters.accessibility.includes(acc)
                            ? 'var(--color-accent)'
                            : 'var(--bg-app)',
                          border: `1px solid ${filters.accessibility.includes(acc) ? 'var(--color-accent)' : 'var(--border-subtle)'}`,
                          color: filters.accessibility.includes(acc)
                            ? 'var(--text-on-dark)'
                            : 'var(--text-main)',
                        }}
                      >
                        {acc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 'var(--space-6)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--space-4)',
            }}
          >
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setSearchTerm('')
                setFilters({
                  city: 'Alle',
                  type: 'Alle',
                  minPrice: '',
                  maxPrice: '',
                  accessibility: [],
                  minBedrooms: '',
                  minSize: '',
                  minOccupants: '',
                  floor: 'Alle',
                  furnishing: 'Alle',
                })
              }}
              style={{ minHeight: 'auto', padding: 'var(--space-2) var(--space-3)' }}
            >
              {t('dbResetFilters')}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => setShowFilters(false)}
              style={{ padding: '8px 24px' }}
            >
              {t('dbDone')}
            </Button>
          </div>
            </>
          )
          return isMobile ? (
            <BottomSheet
              open={showFilters}
              title={t('dbFilterOpen')}
              titleId="db-filters-sheet"
              closeLabel={t('dbDone')}
              onClose={() => setShowFilters(false)}
              zIndex={2100}
            >
              {filtersInner}
            </BottomSheet>
          ) : (
            <div
              className="card card-settings-panel"
              style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-8)' }}
            >
              {filtersInner}
            </div>
          )
        })()}

      {/* Modal: Legg inn formidlet periode */}
      {formidletModalListing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => closeFormidletModal()}
        >
          <div
            className="card"
            style={{ padding: 'var(--space-8)', maxWidth: '420px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-6)',
              }}
            >
              <h3 style={{ margin: 0 }}>{t('dbModalAddFormidletTitle')}</h3>
              <button
                onClick={() => closeFormidletModal()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>
            <p
              style={{
                marginBottom: 'var(--space-4)',
                fontSize: '0.95rem',
                color: 'var(--text-muted)',
              }}
            >
              {formidletModalListing.address}
            </p>
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <label className="label">{t('periodDateRange')}</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 'var(--space-3)',
                  marginTop: 'var(--space-2)',
                }}
                className="formidlet-date-range"
              >
                <div>
                  <span
                    className="text-sm"
                    style={{ display: 'block', marginBottom: '4px', opacity: 0.8 }}
                  >
                    {t('from')}
                  </span>
                  <DateInput
                    showCalendar
                    className="input"
                    style={{ marginBottom: 0, width: '100%' }}
                    value={formidletStart}
                    onChange={setFormidletStart}
                    max={formidletEnd || undefined}
                    placeholder={t('dateInputPlaceholder')}
                    calendarDayTone={(iso) =>
                      dayAvailabilityToneForIso(iso, availability[formidletModalListing.id] ?? [])
                    }
                  />
                </div>
                <div>
                  <span
                    className="text-sm"
                    style={{ display: 'block', marginBottom: '4px', opacity: 0.8 }}
                  >
                    {t('to')}
                  </span>
                  <DateInput
                    showCalendar
                    className="input"
                    style={{ marginBottom: 0, width: '100%' }}
                    value={formidletEnd}
                    onChange={setFormidletEnd}
                    min={formidletStart || undefined}
                    placeholder={t('dateInputPlaceholder')}
                    calendarDayTone={(iso) =>
                      dayAvailabilityToneForIso(iso, availability[formidletModalListing.id] ?? [])
                    }
                  />
                </div>
              </div>
            </div>
            <details
              style={{
                fontSize: '0.85rem',
                marginBottom: 'var(--space-6)',
                color: 'var(--text-muted)',
              }}
            >
              <summary style={{ cursor: 'pointer', userSelect: 'none', color: 'var(--text-main)' }}>
                {t('mediationNoteOptional')}
              </summary>
              <div style={{ marginTop: 'var(--space-3)', display: 'grid', gap: 'var(--space-2)' }}>
                <textarea
                  className="input"
                  rows={2}
                  maxLength={MAX_MEDIATION_NOTE_IN_NOTIFICATION}
                  value={formidletMediationNote}
                  onChange={(e) => {
                    const v = e.target.value
                    setFormidletMediationNote(v)
                    if (!v.trim()) setFormidletIncludeNoteInOwnerNotif(false)
                  }}
                  placeholder={t('mediationNotePlaceholder')}
                  style={{
                    marginBottom: 0,
                    width: '100%',
                    resize: 'vertical',
                    minHeight: '48px',
                    maxHeight: '120px',
                    fontSize: '0.9rem',
                  }}
                />
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-2)',
                    cursor: 'pointer',
                    color: 'var(--text-body)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formidletIncludeNoteInOwnerNotif}
                    onChange={(e) => setFormidletIncludeNoteInOwnerNotif(e.target.checked)}
                    style={{ marginTop: '2px', width: '18px', height: '18px' }}
                  />
                  <span>{t('includeMediationNoteInNotification')}</span>
                </label>
              </div>
            </details>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button
                onClick={() => closeFormidletModal()}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  padding: 'var(--space-3) var(--space-5)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleMarkAsFormidlet}
                disabled={formidletSending}
                className="button button-success"
              >
                {formidletSending ? (
                  <ShieldCheck size={18} style={{ opacity: 0.5 }} />
                ) : (
                  <ShieldCheck size={18} />
                )}
                {formidletSending ? ` ${t('dbSavingShort')}` : ` ${t('dbConfirmMediation')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Forleng formidlet periode */}
      {formidletExtendModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => !formidletSending && setFormidletExtendModal(null)}
        >
          <div
            className="card"
            style={{ padding: 'var(--space-8)', maxWidth: '420px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-6)',
              }}
            >
              <h3 style={{ margin: 0 }}>{t('dbModalExtendTitle')}</h3>
              <button
                onClick={() => !formidletSending && setFormidletExtendModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>
            <p
              style={{
                marginBottom: 'var(--space-4)',
                fontSize: '0.95rem',
                color: 'var(--text-muted)',
              }}
            >
              {formidletExtendModal.listing.address}
            </p>
            <p style={{ marginBottom: 'var(--space-3)', fontSize: '0.9rem' }}>
              {t('dbModalExtendCurrent')} {formatDateNo(formidletExtendModal.period.start_date)} –{' '}
              {formatDateNo(formidletExtendModal.period.end_date)}
            </p>
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <label className="label">{t('dbModalNewEndDate')}</label>
              <DateInput
                showCalendar
                className="input"
                style={{ marginTop: 'var(--space-2)', width: '100%' }}
                value={formidletExtendEnd}
                onChange={setFormidletExtendEnd}
                min={formidletExtendModal.period.end_date}
                placeholder={t('dateInputPlaceholder')}
                calendarDayTone={(iso) =>
                  dayAvailabilityToneForIso(iso, availability[formidletExtendModal.listing.id] ?? [])
                }
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button
                onClick={() => !formidletSending && setFormidletExtendModal(null)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  padding: 'var(--space-3) var(--space-5)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleExtendFormidlet}
                disabled={formidletSending}
                className="button button-success"
              >
                {formidletSending ? ` ${t('dbSavingShort')}` : t('dbExtendButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        {loading ? (
          <LoadingPlaceholder minHeight={300} />
        ) : listings.length > 0 ? (
          viewMode === 'table' ? (
            <div className="card db-table-wrapper" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', minHeight: '200px' }}
              >
                <table
                  className="db-table"
                  style={{
                    width: '100%',
                    minWidth: visibleColumns.length <= 2 && isMobile ? '100%' : '600px',
                    borderCollapse: 'collapse',
                    fontSize: '0.9rem',
                  }}
                >
                  <thead>
                    <tr style={{ background: 'rgba(59, 130, 246, 0.1)', textAlign: 'left' }}>
                      {ALL_COLUMNS.filter((col) => visibleColumns.includes(col.id)).map((col) => (
                        <th
                          key={col.id}
                          style={{ padding: 'var(--space-4)', cursor: 'pointer' }}
                          onClick={() => toggleSort(col.id)}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {col.label} <ArrowUpDown size={14} style={{ flexShrink: 0 }} />
                          </div>
                        </th>
                      ))}
                      <th style={{ padding: 'var(--space-4)' }}>{t('dbActionColumn')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((l, i) => (
                      <tr
                        key={l.id}
                        onClick={() => router.push(`/listings/${l.id}?view=nav`)}
                        style={{
                          borderTop: '1px solid var(--border-subtle)',
                          background: i % 2 === 0 ? 'transparent' : 'rgba(59, 130, 246, 0.04)',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          prefetchListingDetail(l.id)
                          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'
                        }}
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background =
                            i % 2 === 0 ? 'transparent' : 'rgba(59, 130, 246, 0.04)')
                        }
                      >
                        {ALL_COLUMNS.filter((col) => visibleColumns.includes(col.id)).map((col) => (
                          <td key={col.id} style={{ padding: 'var(--space-4)' }}>
                            {col.id === 'status'
                              ? translateValue(
                                  col.id,
                                  l[col.id],
                                  l,
                                  getStatusForToday(l.id, availability)
                                )
                              : translateValue(col.id, l[col.id], l)}
                          </td>
                        ))}
                        <td
                          style={{ padding: 'var(--space-4)' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <Link
                              href={`/listings/${l.id}?view=nav`}
                              style={{
                                padding: '6px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                borderRadius: '6px',
                                color: 'var(--color-sky-blue)',
                              }}
                              title={t('seeDetails')}
                            >
                              <Eye size={16} />
                            </Link>
                            {activeTab === 'Tilgjengelig' && kommuneCanEdit && (
                              <button
                                onClick={() => openFormidletModal(l)}
                                style={{
                                  padding: '6px',
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  borderRadius: '6px',
                                  color: 'var(--color-sky-blue)',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                                title={t('dbTitleAddFormidletPeriod')}
                              >
                                <ShieldCheck size={16} />
                              </button>
                            )}
                            {activeTab === 'Formidlet' && kommuneCanEdit && (
                              <>
                                <button
                                  onClick={() => openFormidletExtendModal(l)}
                                  style={{
                                    padding: '6px',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    borderRadius: '6px',
                                    color: 'var(--color-sky-blue)',
                                    border: 'none',
                                    cursor: 'pointer',
                                  }}
                                  title={t('dbTitleExtendPeriod')}
                                >
                                  <CalendarPlus size={16} />
                                </button>
                                <button
                                  onClick={() =>
                                    handleRemoveFormidlet(l.id, String(l.address ?? ''))
                                  }
                                  style={{
                                    padding: '6px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: '6px',
                                    color: '#ef4444',
                                    border: 'none',
                                    cursor: 'pointer',
                                  }}
                                  title={t('dbTitleRemoveMediation')}
                                >
                                  <RotateCcw size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
                    {/* Rad 1: Måneder og År */}
                    <div
                      style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div style={{ width: '220px', flexShrink: 0 }}></div>
                      <div style={{ flex: 1, display: 'flex' }}>
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
                                  flex: daysInView,
                                  borderLeft: '2px solid var(--color-sky-blue)',
                                  padding: 'var(--space-1) var(--space-2)',
                                  fontSize: 'clamp(0.62rem, 0.25vw + 0.55rem, 0.72rem)',
                                  fontWeight: 700,
                                  color: 'var(--color-sky-blue)',
                                  whiteSpace: 'nowrap',
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
                      <div style={{ flex: 1, display: 'flex' }}>
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
                                flex: 1,
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
                            display: 'flex',
                            height: 'clamp(1.1rem, 1.2vw + 0.75rem, 1.25rem)',
                            gap: '1px',
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

                            return (
                              <div
                                key={i}
                                title={title}
                                style={{
                                  flex: 1,
                                  background: bgColor,
                                  borderRadius: '1px',
                                  opacity: opacity,
                                  border:
                                    isFormidlet && isUnavailable ? '1px solid #f87171' : 'none',
                                  animation:
                                    isFormidlet && isUnavailable ? 'pulse 2s infinite' : 'none',
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
                    onClick={() => setTimelineOffset(0)}
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
        @media (max-width: 400px) {
          .formidlet-date-range {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  )
}
