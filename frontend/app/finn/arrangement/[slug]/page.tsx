'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { PageSkeleton } from '@/app/components/design-system'
import { buttonClassName } from '@/app/components/ui/Button'
import EventInquiryForm from '@/features/tourism/components/EventInquiryForm'
import type { FinnListingCard, FinnPublishedEvent } from '@/features/tourism/types/finn'
import { formatFinnNightlyPrice } from '@/features/tourism/types/finn'

export default function FinnEventDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug
  const { t } = useLanguage()
  const [event, setEvent] = useState<FinnPublishedEvent | null>(null)
  const [listings, setListings] = useState<FinnListingCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      const { data: eventRow } = await supabase
        .from('central_events')
        .select(
          'id, slug, name, description_public, start_date, end_date, routing_mode, arrangement_tag'
        )
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()

      if (cancelled) return
      if (!eventRow) {
        setEvent(null)
        setLoading(false)
        return
      }
      setEvent(eventRow as FinnPublishedEvent)

      const { data: optIns } = await supabase
        .from('listing_event_availability')
        .select('listing_id')
        .eq('event_id', eventRow.id)
        .eq('status', 'active')

      const ids = (optIns ?? []).map((r) => r.listing_id)
      if (ids.length > 0) {
        const { data: listingRows } = await supabase
          .from('listings')
          .select('id, address, city, tourism_nightly_price_cents, image_url, type, beds')
          .in('id', ids)
        setListings((listingRows ?? []) as FinnListingCard[])
      } else {
        setListings([])
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) return <PageSkeleton minHeight={280} />

  if (!event) {
    return (
      <div className="finn-empty">
        <p>{t('finnEventNotFound')}</p>
        <Link href="/finn/arrangement" className={buttonClassName('secondary')}>
          {t('finnNavEvents')}
        </Link>
      </div>
    )
  }

  const isTourismRouting = event.routing_mode === 'turisme'

  return (
    <>
      <section className="finn-hero">
        <span className="finn-badge">{isTourismRouting ? t('opsEventRoutingTourism') : t('opsEventRoutingSaksbehandler')}</span>
        <p className="finn-card-meta" style={{ marginTop: 12, marginBottom: 8 }}>
          {event.start_date} – {event.end_date}
          {event.arrangement_tag ? ` · ${event.arrangement_tag}` : ''}
        </p>
        <h1>{event.name}</h1>
        {event.description_public ? <p>{event.description_public}</p> : null}
      </section>

      {listings.length > 0 ? (
        <>
          <h2 className="finn-section-title">
            {t('finnEventListingsTitle').replace('{count}', String(listings.length))}
          </h2>
          <div className="finn-grid" style={{ marginBottom: 'var(--space-8)' }}>
            {listings.map((listing) => {
              const price = formatFinnNightlyPrice(listing.tourism_nightly_price_cents)
              return (
                <Link key={listing.id} href={`/finn/listing/${listing.id}`} className="finn-card">
                  <div className="finn-card-body">
                    <h2>{listing.address}</h2>
                    <p className="finn-card-meta">{listing.city}</p>
                    {price ? (
                      <p className="finn-price">{t('finnFromPrice').replace('{price}', price)}</p>
                    ) : null}
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      ) : (
        <p className="finn-card-meta" style={{ marginBottom: 'var(--space-8)' }}>
          {t('finnEventNoListings')}
        </p>
      )}

      <EventInquiryForm
        eventId={event.id}
        isTourismRouting={isTourismRouting}
        eventStart={event.start_date}
        eventEnd={event.end_date}
      />
    </>
  )
}
