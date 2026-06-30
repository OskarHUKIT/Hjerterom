'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { PageSkeleton } from '@/app/components/design-system'
import { buttonClassName } from '@/app/components/ui/Button'
import BookingRequestForm from '@/features/tourism/components/BookingRequestForm'

type ListingDetail = {
  id: string
  address: string
  city: string
  description: string | null
  tourism_nightly_price_cents: number | null
  image_url: string | null
  type: string | null
  beds: number | null
}

export default function FinnListingDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { t } = useLanguage()
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      const { data } = await supabase
        .from('listings')
        .select(
          'id, address, city, description, tourism_nightly_price_cents, image_url, type, beds, tourism_enabled'
        )
        .eq('id', id)
        .eq('tourism_enabled', true)
        .maybeSingle()

      if (!cancelled) {
        setListing(data as ListingDetail | null)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) return <PageSkeleton minHeight={240} />

  if (!listing) {
    return (
      <div className="finn-empty">
        <p>{t('finnListingNotFound')}</p>
        <Link href="/finn" className={buttonClassName('secondary')}>
          {t('finnNavSearch')}
        </Link>
      </div>
    )
  }

  const price =
    listing.tourism_nightly_price_cents != null
      ? `${Math.round(listing.tourism_nightly_price_cents / 100).toLocaleString('nb-NO')} kr`
      : null

  return (
    <article>
      <Link href="/finn" className="finn-footer-link" style={{ marginBottom: 'var(--space-4)', display: 'inline-flex' }}>
        ← {t('finnBackToSearch')}
      </Link>
      <div className="finn-card" style={{ maxWidth: 720, marginBottom: 'var(--space-8)' }}>
        {listing.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.image_url}
            alt=""
            style={{ width: '100%', maxHeight: 360, objectFit: 'cover' }}
          />
        ) : (
          <div className="finn-card-image">{t('finnNoPhoto')}</div>
        )}
        <div className="finn-card-body" style={{ padding: 'var(--space-6)' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.5rem' }}>{listing.address}</h1>
          <p className="finn-card-meta">
            {listing.city}
            {listing.type ? ` · ${listing.type}` : ''}
            {listing.beds ? ` · ${listing.beds} ${t('finnBeds')}` : ''}
          </p>
          {price ? (
            <p className="finn-price" style={{ fontSize: '1.25rem', margin: 'var(--space-4) 0' }}>
              {t('finnFromPrice').replace('{price}', price)} / {t('finnPerNight')}
            </p>
          ) : null}
          {listing.description ? (
            <p style={{ lineHeight: 1.6, margin: 'var(--space-4) 0 0', color: 'var(--finn-text-secondary)' }}>
              {listing.description}
            </p>
          ) : null}
        </div>
      </div>

      <BookingRequestForm
        listingId={listing.id}
        nightlyPriceCents={listing.tourism_nightly_price_cents}
        listingAddress={`${listing.address}, ${listing.city}`}
      />
    </article>
  )
}
