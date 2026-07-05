'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { MapPin, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { EmptyState, PageHero, PageSkeleton, PropertyCard, RangeDatePicker } from '@/app/components/design-system'
import { OptimizedPublicStorageImage } from '@/app/components/OptimizedPublicStorageImage'
import { ListingCoverPlaceholder } from '@/features/listings/components/ListingPhotoManager'
import '@/features/listings/listing-photo-manager.css'
import { QK } from '@/app/lib/queries/queryKeys'
import FinnTourismMap from '@/features/tourism/components/FinnTourismMap'
import { buttonClassName } from '@/app/components/ui/Button'
import type { FinnListingCard, FinnSearchFilters } from '@/features/tourism/types/finn'
import { formatFinnNightlyPrice } from '@/features/tourism/types/finn'

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

export default function FinnSearchDesktop() {
  const { t } = useLanguage()
  const [filters, setFilters] = useState<FinnSearchFilters>({
    city: '',
    checkIn: '',
    checkOut: '',
  })
  const [applied, setApplied] = useState<FinnSearchFilters>({})
  const [mapOpen, setMapOpen] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)')
    const sync = () => setMapOpen(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const { data: listings = [], isPending: loading } = useQuery({
    queryKey: finnListingsQueryKey(applied),
    queryFn: () => fetchTourismListings(applied),
    staleTime: 30_000,
  })

  const resultCount = listings.length

  const subtitle = useMemo(() => {
    if (applied.city?.trim()) {
      return t('finnResultsInCity').replace('{city}', applied.city.trim())
    }
    return t('finnSearchLead')
  }, [applied.city, t])

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setApplied({ ...filters })
  }

  return (
    <>
      <PageHero title={t('finnHeroTitle')} lead={subtitle} />

      <form className="finn-search-bar" onSubmit={onSearch}>
        <label>
          {t('finnFilterCity')}
          <input
            type="text"
            value={filters.city ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
            placeholder={t('finnFilterCityPlaceholder')}
            autoComplete="address-level2"
          />
        </label>
        <label style={{ gridColumn: 'span 2' }}>
          {t('finnFilterCheckIn')} / {t('finnFilterCheckOut')}
          <RangeDatePicker
            checkIn={filters.checkIn ?? ''}
            checkOut={filters.checkOut ?? ''}
            onChange={({ checkIn, checkOut }) => setFilters((f) => ({ ...f, checkIn, checkOut }))}
            checkInLabel={t('finnFilterCheckIn')}
            checkOutLabel={t('finnFilterCheckOut')}
            placeholder={t('finnDateRangePlaceholder')}
          />
        </label>
        <button type="submit" className={buttonClassName('accent')} style={{ alignSelf: 'flex-end' }}>
          <Search size={18} aria-hidden /> {t('finnSearchCta')}
        </button>
      </form>

      <button
        type="button"
        className="button finn-map-toggle"
        onClick={() => setMapOpen((v) => !v)}
        aria-expanded={mapOpen}
      >
        {mapOpen ? t('finnMapHide') : t('finnMapShow')}
      </button>

      <div className={`finn-map-panel${mapOpen ? '' : ' finn-map-panel--collapsed'}`}>
        <FinnTourismMap city={applied.city?.trim() || undefined} />
      </div>

      {loading ? (
        <PageSkeleton minHeight={240} />
      ) : resultCount === 0 ? (
        <EmptyState
          icon={<MapPin size={28} aria-hidden />}
          title={t('finnEmptyTitle')}
          description={t('finnEmptyDesc')}
          action={
            <Link href="/finn/arrangement" className={buttonClassName('secondary')}>
              {t('finnNavEvents')}
            </Link>
          }
        />
      ) : (
        <>
          <p className="finn-card-meta" style={{ marginBottom: 'var(--space-4)' }}>
            {t('finnResultCount').replace('{count}', String(resultCount))}
          </p>
          <div className="finn-grid">
            {listings.map((listing) => (
              <PropertyCard
                key={listing.id}
                href={`/finn/listing/${listing.id}`}
                title={listing.address}
                meta={`${listing.city}${listing.beds ? ` · ${listing.beds} ${t('finnBeds')}` : ''}`}
                priceLabel={
                  listing.tourism_nightly_price_cents
                    ? t('finnFromPrice').replace(
                        '{price}',
                        formatFinnNightlyPrice(listing.tourism_nightly_price_cents) ?? ''
                      )
                    : undefined
                }
                image={
                  listing.image_url ? (
                    <OptimizedPublicStorageImage
                      variant="fill"
                      src={listing.image_url}
                      alt={listing.address}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
                      className="ds-property-card__thumb-img"
                    />
                  ) : (
                    <ListingCoverPlaceholder label={t('finnNoPhoto')} />
                  )
                }
              />
            ))}
          </div>
        </>
      )}
    </>
  )
}
