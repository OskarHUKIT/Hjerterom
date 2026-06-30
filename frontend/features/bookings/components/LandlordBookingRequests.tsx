'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import { Button } from '@/app/components/ui/Button'
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
  const [rows, setRows] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (listingIds.length === 0) {
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, listing_id, guest_name, guest_email, check_in, check_out, status, message')
        .in('listing_id', listingIds)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(30)
      if (!cancelled) {
        setRows((data ?? []) as BookingRow[])
        setLoading(false)
      }
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
      if (error || !data?.ok) {
        toast(error?.message ?? t('errSaveListing'), 'error')
        setBusyId(null)
        return
      }
    } else {
      const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
      if (error) {
        toast(error.message, 'error')
        setBusyId(null)
        return
      }
    }
    setBusyId(null)
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    toast(status === 'accepted' ? t('landlordBookingAcceptedToast') : t('finnBookingUpdated'), 'success')
  }

  if (loading || rows.length === 0) return null

  return (
    <section className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)' }}>
      <h3 style={{ margin: '0 0 var(--space-4)' }}>{t('landlordBookingsTitle')}</h3>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
        {rows.map((row) => (
          <li
            key={row.id}
            style={{
              padding: 'var(--space-4)',
              borderRadius: 12,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-app)',
            }}
          >
            <p style={{ margin: '0 0 4px', fontWeight: 600, color: 'var(--text-main)' }}>
              {row.guest_name || row.guest_email}
            </p>
            <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {formatDateNo(row.check_in)} – {formatDateNo(row.check_out)}
            </p>
            {row.message ? (
              <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: 1.5 }}>
                {row.message}
              </p>
            ) : null}
            {row.status === 'pending' ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  variant="accent"
                  disabled={busyId === row.id}
                  onClick={() => void updateStatus(row.id, 'accepted')}
                >
                  {t('landlordBookingAccept')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busyId === row.id}
                  onClick={() => void updateStatus(row.id, 'rejected')}
                >
                  {t('landlordBookingReject')}
                </Button>
              </div>
            ) : (
              <span style={{ fontSize: '0.85rem', color: 'var(--color-teal)', fontWeight: 600 }}>
                {t('landlordBookingAccepted')}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
