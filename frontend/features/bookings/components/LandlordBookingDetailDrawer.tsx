'use client'

import Link from 'next/link'
import { Mail, Phone } from 'lucide-react'
import BottomSheet from '@/app/components/BottomSheet'
import { buildNavMessagesHref } from '@/app/lib/returnNav'
import { formatDateNo } from '@/app/lib/dateFormat'
import { buttonClassName } from '@/app/components/ui/Button'
import { useLanguage } from '@/context/LanguageContext'
import BookingStatusTimelinePanel from '@/features/bookings/components/BookingStatusTimelinePanel'
import type { LandlordBookingRow } from '@/features/bookings/lib/landlordBookings'
import {
  bookingGuestLabel,
  bookingPropertyLabel,
  formatBookingPrice,
  nightsBetween,
} from '@/features/bookings/lib/landlordBookings'
import ListingStatusBadge from '@/app/components/design-system/ListingStatusBadge'

type Props = {
  booking: LandlordBookingRow | null
  open: boolean
  onClose: () => void
}

export default function LandlordBookingDetailDrawer({ booking, open, onClose }: Props) {
  const { t } = useLanguage()

  if (!booking) return null

  const guestLabel = bookingGuestLabel(booking)
  const nights = nightsBetween(booking.check_in, booking.check_out)

  return (
    <BottomSheet
      open={open}
      title={guestLabel}
      closeLabel={t('close')}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div>
          <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: 4 }}>
            {t('landlordBookingsColProperty')}
          </div>
          <div style={{ fontWeight: 600 }}>{bookingPropertyLabel(booking)}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: 4 }}>
              {t('landlordBookingsColDates')}
            </div>
            <div>
              {formatDateNo(booking.check_in)} → {formatDateNo(booking.check_out)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: 4 }}>
              {t('landlordBookingsColNights')}
            </div>
            <div>{nights}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: 4 }}>
              {t('landlordBookingsColPrice')}
            </div>
            <div>{formatBookingPrice(booking)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: 4 }}>
              {t('landlordBookingsColStatus')}
            </div>
            <ListingStatusBadge booking={booking.status} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: 8 }}>
            {t('landlordBookingContact')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a
              href={`mailto:${booking.guest_email}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-main)' }}
            >
              <Mail size={16} aria-hidden />
              {booking.guest_email}
            </a>
            {booking.guest_phone ? (
              <a
                href={`tel:${booking.guest_phone}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-main)' }}
              >
                <Phone size={16} aria-hidden />
                {booking.guest_phone}
              </a>
            ) : null}
          </div>
        </div>

        {booking.message ? (
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: 8 }}>
              {t('landlordBookingGuestMessage')}
            </div>
            <p
              style={{
                margin: 0,
                lineHeight: 1.55,
                padding: 'var(--space-3)',
                borderRadius: 12,
                background: 'var(--surface-muted, rgba(255,255,255,0.04))',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {booking.message}
            </p>
          </div>
        ) : null}

        <div>
          <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: 12 }}>
            {t('landlordBookingTimelineTitle')}
          </div>
          <BookingStatusTimelinePanel bookingId={booking.id} />
        </div>

        <Link
          href={buildNavMessagesHref({ booking: booking.id, returnTo: '/homeowner/bookings' })}
          className={buttonClassName('secondary')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
        >
          {t('landlordBookingOpenMessage')}
        </Link>
      </div>
    </BottomSheet>
  )
}
