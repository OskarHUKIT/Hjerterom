import type { TranslationKey } from '@/lib/translations'
import type { StatusTimelineStep } from '@/components/shared/status-timeline'

type TranslateFn = (key: TranslationKey) => string

export type BookingTimelineTimestamps = Partial<
  Record<'pending' | 'accepted' | 'paid' | 'completed' | 'rejected' | 'cancelled', string | null>
>

const BOOKING_FLOW = ['pending', 'accepted', 'paid', 'completed'] as const

function bookingStepLabel(key: (typeof BOOKING_FLOW)[number], t: TranslateFn): string {
  switch (key) {
    case 'pending':
      return t('finnTimelineRequested')
    case 'accepted':
      return t('finnTimelineAccepted')
    case 'paid':
      return t('finnTimelinePaid')
    case 'completed':
      return t('finnTimelineStay')
  }
}

function normalizeBookingStatus(status: string): string {
  const s = status.trim().toLowerCase()
  if (s === 'checked_in') return 'completed'
  return s
}

/** Maps a booking.status value to localized StatusTimeline steps. */
export function buildBookingStatusTimelineSteps(
  status: string,
  t: TranslateFn,
  timestamps?: BookingTimelineTimestamps
): StatusTimelineStep[] {
  const s = normalizeBookingStatus(status)

  if (s === 'rejected' || s === 'cancelled') {
    const terminalKey = `finnBookingStatus_${s}` as TranslationKey
    return [
      {
        key: 'pending',
        label: bookingStepLabel('pending', t),
        timestamp: timestamps?.pending ?? timestamps?.[s],
        state: 'done',
      },
      {
        key: s,
        label: t(terminalKey),
        timestamp: timestamps?.[s],
        state: 'terminal-negative',
      },
    ]
  }

  const activeIndex = BOOKING_FLOW.includes(s as (typeof BOOKING_FLOW)[number])
    ? BOOKING_FLOW.indexOf(s as (typeof BOOKING_FLOW)[number])
    : 0

  return BOOKING_FLOW.map((key, index) => {
    let state: StatusTimelineStep['state']
    if (index < activeIndex) state = 'done'
    else if (index === activeIndex) state = 'current'
    else state = 'upcoming'

    return {
      key,
      label: bookingStepLabel(key, t),
      timestamp: timestamps?.[key],
      state,
    }
  })
}

export function bookingTimelineTimestampsFromRow(row: {
  created_at?: string | null
  updated_at?: string | null
  status?: string | null
}): BookingTimelineTimestamps {
  const status = normalizeBookingStatus(row.status ?? 'pending')
  const timestamps: BookingTimelineTimestamps = {
    pending: row.created_at ?? null,
  }

  if (status === 'accepted' || status === 'paid' || status === 'completed') {
    timestamps[status] = row.updated_at ?? null
  }
  if (status === 'rejected' || status === 'cancelled') {
    timestamps[status] = row.updated_at ?? null
  }

  return timestamps
}
