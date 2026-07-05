'use client'

import { useRouter } from 'next/navigation'
import { Briefcase, CalendarDays, Mountain, Tent, Trophy } from 'lucide-react'
import { TravelCard } from '@/components/ui/card-7'
import type { FinnPublishedEvent } from '@/features/tourism/types/finn'

const EVENT_ICON_BY_TAG: Record<string, typeof Mountain> = {
  Skifestival: Mountain,
  Entreprise: Briefcase,
}

function eventCoverUrl(event: FinnPublishedEvent): string {
  if (event.cover_image_url?.trim()) return event.cover_image_url.trim()
  return `/event-covers/${event.slug}.png`
}

function eventLogo(event: FinnPublishedEvent) {
  if (event.arrangement_tag && EVENT_ICON_BY_TAG[event.arrangement_tag]) {
    const Icon = EVENT_ICON_BY_TAG[event.arrangement_tag]
    return <Icon className="h-6 w-6 text-white/80" aria-hidden />
  }
  if (event.routing_mode === 'turisme') {
    return <Trophy className="h-6 w-6 text-white/80" aria-hidden />
  }
  return <CalendarDays className="h-6 w-6 text-white/80" aria-hidden />
}

function formatEventDates(start: string, end: string): string {
  return `${start} – ${end}`
}

export type EventTravelCardProps = {
  event: FinnPublishedEvent
  actionLabel: string
  overviewFallback: string
  className?: string
}

export function EventTravelCard({
  event,
  actionLabel,
  overviewFallback,
  className,
}: EventTravelCardProps) {
  const router = useRouter()

  return (
    <TravelCard
      className={className}
      imageUrl={eventCoverUrl(event)}
      imageAlt={event.name}
      logo={eventLogo(event)}
      title={event.name}
      location={[
        formatEventDates(event.start_date, event.end_date),
        event.arrangement_tag,
      ]
        .filter(Boolean)
        .join(' · ')}
      overview={event.description_public?.trim() || overviewFallback}
      actionLabel={actionLabel}
      onAction={() => router.push(`/finn/arrangement/${event.slug}`)}
      aria-label={event.name}
    />
  )
}
