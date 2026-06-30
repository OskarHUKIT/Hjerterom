'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import LoadingPlaceholder from '@/app/components/LoadingPlaceholder'

export default function EventStaffDashboardPage() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ events: 0, inquiries: 0, listings: 0 })

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
      const [{ count: inq }, { count: opt }] = await Promise.all([
        supabase
          .from('event_inquiries')
          .select('*', { count: 'exact', head: true })
          .in('event_id', eventIds)
          .neq('status', 'closed'),
        supabase
          .from('listing_event_availability')
          .select('*', { count: 'exact', head: true })
          .in('event_id', eventIds)
          .eq('status', 'active'),
      ])
      setStats({ events: eventIds.length, inquiries: inq ?? 0, listings: opt ?? 0 })
      setLoading(false)
    })()
  }, [])

  if (loading) return <LoadingPlaceholder />

  return (
    <div>
      <h1 style={{ margin: '0 0 8px', fontSize: '1.35rem' }}>{t('eventNavDashboard')}</h1>
      <p style={{ margin: '0 0 24px', opacity: 0.8, lineHeight: 1.5 }}>{t('eventDashboardLead')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {[
          { label: t('eventStatEvents'), value: stats.events },
          { label: t('eventStatInquiries'), value: stats.inquiries },
          { label: t('eventStatListings'), value: stats.listings },
        ].map((s) => (
          <div
            key={s.label}
            className="card"
            style={{ padding: 'var(--space-4)', textAlign: 'center' }}
          >
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.75 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/nav/event/inquiries" className="button button-accent" style={{ textDecoration: 'none' }}>
          {t('eventNavInquiries')}
        </Link>
        <Link href="/nav/event/listings" className="button button-secondary" style={{ textDecoration: 'none' }}>
          {t('eventNavListings')}
        </Link>
      </div>
    </div>
  )
}
