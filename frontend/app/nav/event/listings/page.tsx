'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import LoadingPlaceholder from '@/app/components/LoadingPlaceholder'

type OptInRow = {
  id: string
  event_id: string
  listing_id: string
  available_from: string
  available_to: string
  listings: { address: string; city: string } | { address: string; city: string }[] | null
  central_events: { name: string } | { name: string }[] | null
}

export default function EventStaffListingsPage() {
  const { t } = useLanguage()
  const [rows, setRows] = useState<OptInRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return
      const { data: staffRows } = await supabase
        .from('central_event_staff')
        .select('event_id')
        .eq('profile_id', auth.user.id)
      const eventIds = (staffRows ?? []).map((r) => r.event_id)
      if (eventIds.length === 0) {
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from('listing_event_availability')
        .select(
          'id, event_id, listing_id, available_from, available_to, listings(address, city), central_events(name)'
        )
        .in('event_id', eventIds)
        .eq('status', 'active')
        .order('available_from', { ascending: true })
      setRows((data ?? []) as OptInRow[])
      setLoading(false)
    })()
  }, [])

  if (loading) return <LoadingPlaceholder />

  return (
    <div>
      <h1 style={{ margin: '0 0 8px' }}>{t('eventNavListings')}</h1>
      <p style={{ margin: '0 0 16px', opacity: 0.75, fontSize: '0.9rem' }}>{t('eventListingsReadOnlyLead')}</p>
      {rows.length === 0 ? (
        <p style={{ opacity: 0.7 }}>{t('eventOptInEmpty')}</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((row) => {
            const listing = Array.isArray(row.listings) ? row.listings[0] : row.listings
            const ev = Array.isArray(row.central_events) ? row.central_events[0] : row.central_events
            return (
              <li key={row.id} className="card" style={{ padding: 'var(--space-3) var(--space-4)' }}>
                <strong>{listing?.address ?? '—'}</strong>
                <span style={{ opacity: 0.75 }}> · {listing?.city}</span>
                <div style={{ fontSize: '0.85rem', marginTop: 6 }}>
                  🎫 {ev?.name} · {row.available_from} – {row.available_to}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
