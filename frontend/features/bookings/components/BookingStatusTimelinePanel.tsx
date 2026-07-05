'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { StatusTimeline } from '@/components/shared/status-timeline'
import { Button } from '@/components/ui/button'
import {
  buildBookingStatusTimelineSteps,
  bookingTimelineTimestampsFromRow,
} from '@/features/bookings/lib/buildBookingStatusTimelineSteps'

type BookingStatusRow = {
  status: string
  created_at: string | null
  updated_at: string | null
}

async function fetchBookingStatusRow(bookingId: string): Promise<BookingStatusRow> {
  const { data, error } = await supabase
    .from('bookings')
    .select('status, created_at, updated_at')
    .eq('id', bookingId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('booking_not_found')

  return data as BookingStatusRow
}

type Props = {
  bookingId: string
  className?: string
}

/** Landlord/guest booking detail timeline with explicit load error + retry. */
export default function BookingStatusTimelinePanel({ bookingId, className }: Props) {
  const { t } = useLanguage()

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['booking', 'status-timeline', bookingId],
    queryFn: () => fetchBookingStatusRow(bookingId),
    staleTime: 30_000,
  })

  if (isPending) {
    return (
      <div
        className={className}
        aria-hidden
        style={{ minHeight: 56, borderRadius: 8, background: 'var(--bg-subtle)' }}
      />
    )
  }

  if (isError || !data) {
    return (
      <div
        className={className}
        role="alert"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          padding: 'var(--space-3)',
          borderRadius: 8,
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
          <AlertCircle size={18} style={{ color: 'var(--color-danger, #f87171)', flexShrink: 0 }} aria-hidden />
          <p style={{ margin: 0, lineHeight: 1.5, color: 'var(--text-body)', fontSize: '0.875rem' }}>
            {t('finnMineBookingsLoadError')}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
          {t('retryLoad')}
        </Button>
      </div>
    )
  }

  const steps = buildBookingStatusTimelineSteps(
    data.status,
    t,
    bookingTimelineTimestampsFromRow(data)
  )

  return (
    <StatusTimeline
      steps={steps}
      className={className}
      ariaLabel={t('statusTimelineAriaLabel')}
    />
  )
}
