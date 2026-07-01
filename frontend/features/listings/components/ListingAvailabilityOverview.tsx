'use client'

import { Building2, CalendarDays, Palmtree } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import {
  listingAvailabilityStatusToday,
  type AvailabilityPeriodRow,
} from '@/app/lib/listingAvailabilityStatusToday'
import type { ListingEventOptInPeriod } from '@/features/listings/types/lanes'

type PeriodRow = AvailabilityPeriodRow & { id?: string }

type Props = {
  listingId: string
  periods: PeriodRow[]
  eventOptIns: ListingEventOptInPeriod[]
  tourismEnabled: boolean
  showTourism: boolean
  showEvents: boolean
}

export default function ListingAvailabilityOverview({
  listingId,
  periods,
  eventOptIns,
  tourismEnabled,
  showTourism,
  showEvents,
}: Props) {
  const { t } = useLanguage()
  const todayStatus = listingAvailabilityStatusToday(listingId, { [listingId]: periods })
  const today = new Date().toISOString().slice(0, 10)

  const sosialOpen =
    todayStatus === 'Tilgjengelig' || todayStatus === 'Formidla'
  const turismeOpen = tourismEnabled && todayStatus === 'Tilgjengelig'
  const event = showEvents && eventOptIns.some(
    (e) =>
      e.status === 'active' &&
      String(e.start_date).slice(0, 10) <= today &&
      String(e.end_date).slice(0, 10) >= today
  )

  const chips = [
    { id: 'sosial', label: t('laneSosial'), icon: Building2, active: sosialOpen, show: true },
    {
      id: 'turisme',
      label: t('laneTourism'),
      icon: Palmtree,
      active: turismeOpen,
      show: showTourism,
      muted: showTourism && !tourismEnabled,
    },
    {
      id: 'event',
      label: t('laneEvent'),
      icon: CalendarDays,
      active: event,
      show: showEvents,
    },
  ].filter((c) => c.show)

  return (
    <div className="listing-lane-overview" aria-label={t('laneOverviewAria')}>
      {chips.map(({ id, label, icon: Icon, active, muted }) => (
        <span
          key={id}
          className={`listing-lane-chip${active ? ' listing-lane-chip--active' : ''}${muted ? ' listing-lane-chip--muted' : ''}`}
        >
          <Icon size={14} aria-hidden />
          {label}
        </span>
      ))}
      {todayStatus === 'Ikke markert' ? (
        <span className="listing-lane-chip listing-lane-chip--unmarked">{t('availabilityUnmarked')}</span>
      ) : null}
    </div>
  )
}
