'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { MapPin, Search } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { EmptyState, PageSkeleton } from '@/app/components/design-system'
import { buttonClassName } from '@/app/components/ui/Button'
import type { FinnListingCard, FinnSearchFilters } from '@/features/tourism/types/finn'
import { formatFinnNightlyPrice } from '@/features/tourism/types/finn'

export default function FinnSearchPage() {
  const { t } = useLanguage()
  const [listings, setListings] = useState<FinnListingCard[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FinnSearchFilters>({
    city: '',
    checkIn: '',
    checkOut: '',
  })
  const [applied, setApplied] = useState<FinnSearchFilters>({})

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      let query = supabase
        .from('listings')
        .select('id, address, city, tourism_nightly_price_cents, image_url, type, beds')
        .eq('tourism_enabled', true)
        .order('city', { ascending: true })

      if (applied.city?.trim()) {
        query = query.ilike('city', `%${applied.city.trim()}%`)
      }

      const { data, error } = await query.limit(60)

      if (!cancelled) {
        if (!error) setListings((data ?? []) as FinnListingCard[])
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [applied])

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
      <section className="finn-hero">
        <h1>{t('finnHeroTitle')}</h1>
        <p>{subtitle}</p>
      </section>

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
        <label>
          {t('finnFilterCheckIn')}
          <input
            type="date"
            value={filters.checkIn ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, checkIn: e.target.value }))}
          />
        </label>
        <label>
          {t('finnFilterCheckOut')}
          <input
            type="date"
            value={filters.checkOut ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, checkOut: e.target.value }))}
          />
        </label>
        <button type="submit" className={buttonClassName('accent')} style={{ alignSelf: 'flex-end' }}>
          <Search size={18} aria-hidden /> {t('finnSearchCta')}
        </button>
      </form>

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
            {listings.map((listing) => {
              const price = formatFinnNightlyPrice(listing.tourism_nightly_price_cents)
              return (
                <Link key={listing.id} href={`/finn/listing/${listing.id}`} className="finn-card">
                  <div className="finn-card-image">
                    {listing.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.image_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      t('finnNoPhoto')
                    )}
                  </div>
                  <div className="finn-card-body">
                    <h2>{listing.address}</h2>
                    <p className="finn-card-meta">
                      {listing.city}
                      {listing.type ? ` · ${listing.type}` : ''}
                      {listing.beds ? ` · ${listing.beds} ${t('finnBeds')}` : ''}
                    </p>
                    {price ? (
                      <p className="finn-price">
                        {t('finnFromPrice').replace('{price}', price)}
                      </p>
                    ) : null}
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
