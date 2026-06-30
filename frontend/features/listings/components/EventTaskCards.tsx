'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/app/components/ui/Button'

type PublishedEvent = {
  id: string
  name: string
  start_date: string
  end_date: string
}

type OptInMap = Record<string, boolean>

type Props = {
  listingIds: string[]
}

/** In-app task card when new published events exist without opt-in (Phase 2.5). */
export default function EventTaskCards({ listingIds }: Props) {
  const { t } = useLanguage()
  const [events, setEvents] = useState<PublishedEvent[]>([])
  const [optIns, setOptIns] = useState<OptInMap>({})
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (listingIds.length === 0) return
    let cancelled = false
    void (async () => {
      const [{ data: published }, { data: mine }] = await Promise.all([
        supabase
          .from('central_events')
          .select('id, name, start_date, end_date')
          .eq('status', 'published')
          .gte('end_date', new Date().toISOString().slice(0, 10))
          .order('start_date', { ascending: true }),
        supabase
          .from('listing_event_availability')
          .select('event_id, listing_id, status')
          .in('listing_id', listingIds)
          .eq('status', 'active'),
      ])
      if (cancelled) return
      setEvents((published ?? []) as PublishedEvent[])
      const map: OptInMap = {}
      ;(mine ?? []).forEach((r) => {
        map[r.event_id] = true
      })
      setOptIns(map)
    })()
    return () => {
      cancelled = true
    }
  }, [listingIds.join(',')])

  const pending = events.filter((e) => !optIns[e.id] && !dismissed[e.id])
  if (pending.length === 0) return null

  const targetListingId = listingIds[0]
  const manageHref = targetListingId
    ? `/homeowner/manage?listing=${targetListingId}&panel=events`
    : '/homeowner/manage'

  return (
    <div style={{ display: 'grid', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
      {pending.map((event) => (
        <div
          key={event.id}
          className="card"
          style={{
            padding: 'var(--space-5)',
            borderLeft: '4px solid var(--color-royal-blue)',
            background: 'rgba(59, 130, 246, 0.06)',
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Sparkles size={22} style={{ color: 'var(--color-royal-blue)', flexShrink: 0, marginTop: 2 }} aria-hidden />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>
                {t('eventTaskCardTitle').replace('{name}', event.name)}
              </p>
              <p style={{ margin: '6px 0 12px', fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: 1.5 }}>
                {event.start_date} – {event.end_date}. {t('eventTaskCardBody')}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href={manageHref} style={{ textDecoration: 'none' }}>
                  <Button type="button" variant="accent">
                    {t('eventTaskCardCta')}
                  </Button>
                </Link>
                <Button type="button" variant="ghost" onClick={() => setDismissed((d) => ({ ...d, [event.id]: true }))}>
                  {t('eventTaskCardDismiss')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
