'use client'

import { Building2, Palmtree } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import type { ListingLane } from '../types/lanes'
import { LISTING_LANES } from '../types/lanes'

type Props = {
  value: ListingLane
  onChange: (lane: ListingLane) => void
  id?: string
  disabled?: boolean
}

const LANE_ICONS = { sosial: Building2, turisme: Palmtree } as const

export default function AvailabilityLaneSelect({ value, onChange, id, disabled }: Props) {
  const { t } = useLanguage()

  return (
    <div className="lane-segmented" role="group" aria-labelledby={id}>
      <span className="lane-segmented-label" id={id}>
        {t('laneLabel')}
      </span>
      <div className="lane-segmented-track">
        {LISTING_LANES.map((lane) => {
          const Icon = LANE_ICONS[lane]
          const active = value === lane
          return (
            <button
              key={lane}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              className={`lane-segmented-btn lane-segmented-btn--${lane}${active ? ' lane-segmented-btn--active' : ''}`}
              onClick={() => onChange(lane)}
            >
              <Icon size={16} aria-hidden />
              <span>{lane === 'sosial' ? t('laneSosial') : t('laneTourism')}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
