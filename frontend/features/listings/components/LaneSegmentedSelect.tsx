'use client'

import { Building2, CalendarDays, Palmtree } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import type { ListingPaintLane } from '@/features/listings/types/lanes'
import { isPaintLaneEnabled } from '@/features/listings/lib/laneCalendarModel'

type Props = {
  value: ListingPaintLane
  onChange: (lane: ListingPaintLane) => void
  tourismEnabled: boolean
  showTourism: boolean
  showEvents: boolean
  disabled?: boolean
}

const LANE_META: Record<
  ListingPaintLane,
  { icon: typeof Building2; labelKey: 'laneSosial' | 'laneTourism' | 'laneEvent' }
> = {
  sosial: { icon: Building2, labelKey: 'laneSosial' },
  turisme: { icon: Palmtree, labelKey: 'laneTourism' },
  event: { icon: CalendarDays, labelKey: 'laneEvent' },
}

export default function LaneSegmentedSelect({
  value,
  onChange,
  tourismEnabled,
  showTourism,
  showEvents,
  disabled,
}: Props) {
  const { t } = useLanguage()
  const lanes: ListingPaintLane[] = ['sosial', 'turisme', 'event']

  return (
    <div className="lane-segmented" role="group" aria-label={t('lanePaintLabel')}>
      <span className="lane-segmented-label">{t('lanePaintLabel')}</span>
      <div className="lane-segmented-track">
        {lanes.map((lane) => {
          const enabled = isPaintLaneEnabled(lane, { tourismEnabled, showTourism, showEvents })
          const active = value === lane
          const { icon: Icon, labelKey } = LANE_META[lane]
          return (
            <button
              key={lane}
              type="button"
              disabled={disabled || !enabled}
              aria-pressed={active}
              className={`lane-segmented-btn lane-segmented-btn--${lane}${active ? ' lane-segmented-btn--active' : ''}`}
              onClick={() => onChange(lane)}
              title={!enabled ? t('lanePaintDisabledHint') : undefined}
            >
              <Icon size={16} aria-hidden />
              <span>{t(labelKey)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
