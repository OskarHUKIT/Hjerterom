'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { readRpcOk } from '@/app/lib/supabaseRpc'
import { useLanguage } from '@/context/LanguageContext'
import { buildNavMessagesHref } from '@/app/lib/returnNav'
import {
  NotificationsWithActions,
  useConfirm,
  useToast,
  type NotificationWithActionsItem,
} from '@/app/components/design-system'
import {
  bookingStatusBadgeLabel,
  bookingStatusBadgeVariant,
} from '@/app/components/design-system/ListingStatusBadge'
import { formatDateNo } from '@/app/lib/dateFormat'

type BookingRow = {
  id: string
  listing_id: string
  guest_name: string | null
  guest_email: string
  check_in: string
  check_out: string
  status: string
  message: string | null
}

type Props = {
  listingIds: string[]
}

export default function LandlordBookingRequests({ listingIds }: Props) {
  const { t } = useLanguage()
  const toast = useToast()
  const confirm = useConfirm()
  const [rows, setRows] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (listingIds.length === 0) {
      setRows([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void (async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, listing_id, guest_name, guest_email, check_in, check_out, status, message')
        .in('listing_id', listingIds)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(30)
      if (cancelled) return
      if (error) {
        toast(error.message, 'error')
        setRows([])
      } else {
        setRows((data ?? []) as BookingRow[])
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [listingIds.join(',')])

  const updateStatus = async (id: string, status: 'accepted' | 'rejected') => {
    setBusyId(id)
    if (status === 'accepted') {
      const { data, error } = await supabase.rpc('prepare_booking_payment', {
        p_booking_id: id,
      })
      const payload = readRpcOk(data)
      if (error || !payload.ok) {
        toast(error?.message ?? payload.reason ?? payload.error ?? t('errSaveListing'), 'error')
        setBusyId(null)
        return
      }
    } else {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id')
        .maybeSingle()
      if (error || !data) {
        toast(error?.message ?? t('errSaveListing'), 'error')
        setBusyId(null)
        return
      }
    }
    setBusyId(null)
    setRows((prev) =>
      status === 'rejected'
        ? prev.filter((r) => r.id !== id)
        : prev.map((r) => (r.id === id ? { ...r, status } : r))
    )
    toast(
      status === 'accepted' ? t('landlordBookingAcceptedToast') : t('finnBookingUpdated'),
      'success'
    )
  }

  const handleReject = async (row: BookingRow) => {
    const guestLabel = row.guest_name || row.guest_email
    const ok = await confirm({
      title: t('landlordBookingRejectConfirmTitle'),
      message: t('landlordBookingRejectConfirmMessage').replace('{guest}', guestLabel),
      confirmLabel: t('landlordBookingReject'),
      cancelLabel: t('cancel'),
      variant: 'danger',
    })
    if (!ok) return
    await updateStatus(row.id, 'rejected')
  }

  const items: NotificationWithActionsItem[] = rows.map((row) => {
    const guestLabel = row.guest_name || row.guest_email
    const secondaryActions = [
      {
        id: 'message',
        label: t('landlordBookingOpenMessage'),
        href: buildNavMessagesHref({ booking: row.id, returnTo: '/homeowner/manage' }),
        variant: 'secondary' as const,
      },
    ]

    if (row.status === 'pending') {
      return {
        id: row.id,
        title: guestLabel,
        meta: `${formatDateNo(row.check_in)} – ${formatDateNo(row.check_out)}`,
        body: row.message,
        statusLabel: bookingStatusBadgeLabel(row.status, t),
        statusVariant: bookingStatusBadgeVariant(row.status),
        primaryActions: [
          {
            id: 'accept',
            label: t('landlordBookingAccept'),
            variant: 'accent' as const,
            disabled: busyId === row.id,
            onClick: () => {
              void updateStatus(row.id, 'accepted')
            },
          },
          {
            id: 'reject',
            label: t('landlordBookingReject'),
            variant: 'secondary' as const,
            disabled: busyId === row.id,
            onClick: () => {
              void handleReject(row)
            },
          },
        ],
        secondaryActions,
      }
    }

    return {
      id: row.id,
      title: guestLabel,
      meta: `${formatDateNo(row.check_in)} – ${formatDateNo(row.check_out)}`,
      body: row.message,
      statusLabel: bookingStatusBadgeLabel(row.status, t),
      statusVariant: bookingStatusBadgeVariant(row.status),
      secondaryActions,
    }
  })

  return (
    <NotificationsWithActions
      title={loading || rows.length > 0 ? t('landlordBookingsTitle') : undefined}
      items={items}
      loading={loading}
      loadingRows={1}
    />
  )
}
