'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Plus } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import OpsShell from '../components/OpsShell'
import OpsPageHeader from '../components/OpsPageHeader'
import OpsPanel from '../components/OpsPanel'
import OpsEmptyState from '../components/OpsEmptyState'
import OpsBadge from '../components/OpsBadge'
import { OpsPageSkeleton } from '../components/OpsSkeleton'
import { buttonClassName } from '@/app/components/ui/Button'

type CentralEventRow = {
  id: string
  slug: string
  name: string
  start_date: string
  end_date: string
  routing_mode: 'saksbehandler' | 'turisme'
  status: 'draft' | 'published' | 'closed'
  arrangement_tag: string | null
}

export default function OpsEventsPage() {
  const { t } = useLanguage()
  const [rows, setRows] = useState<CentralEventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('central_events')
        .select('id, slug, name, start_date, end_date, routing_mode, status, arrangement_tag')
        .order('start_date', { ascending: false })

      if (!cancelled) {
        if (!error) setRows((data ?? []) as CentralEventRow[])
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const statusLabel = (status: CentralEventRow['status']) => {
    if (status === 'published') return t('opsEventStatusPublished')
    if (status === 'closed') return t('opsEventStatusClosed')
    return t('opsEventStatusDraft')
  }

  const routingLabel = (mode: CentralEventRow['routing_mode']) =>
    mode === 'turisme' ? t('opsEventRoutingTourism') : t('opsEventRoutingSaksbehandler')

  return (
    <OpsShell>
      <OpsPageHeader
        title={t('opsEventsTitle')}
        lead={t('opsEventsDesc')}
        actions={
          <Link href="/ops/events/new" className={buttonClassName('accent')}>
            <Plus size={18} aria-hidden /> {t('opsEventNew')}
          </Link>
        }
      />

      {loading ? (
        <OpsPageSkeleton />
      ) : rows.length === 0 ? (
        <OpsEmptyState
          title={t('opsEventsTitle')}
          description={t('opsEventsDesc')}
          action={
            <Link href="/ops/events/new" className={buttonClassName('accent')}>
              {t('opsEventNew')}
            </Link>
          }
        />
      ) : (
        <OpsPanel>
          <ul className="ops-list-plain" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {rows.map((event) => (
              <li
                key={event.id}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'var(--space-3)',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-4) 0',
                  borderBottom: '1px solid var(--ops-border)',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{event.name}</p>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: '0.875rem',
                      color: 'var(--ops-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Calendar size={14} aria-hidden />
                    {event.start_date} – {event.end_date}
                    {event.arrangement_tag ? ` · ${event.arrangement_tag}` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <OpsBadge tone={event.status === 'published' ? 'success' : 'neutral'}>
                    {statusLabel(event.status)}
                  </OpsBadge>
                  <OpsBadge tone="info">{routingLabel(event.routing_mode)}</OpsBadge>
                  <Link href={`/ops/events/${event.slug}`} className={buttonClassName('secondary')}>
                    {t('opsEditRole')}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </OpsPanel>
      )}
    </OpsShell>
  )
}
