'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { EmptyState, PageSkeleton } from '@/app/components/design-system'
import type { FinnPublishedEvent } from '@/features/tourism/types/finn'

export default function FinnEventsIndexPage() {
  const { t } = useLanguage()
  const [events, setEvents] = useState<FinnPublishedEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('central_events')
        .select(
          'id, slug, name, description_public, start_date, end_date, routing_mode, arrangement_tag'
        )
        .eq('status', 'published')
        .order('start_date', { ascending: true })

      if (!cancelled) {
        if (!error) setEvents((data ?? []) as FinnPublishedEvent[])
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <section className="finn-hero">
        <h1>{t('finnEventsTitle')}</h1>
        <p>{t('finnEventsLead')}</p>
      </section>

      {loading ? (
        <PageSkeleton minHeight={200} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={28} aria-hidden />}
          title={t('finnEventsEmptyTitle')}
          description={t('finnEventsEmptyDesc')}
        />
      ) : (
        <ul className="finn-event-list">
          {events.map((event) => (
            <li key={event.id}>
              <Link href={`/finn/arrangement/${event.slug}`} className="finn-event-item">
                <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem' }}>{event.name}</h2>
                {event.description_public ? (
                  <p style={{ margin: '0 0 12px', color: '#64748b', lineHeight: 1.5 }}>
                    {event.description_public}
                  </p>
                ) : null}
                <p className="finn-card-meta" style={{ margin: 0 }}>
                  {event.start_date} – {event.end_date}
                  {event.arrangement_tag ? ` · ${event.arrangement_tag}` : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
