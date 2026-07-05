'use client'

import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { EmptyState, PageSkeleton } from '@/app/components/design-system'
import { EventTravelCard } from '@/features/events/components/EventTravelCard'
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
          'id, slug, name, description_public, start_date, end_date, routing_mode, arrangement_tag, cover_image_url'
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
        <div className="finn-grid finn-event-card-grid">
          {events.map((event) => (
            <EventTravelCard
              key={event.id}
              event={event}
              actionLabel={t('finnEventViewCta')}
              overviewFallback={t('finnEventOverviewFallback')}
            />
          ))}
        </div>
      )}
    </>
  )
}
