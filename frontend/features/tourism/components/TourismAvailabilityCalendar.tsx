'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'

type Period = { start_date: string; end_date: string; status: string }

type Props = {
  listingId: string
  checkIn: string
  checkOut: string
  onDatesBlocked?: (blocked: boolean) => void
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd
}

export default function TourismAvailabilityCalendar({
  listingId,
  checkIn,
  checkOut,
  onDatesBlocked,
}: Props) {
  const { t } = useLanguage()
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const { data } = await supabase.rpc('get_tourism_availability', { p_listing_id: listingId })
      setPeriods((data ?? []) as Period[])
      setLoading(false)
    })()
  }, [listingId])

  const hasSelection = checkIn && checkOut && checkOut >= checkIn
  const selectionOk =
    !hasSelection ||
    periods.some(
      (p) =>
        p.status === 'Tilgjengelig' &&
        rangesOverlap(checkIn, checkOut, p.start_date, p.end_date)
    )

  useEffect(() => {
    onDatesBlocked?.(hasSelection ? !selectionOk : false)
  }, [hasSelection, selectionOk, onDatesBlocked])

  if (loading) {
    return <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>{t('loadingPleaseWait')}</p>
  }

  if (periods.length === 0) {
    return (
      <p style={{ fontSize: '0.85rem', opacity: 0.65, margin: '0 0 12px' }}>{t('finnNoAvailabilityYet')}</p>
    )
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '0.9rem' }}>{t('finnAvailabilityTitle')}</p>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {periods.map((p, i) => (
          <li
            key={`${p.start_date}-${i}`}
            style={{
              fontSize: '0.85rem',
              padding: '6px 10px',
              borderRadius: 8,
              background:
                p.status === 'Tilgjengelig'
                  ? 'rgba(20, 184, 166, 0.12)'
                  : 'rgba(239, 68, 68, 0.08)',
            }}
          >
            {p.start_date} – {p.end_date} · {p.status}
          </li>
        ))}
      </ul>
      {hasSelection && !selectionOk ? (
        <p style={{ color: 'var(--color-danger, #dc2626)', fontSize: '0.85rem', marginTop: 8 }}>
          {t('finnDatesNotAvailable')}
        </p>
      ) : null}
    </div>
  )
}
