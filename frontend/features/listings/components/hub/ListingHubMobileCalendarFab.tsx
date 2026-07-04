'use client'

import { useCallback } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import NativeMorphingButton from '@/app/components/design-system/NativeMorphingButton'
import {
  restOfYearClosedRange,
  summerPresetRange,
} from '@/features/listings/lib/sharedCalendarModel'
import { todayYmdLocal } from '@/app/lib/listingAvailabilityStatusToday'

type Props = {
  onPaintStatusChange: (status: 'Tilgjengelig' | 'Utilgjengelig') => void
  onSelectionChange: (start: string | null, end: string | null) => void
}

function scrollToCalendar() {
  document.getElementById('hub-calendar-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  document.getElementById('shared-avail-title')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

/** Mobile-only hub calendar quick actions (reapollo native-morphing-button). */
export default function ListingHubMobileCalendarFab({
  onPaintStatusChange,
  onSelectionChange,
}: Props) {
  const { t } = useLanguage()
  const year = new Date().getFullYear()

  const markOpen = useCallback(() => {
    onPaintStatusChange('Tilgjengelig')
    scrollToCalendar()
  }, [onPaintStatusChange])

  const markClosed = useCallback(() => {
    onPaintStatusChange('Utilgjengelig')
    scrollToCalendar()
  }, [onPaintStatusChange])

  const applySummerPreset = useCallback(() => {
    const { start, end } = summerPresetRange(year)
    onSelectionChange(start, end)
    scrollToCalendar()
  }, [onSelectionChange, year])

  const applyClosedRestPreset = useCallback(() => {
    const { start, end } = restOfYearClosedRange(todayYmdLocal())
    onSelectionChange(start, end)
    onPaintStatusChange('Utilgjengelig')
    scrollToCalendar()
  }, [onPaintStatusChange, onSelectionChange])

  return (
    <NativeMorphingButton
      className="listing-hub-mobile-fab"
      ariaLabel={t('hubMobileFabAria')}
      closeLabel={t('close')}
      actions={[
        {
          id: 'mark-open',
          label: t('hubMobileFabMarkOpen'),
          tone: 'open',
          onClick: markOpen,
        },
        {
          id: 'mark-closed',
          label: t('hubMobileFabMarkClosed'),
          tone: 'closed',
          onClick: markClosed,
        },
      ]}
      presetGroup={{
        label: t('hubMobileFabPresets'),
        items: [
          {
            id: 'preset-summer',
            label: t('sharedCalendarPresetSummer'),
            onClick: applySummerPreset,
          },
          {
            id: 'preset-closed-rest',
            label: t('sharedCalendarPresetClosedRest'),
            onClick: applyClosedRestPreset,
          },
        ],
      }}
    />
  )
}
