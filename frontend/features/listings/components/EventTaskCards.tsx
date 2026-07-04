'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/app/components/ui/Button'
import { usePublishedEventsQuery } from '@/features/events/hooks/usePublishedEventsQuery'
import '@/features/listings/landlord-manage.css'

type Props = {
  listingIds: string[]
}

/** In-app task card when new published events exist without opt-in (Phase 2.5). */
export default function EventTaskCards({ listingIds }: Props) {
  const { t } = useLanguage()
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({})
  const { data } = usePublishedEventsQuery(listingIds)

  const pending = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const events = (data?.events ?? []).filter((e) => e.end_date >= today)
    const optedIn = new Set(
      (data?.optIns ?? []).filter((r) => r.status === 'active').map((r) => r.event_id)
    )
    return events.filter((e) => !optedIn.has(e.id) && !dismissed[e.id])
  }, [data, dismissed])

  if (listingIds.length === 0 || pending.length === 0) return null

  const targetListingId = listingIds[0]
  const manageHref = targetListingId
    ? `/homeowner/listings/${targetListingId}?section=events`
    : '/homeowner/manage'

  return (
    <div className="hm-event-tasks">
      {pending.map((event) => (
        <div key={event.id} className="card hrt-callout hrt-callout--info hm-event-task-card">
          <div className="hm-event-task-row">
            <Sparkles size={22} className="hm-event-task-icon" aria-hidden />
            <div className="hm-event-task-body">
              <p className="hm-event-task-title">
                {t('eventTaskCardTitle').replace('{name}', event.name)}
              </p>
              <p className="hm-event-task-desc">
                {event.start_date} – {event.end_date}. {t('eventTaskCardBody')}
              </p>
              <div className="hm-event-task-actions">
                <Link href={manageHref} className="hm-event-task-link">
                  <Button type="button" variant="accent">
                    {t('eventTaskCardCta')}
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDismissed((d) => ({ ...d, [event.id]: true }))}
                >
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
