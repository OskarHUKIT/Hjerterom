'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { opsListKommuner, type OpsKommuneListItem } from '@/app/lib/opsApi'
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
  const [staffEmail, setStaffEmail] = useState('')
  const [staffRows, setStaffRows] = useState<{ profile_id: string; profiles: { email: string; full_name: string } | null }[]>([])
  const [kommuner, setKommuner] = useState<OpsKommuneListItem[]>([])
  const [selectedKommuneIds, setSelectedKommuneIds] = useState<string[]>([])
  const [regionKeysInput, setRegionKeysInput] = useState('')

  const load = async () => {
    if (!slug) return
    setLoading(true)
    const { data } = await supabase.from('central_events').select('*').eq('slug', slug).maybeSingle()
    setEvent(data)
    if (data?.id) {
      const scope = (data.geography_scope ?? {}) as { kommune_ids?: string[]; region_keys?: string[] }
      setSelectedKommuneIds(Array.isArray(scope.kommune_ids) ? scope.kommune_ids : [])
      setRegionKeysInput(Array.isArray(scope.region_keys) ? scope.region_keys.join(', ') : '')
      const [{ count }, { data: staff }] = await Promise.all([
        supabase
          .from('listing_event_availability')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', data.id)
          .eq('status', 'active'),
        supabase
          .from('central_event_staff')
          .select('profile_id, profiles(email, full_name)')
          .eq('event_id', data.id),
      ])
      setOptInCount(count ?? 0)
      setStaffRows(
        (staff ?? []).map((s) => ({
          profile_id: s.profile_id as string,
          profiles: Array.isArray(s.profiles) ? s.profiles[0] ?? null : s.profiles,
        }))
      )
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
    void (async () => {
      try {
        setKommuner(await opsListKommuner())
      } catch {
        setKommuner([])
      }
    })()
  }, [slug])

  const toggleKommune = (id: string) => {
    setSelectedKommuneIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const saveGeography = async () => {
    if (!event?.id) return
    setBusy(true)
    const regionKeys = regionKeysInput
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    const { error } = await supabase
      .from('central_events')
      .update({
        geography_scope: { kommune_ids: selectedKommuneIds, region_keys: regionKeys },
      })
      .eq('id', event.id)
    setBusy(false)
    if (error) {
      toast(error.message, 'error')
      return
    }
    toast(t('opsSaved'), 'success')
    void load()
  }

  const assignEventStaff = async () => {
    if (!event?.id || !staffEmail.trim()) return
    setBusy(true)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, role')
      .ilike('email', staffEmail.trim())
      .maybeSingle()
    if (!profile?.id) {
      toast(t('opsUserNotFound'), 'error')
      setBusy(false)
      return
    }
    await supabase.from('profiles').update({ role: 'event_ansatt' }).eq('id', profile.id)
    const { error } = await supabase.from('central_event_staff').upsert(
      [{ event_id: event.id, profile_id: profile.id, role: 'staff' }],
      { onConflict: 'event_id,profile_id' }
    )
    setBusy(false)
    if (error) {
      toast(error.message, 'error')
      return
    }
    toast(t('opsEventStaffAdded'), 'success')
    setStaffEmail('')
    void load()
  }

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
      <OpsPanel title={t('opsEventGeographyTitle')} className="ops-stack">
        <p className="ops-meta" style={{ marginTop: 0 }}>{t('opsEventGeographyLead')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
          {kommuner.map((k) => (
            <label key={k.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={selectedKommuneIds.includes(k.id)}
                onChange={() => toggleKommune(k.id)}
                disabled={busy}
              />
              {k.display_name}
            </label>
          ))}
        </div>
        <label className="ops-field">
          {t('opsEventGeographyRegionKeys')}
          <input
            className="ops-input"
            value={regionKeysInput}
            onChange={(e) => setRegionKeysInput(e.target.value)}
            disabled={busy}
            placeholder="narvik, tromso"
          />
        </label>
        <button type="button" className={buttonClassName('accent')} disabled={busy} onClick={() => void saveGeography()}>
          {t('opsSave')}
        </button>
      </OpsPanel>
      <OpsPanel title={t('opsEventStaffTitle')} className="ops-stack">
        <ul style={{ margin: '0 0 16px', paddingLeft: 20 }}>
          {staffRows.length === 0 ? (
            <li style={{ opacity: 0.7 }}>—</li>
          ) : (
            staffRows.map((s) => (
              <li key={s.profile_id}>
                {s.profiles?.full_name ?? s.profiles?.email ?? s.profile_id}
              </li>
            ))
          )}
        </ul>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="ops-field" style={{ flex: 1, minWidth: 200 }}>
            {t('opsEventStaffEmail')}
            <input
              className="ops-input"
              type="email"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              placeholder="event@example.com"
            />
          </label>
          <button type="button" className={buttonClassName('accent')} disabled={busy} onClick={() => void assignEventStaff()}>
            {t('opsEventStaffAdd')}
          </button>
        </div>
      </OpsPanel>
    </OpsShell>
  )
}
