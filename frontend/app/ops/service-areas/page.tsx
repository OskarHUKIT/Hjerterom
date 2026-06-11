'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '../../../context/LanguageContext'
import OpsGdprBanner from '../components/OpsGdprBanner'
import OpsPageHeader from '../components/OpsPageHeader'
import OpsPanel from '../components/OpsPanel'
import OpsAlert from '../components/OpsAlert'
import OpsBadge from '../components/OpsBadge'
import OpsEmptyState from '../components/OpsEmptyState'
import { OpsPageSkeleton } from '../components/OpsSkeleton'
import { Button } from '../../components/ui/Button'
import {
  opsListKommuner,
  opsListServiceAreas,
  opsUpsertServiceArea,
  type OpsKommuneListItem,
  type OpsServiceArea,
} from '../../lib/opsApi'

export default function OpsServiceAreasPage() {
  const { t } = useLanguage()
  const [areas, setAreas] = useState<OpsServiceArea[]>([])
  const [kommuner, setKommuner] = useState<OpsKommuneListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success')

  const [slug, setSlug] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [notes, setNotes] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [primaryId, setPrimaryId] = useState<string>('')

  const load = async () => {
    const [areaRows, kommuneRows] = await Promise.all([opsListServiceAreas(), opsListKommuner()])
    setAreas(areaRows)
    setKommuner(kommuneRows.filter((k) => k.status !== 'suspended'))
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await load()
      } catch (e) {
        if (!cancelled) {
          setMessageTone('error')
          setMessage(e instanceof Error ? e.message : 'error')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const editArea = (area: OpsServiceArea) => {
    setSlug(area.slug)
    setDisplayName(area.display_name)
    setNotes(area.notes || '')
    const ids = area.members.map((m) => m.kommune_id)
    setMemberIds(ids)
    setPrimaryId(area.members.find((m) => m.is_primary)?.kommune_id || ids[0] || '')
  }

  const toggleMember = (kommuneId: string) => {
    setMemberIds((prev) => {
      if (prev.includes(kommuneId)) {
        const next = prev.filter((id) => id !== kommuneId)
        if (primaryId === kommuneId) setPrimaryId(next[0] || '')
        return next
      }
      const next = [...prev, kommuneId]
      if (!primaryId) setPrimaryId(kommuneId)
      return next
    })
  }

  const save = async () => {
    if (!slug.trim() || !displayName.trim() || memberIds.length === 0) return
    setSaving(true)
    setMessage(null)
    try {
      await opsUpsertServiceArea({
        slug: slug.trim(),
        displayName: displayName.trim(),
        notes: notes.trim() || null,
        memberKommuneIds: memberIds,
        primaryKommuneId: primaryId || memberIds[0],
      })
      setMessageTone('success')
      setMessage(t('opsSaved'))
      await load()
    } catch (e) {
      setMessageTone('error')
      setMessage(e instanceof Error ? e.message : t('pageLoadStuck'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <OpsPageSkeleton />

  return (
    <div className="ops-stack ops-stack--lg">
      <OpsPageHeader title={t('opsNavServiceAreas')} lead={t('opsServiceAreasLead')} />
      <OpsGdprBanner />
      {message ? <OpsAlert tone={messageTone}>{message}</OpsAlert> : null}

      <OpsPanel title={t('opsServiceAreasExisting')} padding="md">
        {areas.length === 0 ? (
          <OpsEmptyState title={t('opsServiceAreasEmpty')} />
        ) : (
          <div className="ops-stack">
            {areas.map((area) => (
              <div key={area.id} className="ops-kpi-card" style={{ textAlign: 'left' }}>
                <div className="ops-actions-row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <p className="ops-kpi-value" style={{ fontSize: '1rem' }}>
                      {area.display_name}
                    </p>
                    <p className="ops-meta">{area.slug}</p>
                  </div>
                  <OpsBadge tone={area.status === 'active' ? 'success' : 'neutral'}>{area.status}</OpsBadge>
                </div>
                <p className="ops-meta" style={{ marginTop: 'var(--space-2)' }}>
                  {area.members.map((m) => m.display_name).join(' · ')}
                </p>
                <Button variant="secondary" style={{ marginTop: 'var(--space-3)' }} onClick={() => editArea(area)}>
                  {t('opsViewDetails')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </OpsPanel>

      <OpsPanel title={t('opsServiceAreasForm')} padding="md">
        <div className="ops-form-grid">
          <label className="ops-field">
            Slug
            <input className="ops-input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="narvik-region" />
          </label>
          <label className="ops-field">
            {t('opsKommuneName')}
            <input className="ops-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
          <label className="ops-field ops-field--full">
            {t('opsNoteOptional')}
            <input className="ops-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        <p className="ops-panel-desc" style={{ marginTop: 'var(--space-4)' }}>
          {t('opsServiceAreasMembersHint')}
        </p>
        <div className="ops-form-grid" style={{ marginTop: 'var(--space-3)' }}>
          {kommuner.map((k) => (
            <label key={k.id} className="ops-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={memberIds.includes(k.id)}
                onChange={() => toggleMember(k.id)}
              />
              <span>
                {k.display_name}{' '}
                <span className="ops-meta">({(k.region_keys || []).join(', ')})</span>
              </span>
              {memberIds.includes(k.id) ? (
                <input
                  type="radio"
                  name="primary-kommune"
                  checked={primaryId === k.id}
                  onChange={() => setPrimaryId(k.id)}
                  title={t('opsServiceAreasPrimary')}
                />
              ) : null}
            </label>
          ))}
        </div>
        <div className="ops-actions-row" style={{ marginTop: 'var(--space-4)' }}>
          <Button variant="primary" disabled={saving} onClick={() => void save()}>
            {t('opsSave')}
          </Button>
          <Link href="/ops/kommuner" className="ops-link">
            {t('opsNavKommuner')}
          </Link>
        </div>
      </OpsPanel>
    </div>
  )
}
