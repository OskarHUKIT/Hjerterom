'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { Map, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { EmptyState, PageSkeleton } from '@/app/components/design-system'
import { QK } from '@/app/lib/queries/queryKeys'
import FinnTourismMap from '@/features/tourism/components/FinnTourismMap'
import type { FinnListingCard, FinnSearchFilters } from '@/features/tourism/types/finn'
import FinnSearchSheet from './FinnSearchSheet'
import FinnTourismListingCard from './FinnTourismListingCard'

const WISHLIST_KEY = 'hjerterum-finn-wishlist'

type SearchState = FinnSearchFilters & { guests?: number }

const FILTER_PRESETS = [
  { id: 'all', city: '' },
  { id: 'tromso', city: 'Tromsø' },
  { id: 'kvaloya', city: 'Kvaløya' },
  { id: 'sommaroy', city: 'Sommarøy' },
  { id: 'lyngen', city: 'Lyngen' },
] as const

function finnListingsQueryKey(filters: FinnSearchFilters) {
  return [...QK.finnListings, filters] as const
}

async function fetchTourismListings(applied: FinnSearchFilters): Promise<FinnListingCard[]> {
  const { data, error } = await supabase.rpc('search_tourism_listings', {
    p_city: applied.city?.trim() || null,
    p_check_in: applied.checkIn || null,
    p_check_out: applied.checkOut || null,
    p_limit: 60,
  })

  if (!error && Array.isArray(data)) {
    return data as FinnListingCard[]
  }

  let query = supabase
    .from('listings')
    .select('id, address, city, tourism_nightly_price_cents, image_url, type, beds')
    .eq('tourism_enabled', true)
    .order('city', { ascending: true })
  if (applied.city?.trim()) {
    query = query.ilike('city', `%${applied.city.trim()}%`)
  }
  const fallback = await query.limit(60)
  if (!fallback.error) return (fallback.data ?? []) as FinnListingCard[]
  return []
}

function formatSearchMeta(
  filters: SearchState,
  t: (key: Parameters<ReturnType<typeof useLanguage>['t']>[0]) => string
): string {
  const city = filters.city?.trim() || t('finnSearchAnywhere')
  const dates =
    filters.checkIn && filters.checkOut
      ? `${filters.checkIn} – ${filters.checkOut}`
      : t('finnSearchAnyDates')
  const guests = String(filters.guests ?? 2)
  return `${city} · ${dates} · ${guests} ${t('finnSearchGuestsShort')}`
}

export default function FinnSearchMobile() {
  const { t } = useLanguage()
  const [filters, setFilters] = useState<SearchState>({ city: 'Tromsø', guests: 2 })
  const [applied, setApplied] = useState<SearchState>({ city: 'Tromsø', guests: 2 })
  const [mapOpen, setMapOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activePreset, setActivePreset] = useState<string>('tromso')
  const [wishlist, setWishlist] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WISHLIST_KEY)
      if (raw) setWishlist(new Set(JSON.parse(raw) as string[]))
    } catch {
      /* ignore */
    }
  }, [])

  const toggleWishlist = useCallback((id: string) => {
    setWishlist((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem(WISHLIST_KEY, JSON.stringify([...next]))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const { data: listings = [], isPending: loading, isError } = useQuery({
    queryKey: finnListingsQueryKey(applied),
    queryFn: () => fetchTourismListings(applied),
    staleTime: 30_000,
  })

  const resultCount = listings.length
  const cityLabel = applied.city?.trim() || t('finnSearchDefaultRegion')

  const filterLabels = useMemo(
    () => ({
      all: t('finnFilterAll'),
      tromso: t('finnFilterCityCentre'),
      kvaloya: t('finnFilterFjord'),
      sommaroy: t('finnFilterArctic'),
      lyngen: t('finnFilterAurora'),
    }),
    [t]
  )

  const applyPreset = (id: (typeof FILTER_PRESETS)[number]['id']) => {
    setActivePreset(id)
    const preset = FILTER_PRESETS.find((p) => p.id === id)
    if (!preset) return
    const next = { ...filters, city: preset.city }
    setFilters(next)
    setApplied(next)
  }

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ padding: '0 0 8px' }}>
        <div className="finn-search-card">
          <button
            type="button"
            className="finn-search-trigger"
            onClick={() => setSheetOpen(true)}
            aria-expanded={sheetOpen}
          >
            <Search size={18} style={{ color: 'var(--finn-text-muted)', flexShrink: 0 }} aria-hidden />
            <span style={{ flex: 1, minWidth: 0 }}>
              <p className="finn-search-trigger__title">{t('finnSearchWhereTo')}</p>
              <p className="finn-search-trigger__meta">{formatSearchMeta(applied, t)}</p>
            </span>
            <span className="finn-search-trigger__action" aria-hidden>
              <Search size={16} strokeWidth={2.5} />
            </span>
          </button>
        </div>
      </div>

      <div className="finn-filter-scroll" style={{ padding: '4px 0 12px' }}>
        <div className="finn-filter-row">
          {FILTER_PRESETS.map(({ id }) => (
            <button
              key={id}
              type="button"
              className={`finn-filter-chip${activePreset === id ? ' finn-filter-chip--active' : ''}`}
              onClick={() => applyPreset(id)}
            >
              {filterLabels[id]}
            </button>
          ))}
        </div>
      </div>

      <div className="finn-results-bar" style={{ padding: '4px 0 8px' }}>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--finn-text-secondary)' }}>
          <strong style={{ color: 'var(--finn-text)' }}>{resultCount}</strong>{' '}
          {t('finnResultsInCityInline').replace('{city}', cityLabel)}
        </p>
        <button
          type="button"
          className="finn-map-toggle-btn"
          onClick={() => setMapOpen((v) => !v)}
          aria-expanded={mapOpen}
        >
          <Map size={14} aria-hidden />
          {mapOpen ? t('finnMapHide') : t('finnMapShow')}
        </button>
      </div>

      <div className={`finn-map-panel finn-map-panel--mobile${mapOpen ? '' : ' finn-map-panel--collapsed'}`}>
        <FinnTourismMap city={applied.city?.trim() || undefined} />
      </div>

      {loading ? (
        <PageSkeleton minHeight={240} />
      ) : isError ? (
        <EmptyState title={t('finnSearchErrorTitle')} description={t('finnSearchErrorDesc')} />
      ) : resultCount === 0 ? (
        <EmptyState title={t('finnEmptyTitle')} description={t('finnEmptyDesc')} />
      ) : (
        <div className="finn-listing-stack">
          {listings.map((listing, i) => (
            <FinnTourismListingCard
              key={listing.id}
              listing={listing}
              href={`/finn/listing/${listing.id}`}
              staggerClass={`finn-stagger-${Math.min(i + 1, 4)}`}
              wishlisted={wishlist.has(listing.id)}
              onToggleWishlist={toggleWishlist}
            />
          ))}
        </div>
      )}

      <FinnSearchSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        onChange={setFilters}
        onApply={() => {
          setApplied({ ...filters })
          const preset = FILTER_PRESETS.find((p) => p.city === (filters.city?.trim() ?? ''))
          setActivePreset(preset?.id ?? 'all')
        }}
        resultCount={resultCount}
      />
    </div>
  )
}
