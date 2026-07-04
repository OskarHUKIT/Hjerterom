import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/app/lib/supabase'
import type { ListingAvailabilityRow, NavDatabaseListingRow } from '@/app/lib/listingUiTypes'
import { isKommuneStaffRole } from '@/app/lib/kommuneRoles'
import { isEventStaffRole } from '@/app/lib/eventStaffRoles'
import { listingAvailabilityStatusToday } from '@/app/lib/listingAvailabilityStatusToday'
import { logError } from '@/app/lib/appLogger'
import {
  type NavDbViewMode,
  navDbListingsMaxRows,
  navDbListingsPageSize,
} from '@/features/mediation/constants/navDatabase'

export type NavDatabaseListingsPayload = {
  listings: NavDatabaseListingRow[]
  availability: Record<string, ListingAvailabilityRow[]>
}

export type NavDatabaseFilters = {
  city: string
  type: string
  minPrice: string
  maxPrice: string
  accessibility: string[]
  minBedrooms: string
  minSize: string
  minOccupants: string
  floor: string
  furnishing: string
}

export type FetchNavDatabaseListingsParams = {
  isEventPortal: boolean
  userRole: string | null
  isAuthorized: boolean
  searchTerm: string
  filters: NavDatabaseFilters
  eventFilterId: string
  sortField: string
  sortOrder: 'asc' | 'desc'
  viewMode: NavDbViewMode
  activeTab: 'Tilgjengelig' | 'Utilgjengelig' | 'Formidlet' | 'Ikke markert'
  rpcErrorHint: string
}

export type NavDatabaseListingsFetchResult = NavDatabaseListingsPayload & {
  fetchError: string | null
}

async function fetchTerminatedOwnerIds(): Promise<Set<string>> {
  const { data: terminatedUsers } = await supabase
    .from('user_agreements')
    .select('user_id')
    .eq('is_terminated', true)
  return new Set(terminatedUsers?.map((u) => u.user_id) || [])
}

async function fetchListingsFromRpc(
  rpcName: 'get_listings_for_event_staff_paged' | 'get_listings_for_kommune_paged',
  rpcErrorHint: string
): Promise<{ data: NavDatabaseListingRow[]; error: PostgrestError | null; fetchError: string | null }> {
  const acc: NavDatabaseListingRow[] = []
  let offset = 0
  let done = false
  let fetchError: string | null = null

  while (!done && offset < navDbListingsMaxRows) {
    const res = await supabase.rpc(rpcName, {
      p_limit: navDbListingsPageSize,
      p_offset: offset,
    })
    if (res.error) {
      fetchError = res.error.message || rpcErrorHint
      return {
        data: acc,
        error: acc.length > 0 ? null : res.error,
        fetchError,
      }
    }
    const raw = res.data
    const batch = (Array.isArray(raw) ? raw : raw != null ? [raw] : []) as NavDatabaseListingRow[]
    acc.push(...batch)
    if (batch.length < navDbListingsPageSize) {
      return { data: acc, error: null, fetchError: null }
    }
    offset += batch.length
    if (offset >= navDbListingsMaxRows) {
      if (batch.length === navDbListingsPageSize) {
        logError('[nav/database] listings fetch stopped at row cap', navDbListingsMaxRows)
      }
      return { data: acc, error: null, fetchError: null }
    }
  }

  return { data: acc, error: null, fetchError: null }
}

async function fetchKommuneListings(
  rpcErrorHint: string
): Promise<{ data: NavDatabaseListingRow[]; error: PostgrestError | null; fetchError: string | null }> {
  const paged = await fetchListingsFromRpc('get_listings_for_kommune_paged', rpcErrorHint)
  if (paged.error) {
    const msg = paged.error.message || ''
    const missingFn =
      paged.error.code === '42883' ||
      /function.*does not exist|Could not find the function/i.test(msg)
    if (missingFn && paged.data.length === 0) {
      const legacy = await supabase.rpc('get_listings_for_kommune')
      if (legacy.error) {
        return {
          data: [],
          error: legacy.error,
          fetchError: legacy.error.message || rpcErrorHint,
        }
      }
      const raw = legacy.data
      return {
        data: (Array.isArray(raw) ? raw : raw != null ? [raw] : []) as NavDatabaseListingRow[],
        error: null,
        fetchError: null,
      }
    }
  }
  return paged
}

async function fetchGenericListings(): Promise<{
  data: NavDatabaseListingRow[]
  error: PostgrestError | null
  fetchError: string | null
}> {
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
      return {
        data: acc.length > 0 ? acc : ((result.data || []) as NavDatabaseListingRow[]),
        error: result.error,
        fetchError: null,
      }
    }
    const batch = (result.data || []) as NavDatabaseListingRow[]
    acc.push(...batch)
    if (batch.length === 0 || batch.length < navDbListingsPageSize) {
      return { data: acc, error: null, fetchError: null }
    }
    from += batch.length
    if (from >= navDbListingsMaxRows) {
      if (batch.length === navDbListingsPageSize) {
        logError('[nav/database] listings fetch stopped at row cap', navDbListingsMaxRows)
      }
      return { data: acc, error: null, fetchError: null }
    }
  }

  return { data: acc, error: null, fetchError: null }
}

function applyClientFilters(
  data: NavDatabaseListingRow[],
  params: FetchNavDatabaseListingsParams,
  terminatedIds: Set<string>
): NavDatabaseListingRow[] {
  let filtered = data || []

  if (terminatedIds.size > 0) {
    filtered = filtered.filter((item) => !item.owner_id || !terminatedIds.has(item.owner_id))
  }

  if (params.searchTerm) {
    const q = params.searchTerm.toLowerCase()
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

  const { filters } = params
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

  return filtered
}

async function applyEventFilter(
  filtered: NavDatabaseListingRow[],
  eventFilterId: string
): Promise<NavDatabaseListingRow[]> {
  if (eventFilterId === 'Alle') return filtered

  const { data: eventOptIns } = await supabase
    .from('listing_event_availability')
    .select('listing_id')
    .eq('event_id', eventFilterId)
    .eq('status', 'active')
  const eventListingIds = new Set((eventOptIns ?? []).map((r) => r.listing_id))
  return filtered.filter((item) => eventListingIds.has(item.id))
}

async function fetchAvailabilityMap(
  filtered: NavDatabaseListingRow[]
): Promise<Record<string, ListingAvailabilityRow[]>> {
  const availMap: Record<string, ListingAvailabilityRow[]> = {}
  if (filtered.length === 0) return availMap

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

  return availMap
}

function applyTabStatusFilter(
  filtered: NavDatabaseListingRow[],
  availMap: Record<string, ListingAvailabilityRow[]>,
  params: FetchNavDatabaseListingsParams
): NavDatabaseListingRow[] {
  if (params.viewMode !== 'table' && params.viewMode !== 'list') return filtered

  const todayStatus = (lid: string) => listingAvailabilityStatusToday(lid, availMap)
  if (params.activeTab === 'Tilgjengelig') {
    return filtered.filter((l) => todayStatus(l.id) === 'Tilgjengelig')
  }
  if (params.activeTab === 'Ikke markert') {
    return filtered.filter((l) => todayStatus(l.id) === 'Ikke markert')
  }
  if (params.activeTab === 'Formidlet') {
    return filtered.filter((l) => todayStatus(l.id) === 'Formidla')
  }
  if (params.activeTab === 'Utilgjengelig') {
    return filtered.filter((l) => todayStatus(l.id) === 'Utilgjengelig')
  }
  return filtered
}

function sortListings(
  filtered: NavDatabaseListingRow[],
  sortField: string,
  sortOrder: 'asc' | 'desc'
): NavDatabaseListingRow[] {
  return [...filtered].sort((a, b) => {
    const valA = (a as Record<string, unknown>)[sortField]
    const valB = (b as Record<string, unknown>)[sortField]
    const sa = valA == null ? '' : String(valA)
    const sb = valB == null ? '' : String(valB)
    const cmp = sa.localeCompare(sb, undefined, { numeric: true })
    return sortOrder === 'asc' ? cmp : -cmp
  })
}

export async function fetchNavDatabaseListings(
  params: FetchNavDatabaseListingsParams
): Promise<NavDatabaseListingsFetchResult> {
  const terminatedIds = await fetchTerminatedOwnerIds()

  let data: NavDatabaseListingRow[] = []
  let error: PostgrestError | null = null
  let fetchError: string | null = null

  if (params.isEventPortal && isEventStaffRole(params.userRole ?? undefined)) {
    const result = await fetchListingsFromRpc('get_listings_for_event_staff_paged', params.rpcErrorHint)
    data = result.data
    error = result.error
    fetchError = result.fetchError
  } else if (params.isAuthorized && isKommuneStaffRole(params.userRole ?? undefined)) {
    const result = await fetchKommuneListings(params.rpcErrorHint)
    data = result.data
    error = result.error
    fetchError = result.fetchError
  } else {
    const result = await fetchGenericListings()
    data = result.data
    error = result.error
    fetchError = result.fetchError
  }

  if (error) throw error

  let filtered = applyClientFilters(data, params, terminatedIds)
  filtered = await applyEventFilter(filtered, params.eventFilterId)

  const availMap = await fetchAvailabilityMap(filtered)
  filtered = applyTabStatusFilter(filtered, availMap, params)
  filtered = sortListings(filtered, params.sortField, params.sortOrder)

  return {
    listings: filtered,
    availability: availMap,
    fetchError,
  }
}
