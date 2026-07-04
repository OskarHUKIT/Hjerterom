'use client'

import { useLanguage } from '@/context/LanguageContext'

type Props = {
  showTourism?: boolean
  showEvents?: boolean
}

export default function LaneCalendarLegend({ showTourism = true, showEvents = true }: Props) {
  const { t } = useLanguage()

  const items = [
    { className: 'lane-legend-swatch--sosial-available', label: t('calendarLegendLaneSosial') },
    ...(showTourism
      ? [{ className: 'lane-legend-swatch--tourism-available', label: t('calendarLegendLaneTourism') }]
      : []),
    ...(showEvents
      ? [{ className: 'lane-legend-swatch--event', label: t('calendarLegendLaneEvent') }]
      : []),
    { className: 'lane-legend-swatch--unavailable', label: t('calendarLegendUnavailable') },
    { className: 'lane-legend-swatch--mediated', label: t('calendarLegendMediated') },
    { className: 'lane-legend-swatch--conflict', label: t('calendarLegendConflict') },
    { className: 'lane-legend-swatch--selection', label: t('calendarLegendSelection') },
  ]

  return (
    <div className="lane-calendar-legend" aria-label={t('calendarLegendTitle')}>
      <span className="lane-calendar-legend-title">{t('calendarLegendTitle')}</span>
      <ul className="lane-calendar-legend-list">
        {items.map(({ className, label }) => (
          <li key={className}>
            <span className={`lane-legend-swatch ${className}`} aria-hidden />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
