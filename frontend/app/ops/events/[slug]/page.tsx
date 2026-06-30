'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import OpsShell from '../../components/OpsShell'
import OpsPageHeader from '../../components/OpsPageHeader'
import OpsPanel from '../../components/OpsPanel'
import OpsBadge from '../../components/OpsBadge'
import { OpsPageSkeleton } from '../../components/OpsSkeleton'
import { buttonClassName } from '@/app/components/ui/Button'

export default function OpsEventDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug
  const { t } = useLanguage()
  const [event, setEvent] = useState<Record<string, unknown> | null>(null)
  const [optInCount, setOptInCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      const { data } = await supabase
        .from('central_events')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      if (cancelled) return
      setEvent(data)

      if (data?.id) {
        const { count } = await supabase
          .from('listing_event_availability')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', data.id)
          .eq('status', 'active')
        setOptInCount(count ?? 0)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <OpsShell>
        <OpsPageSkeleton />
      </OpsShell>
    )
  }

  if (!event) {
    return (
      <OpsShell>
        <OpsPageHeader title={t('opsEventsTitle')} />
        <p>Ikke funnet.</p>
        <Link href="/ops/events" className={buttonClassName('secondary')}>
          Tilbake
        </Link>
      </OpsShell>
    )
  }

  return (
    <OpsShell>
      <OpsPageHeader
        title={String(event.name ?? '')}
        lead={String(event.description_public ?? '')}
        actions={
          <Link href="/ops/events" className={buttonClassName('secondary')}>
            Tilbake
          </Link>
        }
      />
      <OpsPanel>
        <p style={{ marginTop: 0 }}>
          {String(event.start_date)} – {String(event.end_date)}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <OpsBadge tone="info">{String(event.status)}</OpsBadge>
          <OpsBadge tone="neutral">{String(event.routing_mode)}</OpsBadge>
          {event.arrangement_tag ? <OpsBadge tone="neutral">{String(event.arrangement_tag)}</OpsBadge> : null}
        </div>
        <p>
          <strong>{optInCount}</strong> boliger har sagt ja til dette arrangementet.
        </p>
      </OpsPanel>
    </OpsShell>
  )
}
