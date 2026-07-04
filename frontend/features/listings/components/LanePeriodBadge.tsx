'use client'

import { useLanguage } from '@/context/LanguageContext'

type Props = {
  lane?: string | null
  status: string
  compact?: boolean
}

export default function LanePeriodBadge({ lane, status, compact }: Props) {
  const { t } = useLanguage()
  const isShared = lane === 'shared' || status === 'Tilgjengelig' || status === 'Utilgjengelig'
  const resolvedLane =
    status === 'Formidla' ? 'formidla' : lane === 'turisme' ? 'turisme' : isShared ? 'shared' : 'sosial'

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
        : resolvedLane === 'shared'
          ? t('sharedPeriodBadge')
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
