'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { readRpcOk } from '@/app/lib/supabaseRpc'
import { supabase } from '@/app/lib/supabase'
import { formatDateNo, formatDateTimeNo } from '@/app/lib/dateFormat'
import ListingStatusBadge from '@/app/components/design-system/ListingStatusBadge'
import { useConfirm, useToast } from '@/app/components/design-system'
import { useLanguage } from '@/context/LanguageContext'
import type {
  LandlordBookingRow,
  LandlordBookingsFilter,
  LandlordBookingsSortKey,
} from '@/features/bookings/lib/landlordBookings'
import {
  bookingGuestLabel,
  bookingPropertyLabel,
  filterLandlordBookings,
  formatBookingPrice,
  nightsBetween,
  sortLandlordBookings,
} from '@/features/bookings/lib/landlordBookings'

type Props = {
  rows: LandlordBookingRow[]
  filter: LandlordBookingsFilter
  onRowClick: (row: LandlordBookingRow) => void
  onBookingUpdated: (id: string, status: string) => void
  className?: string
}

type SortState = {
  key: LandlordBookingsSortKey
  order: 'asc' | 'desc'
}

export default function LandlordBookingsTable({
  rows,
  filter,
  onRowClick,
  onBookingUpdated,
  className = '',
}: Props) {
  const { t } = useLanguage()
  const toast = useToast()
  const confirm = useConfirm()
  const shouldReduceMotion = useReducedMotion()
  const [sort, setSort] = useState<SortState>({ key: 'created_at', order: 'desc' })
  const [busyId, setBusyId] = useState<string | null>(null)

  const visibleRows = useMemo(
    () => sortLandlordBookings(filterLandlordBookings(rows, filter), sort.key, sort.order),
    [rows, filter, sort]
  )

  const toggleSort = (key: LandlordBookingsSortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, order: prev.order === 'asc' ? 'desc' : 'asc' }
        : { key, order: key === 'created_at' ? 'desc' : 'asc' }
    )
  }

  const sortIconClass = (key: LandlordBookingsSortKey) =>
    `h-4 w-4 transition-transform ${
      sort.key === key && sort.order === 'asc' ? 'rotate-180' : ''
    }`

  const updateStatus = async (row: LandlordBookingRow, status: 'accepted' | 'rejected') => {
    const previousStatus = row.status
    setBusyId(row.id)
    onBookingUpdated(row.id, status)

    try {
      if (status === 'accepted') {
        const { data, error } = await supabase.rpc('prepare_booking_payment', {
          p_booking_id: row.id,
        })
        const payload = readRpcOk(data)
        if (error || !payload.ok) {
          throw new Error(error?.message ?? payload.reason ?? payload.error ?? t('errSaveListing'))
        }
      } else {
        const { data, error } = await supabase
          .from('bookings')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', row.id)
          .select('id')
          .maybeSingle()
        if (error || !data) {
          throw new Error(error?.message ?? t('errSaveListing'))
        }
      }

      toast(
        status === 'accepted' ? t('landlordBookingAcceptedToast') : t('finnBookingUpdated'),
        'success'
      )
    } catch (err) {
      onBookingUpdated(row.id, previousStatus)
      toast(err instanceof Error ? err.message : t('errSaveListing'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleAccept = async (row: LandlordBookingRow, event: React.MouseEvent) => {
    event.stopPropagation()
    const guestLabel = bookingGuestLabel(row)
    const ok = await confirm({
      title: t('landlordBookingAcceptConfirmTitle'),
      message: t('landlordBookingAcceptConfirmMessage').replace('{guest}', guestLabel),
      confirmLabel: t('landlordBookingAccept'),
      cancelLabel: t('cancel'),
      variant: 'primary',
    })
    if (!ok) return
    await updateStatus(row, 'accepted')
  }

  const handleReject = async (row: LandlordBookingRow, event: React.MouseEvent) => {
    event.stopPropagation()
    const guestLabel = bookingGuestLabel(row)
    const ok = await confirm({
      title: t('landlordBookingRejectConfirmTitle'),
      message: t('landlordBookingRejectConfirmMessage').replace('{guest}', guestLabel),
      confirmLabel: t('landlordBookingReject'),
      cancelLabel: t('cancel'),
      variant: 'danger',
    })
    if (!ok) return
    await updateStatus(row, 'rejected')
  }

  const containerVariants = shouldReduceMotion
    ? undefined
    : {
        visible: {
          transition: { staggerChildren: 0.03, delayChildren: 0.05 },
        },
      }

  const rowVariants = shouldReduceMotion
    ? undefined
    : {
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0 },
      }

  const SortableHeader = ({
    label,
    sortKey,
  }: {
    label: string
    sortKey: LandlordBookingsSortKey
  }) => (
    <button
      type="button"
      className="flex items-center gap-2 text-left uppercase tracking-wide"
      onClick={() => toggleSort(sortKey)}
    >
      {label}
      <ChevronDown className={sortIconClass(sortKey)} aria-hidden />
    </button>
  )

  return (
    <div className={`mx-auto w-full max-w-7xl ${className}`}>
      <div className="hidden overflow-hidden rounded-2xl border border-border/50 bg-background md:block">
        <div className="grid grid-cols-7 gap-4 border-b border-border/20 bg-muted/15 px-6 py-3 text-xs font-medium text-muted-foreground/70">
          <div>{t('landlordBookingsColGuest')}</div>
          <div>{t('landlordBookingsColProperty')}</div>
          <div>{t('landlordBookingsColDates')}</div>
          <div>{t('landlordBookingsColNights')}</div>
          <SortableHeader label={t('landlordBookingsColPrice')} sortKey="price" />
          <SortableHeader label={t('landlordBookingsColStatus')} sortKey="status" />
          <SortableHeader label={t('landlordBookingsColCreated')} sortKey="created_at" />
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {visibleRows.map((row, index) => (
            <motion.div key={row.id} variants={rowVariants}>
              <div
                role="button"
                tabIndex={0}
                className={`group relative grid cursor-pointer grid-cols-7 gap-4 px-6 py-3 transition-colors hover:bg-muted/30 ${
                  index < visibleRows.length - 1 ? 'border-b border-border/20' : ''
                }`}
                onClick={() => onRowClick(row)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onRowClick(row)
                  }
                }}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground/90">
                    {bookingGuestLabel(row)}
                  </div>
                  <div className="truncate text-xs text-muted-foreground/70">{row.guest_email}</div>
                </div>
                <div className="flex min-w-0 items-center">
                  <span className="truncate text-sm text-foreground/85">
                    {bookingPropertyLabel(row)}
                  </span>
                </div>
                <div className="flex items-center text-sm text-foreground/85">
                  {formatDateNo(row.check_in)} → {formatDateNo(row.check_out)}
                </div>
                <div className="flex items-center text-sm font-medium text-foreground/90">
                  {nightsBetween(row.check_in, row.check_out)}
                </div>
                <div className="flex items-center text-sm font-semibold text-foreground/90">
                  {formatBookingPrice(row)}
                </div>
                <div className="flex items-center">
                  <ListingStatusBadge booking={row.status} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground/70">
                    {formatDateTimeNo(row.created_at)}
                  </span>
                  {row.status === 'pending' ? (
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={(event) => void handleAccept(row, event)}
                        className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
                      >
                        {t('landlordBookingAccept')}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={(event) => void handleReject(row, event)}
                        className="rounded-lg border border-border/40 px-2 py-1 text-xs font-medium text-foreground/80 hover:bg-muted/50 disabled:opacity-50"
                      >
                        {t('landlordBookingReject')}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        <AnimatePresence initial={false}>
          {visibleRows.map((row) => (
            <motion.button
              key={row.id}
              type="button"
              layout={!shouldReduceMotion}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: 8 }}
              className="rounded-2xl border border-border/50 bg-background p-4 text-left shadow-sm"
              onClick={() => onRowClick(row)}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-foreground/90">
                    {bookingGuestLabel(row)}
                  </div>
                  <div className="truncate text-xs text-muted-foreground/70">
                    {bookingPropertyLabel(row)}
                  </div>
                </div>
                <ListingStatusBadge booking={row.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground/70">{t('landlordBookingsColDates')}</div>
                  <div>
                    {formatDateNo(row.check_in)} → {formatDateNo(row.check_out)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground/70">{t('landlordBookingsColPrice')}</div>
                  <div className="font-semibold">{formatBookingPrice(row)}</div>
                </div>
              </div>
              {row.status === 'pending' ? (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={(event) => void handleAccept(row, event)}
                    className="flex-1 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary"
                  >
                    {t('landlordBookingAccept')}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={(event) => void handleReject(row, event)}
                    className="flex-1 rounded-lg border border-border/40 px-3 py-2 text-sm font-medium"
                  >
                    {t('landlordBookingReject')}
                  </button>
                </div>
              ) : null}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
