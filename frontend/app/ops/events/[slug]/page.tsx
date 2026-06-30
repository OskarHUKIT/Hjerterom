'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import OpsShell from '../../components/OpsShell'
import OpsPageHeader from '../../components/OpsPageHeader'
import OpsPanel from '../../components/OpsPanel'
import OpsBadge from '../../components/OpsBadge'
import { OpsPageSkeleton } from '../../components/OpsSkeleton'
import { useToast } from '@/app/components/design-system'
import { buttonClassName } from '@/app/components/ui/Button'

export default function OpsEventDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug
  const { t } = useLanguage()
  const toast = useToast()
  const [event, setEvent] = useState<Record<string, unknown> | null>(null)
  const [optInCount, setOptInCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    if (!slug) return
    setLoading(true)
    const { data } = await supabase.from('central_events').select('*').eq('slug', slug).maybeSingle()
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
  }

  useEffect(() => {
    void load()
  }, [slug])

  const setStatus = async (status: 'published' | 'closed' | 'draft') => {
    if (!event?.id) return
    setBusy(true)
    const patch: Record<string, unknown> = { status }
    if (status === 'published') patch.published_at = new Date().toISOString()
    if (status === 'closed') patch.closed_at = new Date().toISOString()
    const { error } = await supabase.from('central_events').update(patch).eq('id', event.id)
    if (error) {
      toast(error.message, 'error')
      setBusy(false)
      return
    }
    const user = await getAuthUserDeduped()
    await supabase.from('audit_logs').insert([
      {
        user_id: user?.id ?? null,
        action_type: status === 'published' ? 'OPS_EVENT_PUBLISHED' : 'OPS_EVENT_CLOSED',
        details: { event_id: event.id, slug: event.slug, name: event.name },
      },
    ])
    toast(t('opsSaved'), 'success')
    setBusy(false)
    void load()
  }

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
        <p>{t('finnEventNotFound')}</p>
        <Link href="/ops/events" className={buttonClassName('secondary')}>
          {t('confirmCancel')}
        </Link>
      </OpsShell>
    )
  }

  const status = String(event.status ?? 'draft')

  return (
    <OpsShell>
      <OpsPageHeader
        title={String(event.name ?? '')}
        lead={String(event.description_public ?? '')}
        actions={
          <Link href="/ops/events" className={buttonClassName('secondary')}>
            {t('confirmCancel')}
          </Link>
        }
      />
      <OpsPanel>
        <p style={{ marginTop: 0, color: 'var(--ops-text-muted)' }}>
          {String(event.start_date)} – {String(event.end_date)}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <OpsBadge tone={status === 'published' ? 'success' : 'neutral'}>{status}</OpsBadge>
          <OpsBadge tone="info">{String(event.routing_mode)}</OpsBadge>
          {event.arrangement_tag ? <OpsBadge tone="neutral">{String(event.arrangement_tag)}</OpsBadge> : null}
        </div>
        <p style={{ marginBottom: 24 }}>
          <strong>{optInCount}</strong> {t('opsEventOptInCount')}
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {status === 'draft' && (
            <button type="button" className={buttonClassName('accent')} disabled={busy} onClick={() => void setStatus('published')}>
              {t('opsEventPublish')}
            </button>
          )}
          {status === 'published' && (
            <button type="button" className={buttonClassName('secondary')} disabled={busy} onClick={() => void setStatus('closed')}>
              {t('opsEventClose')}
            </button>
          )}
          <Link href={`/finn/arrangement/${String(event.slug)}`} className={buttonClassName('secondary')} target="_blank" rel="noopener noreferrer">
            {t('opsEventViewPublic')}
          </Link>
        </div>
      </OpsPanel>
    </OpsShell>
  )
}
