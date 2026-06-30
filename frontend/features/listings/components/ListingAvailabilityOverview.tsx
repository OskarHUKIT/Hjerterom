'use client'

import { Building2, CalendarDays, Palmtree } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import type { ListingEventOptInPeriod } from '@/features/listings/types/lanes'

type PeriodRow = {
  start_date: string
  end_date: string
  status: string
  lane?: string | null
}

type Props = {
  periods: PeriodRow[]
  eventOptIns: ListingEventOptInPeriod[]
  tourismEnabled: boolean
  showTourism: boolean
  showEvents: boolean
}

function hasActiveLaneToday(
  periods: PeriodRow[],
  eventOptIns: ListingEventOptInPeriod[],
  lane: 'sosial' | 'turisme' | 'event'
): boolean {
  const today = new Date().toISOString().slice(0, 10)
  if (lane === 'event') {
    return eventOptIns.some(
      (e) =>
        e.status === 'active' &&
        String(e.start_date).slice(0, 10) <= today &&
        String(e.end_date).slice(0, 10) >= today
    )
  }
  return periods.some((p) => {
    const sd = String(p.start_date).slice(0, 10)
    const ed = String(p.end_date).slice(0, 10)
    if (sd > today || ed < today) return false
    if (p.status !== 'Tilgjengelig' && p.status !== 'Formidla') return false
    if (lane === 'turisme') return p.lane === 'turisme'
    return !p.lane || p.lane === 'sosial'
  })
}

export default function ListingAvailabilityOverview({
  periods,
  eventOptIns,
  tourismEnabled,
  showTourism,
  showEvents,
}: Props) {
  const { t } = useLanguage()
  const sosial = hasActiveLaneToday(periods, eventOptIns, 'sosial')
  const turisme = tourismEnabled && hasActiveLaneToday(periods, eventOptIns, 'turisme')
  const event = showEvents && hasActiveLaneToday(periods, eventOptIns, 'event')

  const chips = [
    { id: 'sosial', label: t('laneSosial'), icon: Building2, active: sosial, show: true },
    {
      id: 'turisme',
      label: t('laneTourism'),
      icon: Palmtree,
      active: turisme,
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
          className={[
            'listing-lane-overview-chip',
            `listing-lane-overview-chip--${id}`,
            active ? 'listing-lane-overview-chip--active' : '',
            muted ? 'listing-lane-overview-chip--muted' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <Icon size={13} aria-hidden />
          <span>{label}</span>
          {active ? <span className="listing-lane-overview-dot" aria-hidden /> : null}
        </span>
      ))}
    </div>
  )
}
