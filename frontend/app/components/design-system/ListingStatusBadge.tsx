'use client'

import type { ListingDayAvailabilityStatus } from '@/app/lib/listingAvailabilityStatusToday'
import { useLanguage } from '@/context/LanguageContext'
import StatusBadge, { type StatusBadgeVariant } from './StatusBadge'

export type ListingStatusBadgeProps = {
  /** Day status from listingAvailabilityStatusToday() */
  availability?: ListingDayAvailabilityStatus
  /** Raw booking.status from Supabase */
  booking?: string | null
  className?: string
}

export function listingAvailabilityBadgeVariant(
  status: ListingDayAvailabilityStatus
): StatusBadgeVariant {
  switch (status) {
    case 'Tilgjengelig':
      return 'success'
    case 'Utilgjengelig':
      return 'danger'
    case 'Formidla':
      return 'info'
    case 'Ikke markert':
    default:
      return 'neutral'
  }
}

export function bookingStatusBadgeVariant(status: string): StatusBadgeVariant {
  const s = status.trim().toLowerCase()
  if (s === 'pending') return 'pending'
  if (s === 'paid' || s === 'accepted' || s === 'completed') return 'success'
  if (s === 'rejected' || s === 'cancelled') return 'danger'
  return 'neutral'
}

type TranslateFn = ReturnType<typeof useLanguage>['t']

export function listingAvailabilityBadgeLabel(
  status: ListingDayAvailabilityStatus,
  t: TranslateFn
): string {
  switch (status) {
    case 'Tilgjengelig':
      return t('available')
    case 'Utilgjengelig':
      return t('unavailable')
    case 'Formidla':
      return t('formidlet')
    case 'Ikke markert':
    default:
      return t('availabilityUnmarked')
  }
}

export function bookingStatusBadgeLabel(status: string, t: TranslateFn): string {
  const key = `finnBookingStatus_${status.trim().toLowerCase()}` as Parameters<TranslateFn>[0]
  const translated = t(key)
  if (translated !== key) return translated
  return status
}

/**
 * Single status language for homeowner listing availability and booking rows.
 * Wraps uniquesonu-style StatusBadge with Hjerterum state mapping.
 */
export default function ListingStatusBadge({
  availability,
  booking,
  className,
}: ListingStatusBadgeProps) {
  const { t } = useLanguage()

  if (booking != null && booking !== '') {
    return (
      <StatusBadge
        label={bookingStatusBadgeLabel(booking, t)}
        variant={bookingStatusBadgeVariant(booking)}
        className={className}
      />
    )
  }

  const dayStatus: ListingDayAvailabilityStatus = availability ?? 'Ikke markert'

  return (
    <StatusBadge
      label={listingAvailabilityBadgeLabel(dayStatus, t)}
      variant={listingAvailabilityBadgeVariant(dayStatus)}
      className={className}
    />
  )
}
