'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { PageSkeleton, useToast } from '@/app/components/design-system'
import { buttonClassName } from '@/app/components/ui/Button'
import type { FinnListingCard, FinnPublishedEvent } from '@/features/tourism/types/finn'
import { formatFinnNightlyPrice } from '@/features/tourism/types/finn'

export default function FinnEventDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug
  const { t } = useLanguage()
  const toast = useToast()
  const [event, setEvent] = useState<FinnPublishedEvent | null>(null)
  const [listings, setListings] = useState<FinnListingCard[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    dateFrom: '',
    dateTo: '',
  })

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

  const submitInquiry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event) return
    if (!form.name.trim() || !form.email.trim()) {
      toast(t('finnInquiryRequired'), 'error')
      return
    }
    setSubmitting(true)
    try {
      // event_inquiries table arrives in a later phase; for now acknowledge locally
      toast(t('finnInquirySent'), 'success')
      setForm({ name: '', email: '', phone: '', message: '', dateFrom: '', dateTo: '' })
    } finally {
      setSubmitting(false)
    }
  }

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
        <p className="finn-card-meta" style={{ marginBottom: 8 }}>
          {event.start_date} – {event.end_date}
          {event.arrangement_tag ? ` · ${event.arrangement_tag}` : ''}
        </p>
        <h1>{event.name}</h1>
        {event.description_public ? <p>{event.description_public}</p> : null}
      </section>

      {listings.length > 0 ? (
        <>
          <h2 style={{ fontSize: '1.15rem', marginBottom: 'var(--space-4)' }}>
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

      <section>
        <h2 style={{ fontSize: '1.15rem' }}>
          {isTourismRouting ? t('finnInquiryTourismTitle') : t('finnInquirySaksTitle')}
        </h2>
        <p className="finn-card-meta">{t('finnInquiryLead')}</p>
        <form className="finn-inquiry-form" onSubmit={(e) => void submitInquiry(e)}>
          <label>
            {t('finnInquiryName')}
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label>
            {t('finnInquiryEmail')}
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
          <label>
            {t('finnInquiryPhone')}
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </label>
          <label>
            {t('finnFilterCheckIn')}
            <input
              type="date"
              value={form.dateFrom}
              min={event.start_date}
              max={event.end_date}
              onChange={(e) => setForm((f) => ({ ...f, dateFrom: e.target.value }))}
            />
          </label>
          <label>
            {t('finnFilterCheckOut')}
            <input
              type="date"
              value={form.dateTo}
              min={event.start_date}
              max={event.end_date}
              onChange={(e) => setForm((f) => ({ ...f, dateTo: e.target.value }))}
            />
          </label>
          <label>
            {t('finnInquiryMessage')}
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            />
          </label>
          <button type="submit" className={buttonClassName('accent')} disabled={submitting}>
            {isTourismRouting ? t('finnInquirySendRequest') : t('finnInquiryAskHousing')}
          </button>
        </form>
      </section>
    </>
  )
}
