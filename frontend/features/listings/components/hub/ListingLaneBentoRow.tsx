'use client'

import { Building2, CalendarDays, Compass } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'
import {
  listingAvailabilityStatusToday,
  type AvailabilityPeriodRow,
} from '@/app/lib/listingAvailabilityStatusToday'
import type { ListingEventOptInPeriod } from '@/features/listings/types/lanes'

type Props = {
  listingId: string
  city: string
  periods: AvailabilityPeriodRow[]
  eventOptIns: ListingEventOptInPeriod[]
  tourismEnabled: boolean
  showTourism: boolean
  showEvents: boolean
  socialKommuneActive: boolean
}

export default function ListingLaneBentoRow({
  listingId,
  city,
  periods,
  eventOptIns,
  tourismEnabled,
  showTourism,
  showEvents,
  socialKommuneActive,
}: Props) {
  const { t } = useLanguage()
  const todayStatus = listingAvailabilityStatusToday(listingId, { [listingId]: periods })
  const today = new Date().toISOString().slice(0, 10)

  const sosialActive =
    socialKommuneActive &&
    (todayStatus === 'Tilgjengelig' || todayStatus === 'Formidla')
  const turismeActive = tourismEnabled && todayStatus === 'Tilgjengelig'
  const eventActive =
    showEvents &&
    eventOptIns.some(
      (e) =>
        e.status === 'active' &&
        String(e.start_date).slice(0, 10) <= today &&
        String(e.end_date).slice(0, 10) >= today
    )
  const eventCount = eventOptIns.filter((e) => e.status === 'active').length

  const tiles = [
    {
      id: 'sosial',
      label: t('laneSosial'),
      icon: Building2,
      show: true,
      active: sosialActive,
      desc: socialKommuneActive ? t('listingHubLaneSocialActive') : t('listingHubLaneSocialInactive'),
      href: null as string | null,
      accent: 'sosial' as const,
    },
    {
      id: 'turisme',
      label: t('laneTourism'),
      icon: Compass,
      show: showTourism,
      active: turismeActive,
      desc: tourismEnabled ? t('listingHubLaneTourismActive') : t('listingHubLaneTourismInactive'),
      href: `/homeowner/listings/${listingId}?section=tourism`,
      accent: 'turisme' as const,
    },
    {
      id: 'event',
      label: t('laneEvent'),
      icon: CalendarDays,
      show: showEvents,
      active: eventActive,
      desc:
        eventCount > 0
          ? t('listingHubLaneEventCount').replace('{count}', String(eventCount))
          : t('listingHubLaneEventInactive'),
      href: `/homeowner/listings/${listingId}?section=events`,
      accent: 'event' as const,
    },
  ].filter((tile) => tile.show)

  return (
    <div className="listing-hub-bento" aria-label={t('listingHubBentoAria')}>
      {tiles.map(({ id, label, icon: Icon, active, desc, href, accent }) => {
        const inner = (
          <>
            <div className="listing-hub-bento-icon">
              <Icon size={22} aria-hidden />
            </div>
            <div className="listing-hub-bento-body">
              <span className="listing-hub-bento-label">{label}</span>
              <span className="listing-hub-bento-desc">{desc}</span>
            </div>
            <span
              className={`listing-hub-bento-status${active ? ' listing-hub-bento-status--active' : ''}`}
            >
              {active ? t('listingHubLaneOn') : t('listingHubLaneOff')}
            </span>
          </>
        )

        if (href) {
          return (
            <Link
              key={id}
              href={href}
              className={`listing-hub-bento-tile listing-hub-bento-tile--${accent}${active ? ' listing-hub-bento-tile--active' : ''}`}
            >
              {inner}
            </Link>
          )
        }

        return (
          <div
            key={id}
            className={`listing-hub-bento-tile listing-hub-bento-tile--${accent}${active ? ' listing-hub-bento-tile--active' : ''}`}
          >
            {inner}
            {!socialKommuneActive && city ? (
              <span className="listing-hub-bento-note">{city}</span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
