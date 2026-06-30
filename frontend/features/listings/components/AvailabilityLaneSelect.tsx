'use client'

import { useLanguage } from '@/context/LanguageContext'
import type { ListingLane } from '../types/lanes'
import { LISTING_LANES } from '../types/lanes'

type Props = {
  value: ListingLane
  onChange: (lane: ListingLane) => void
  id?: string
  disabled?: boolean
}

export default function AvailabilityLaneSelect({ value, onChange, id, disabled }: Props) {
  const { t } = useLanguage()

  return (
    <div>
      <label className="label" htmlFor={id}>
        {t('laneLabel')}
      </label>
      <select
        id={id}
        className="input"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as ListingLane)}
      >
        {LISTING_LANES.map((lane) => (
          <option key={lane} value={lane}>
            {lane === 'sosial' ? t('laneSosial') : t('laneTourism')}
          </option>
        ))}
      </select>
    </div>
  )
}
