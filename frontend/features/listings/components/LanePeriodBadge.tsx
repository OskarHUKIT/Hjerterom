'use client'

import { useLanguage } from '@/context/LanguageContext'
import type { ListingLane } from '@/features/listings/types/lanes'

type Props = {
  lane?: string | null
  status: string
  compact?: boolean
}

export default function LanePeriodBadge({ lane, status, compact }: Props) {
  const { t } = useLanguage()
  const resolvedLane: ListingLane | 'formidla' =
    status === 'Formidla' ? 'formidla' : lane === 'turisme' ? 'turisme' : 'sosial'

  const statusLabel =
    status === 'Formidla'
      ? t('formidlet')
      : status === 'Utilgjengelig'
        ? t('unavailable')
        : t('available')

  const laneLabel =
    resolvedLane === 'formidla'
      ? t('laneSosial')
      : resolvedLane === 'turisme'
        ? t('laneTourism')
        : t('laneSosial')

  const statusModifier =
    status === 'Utilgjengelig' ? 'unavailable' : status === 'Formidla' ? 'mediated' : 'available'

  return (
    <span
      className={`lane-period-badge lane-period-badge--${resolvedLane} lane-period-badge--${statusModifier}${compact ? ' lane-period-badge--compact' : ''}`}
    >
      <span className="lane-period-badge-lane">{laneLabel}</span>
      <span className="lane-period-badge-sep" aria-hidden>
        ·
      </span>
      <span className="lane-period-badge-status">{statusLabel}</span>
    </span>
  )
}
