'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { useToast, useConfirm } from '@/app/components/design-system'
import { Button } from '@/app/components/ui/Button'
import OpsPageHeader from '../../components/OpsPageHeader'
import OpsPanel from '../../components/OpsPanel'
import OpsAlert from '../../components/OpsAlert'
import OpsTabs from '../../components/OpsTabs'
import OpsKpiGrid from '../../components/OpsKpiGrid'
import { OpsWizardProgress } from '../../components/OpsChecklist'
import { OpsPageSkeleton } from '../../components/OpsSkeleton'
import {
  opsListKommuner,
  opsListServiceAreas,
  opsPreviewBroadcast,
  opsSendBroadcast,
  opsUpsertBroadcastDraft,
  type BroadcastChannels,
  type BroadcastPreview,
  type BroadcastSegment,
  type OpsKommuneListItem,
  type OpsServiceArea,
} from '@/app/lib/opsApi'
import { supabase } from '@/app/lib/supabase'

type LocaleTab = 'no' | 'se' | 'en'

type EventOption = { id: string; name: string }

const ROLE_KEYS = [
  { key: 'homeowner', labelKey: 'opsBroadcastRoleHomeowner' as const },
  { key: 'kommune_ansatt', labelKey: 'opsBroadcastRoleKommune' as const, alsoSets: 'kommune_admin' },
  { key: 'event_ansatt', labelKey: 'opsBroadcastRoleEvent' as const },
  { key: 'leietaker', labelKey: 'opsBroadcastRoleLeietaker' as const },
]

export default function OpsBroadcastNewPage() {
  const { t } = useLanguage()
  const toast = useToast()
  const confirm = useConfirm()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [busy, setBusy] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)

  const [kommuner, setKommuner] = useState<OpsKommuneListItem[]>([])
  const [serviceAreas, setServiceAreas] = useState<OpsServiceArea[]>([])
  const [events, setEvents] = useState<EventOption[]>([])

  const [roles, setRoles] = useState<Record<string, boolean>>({
    homeowner: true,
    kommune_ansatt: false,
    event_ansatt: false,
    leietaker: false,
  })
  const [kommuneIds, setKommuneIds] = useState<string[]>([])
  const [eventId, setEventId] = useState('')
  const [serviceAreaId, setServiceAreaId] = useState('')

  const [localeTab, setLocaleTab] = useState<LocaleTab>('no')
  const [titleNo, setTitleNo] = useState('')
  const [titleSe, setTitleSe] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [messageNo, setMessageNo] = useState('')
  const [messageSe, setMessageSe] = useState('')
  const [messageEn, setMessageEn] = useState('')
  const [linkHref, setLinkHref] = useState('')
  const [channels, setChannels] = useState<BroadcastChannels>({
    in_app: true,
    push: true,
    email: false,
  })

  const [preview, setPreview] = useState<BroadcastPreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [k, sa, ev] = await Promise.all([
          opsListKommuner(),
          opsListServiceAreas(),
          supabase
            .from('central_events')
            .select('id, name')
            .in('status', ['published', 'draft'])
            .order('start_date', { ascending: false }),
        ])
        if (cancelled) return
        setKommuner(k)
        setServiceAreas(sa)
        setEvents((ev.data ?? []) as EventOption[])
      } finally {
        if (!cancelled) setLoadingMeta(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const segment = useMemo((): BroadcastSegment => {
    const selectedRoles: string[] = []
    if (roles.homeowner) selectedRoles.push('homeowner')
    if (roles.kommune_ansatt) {
      selectedRoles.push('kommune_ansatt', 'kommune_admin')
    }
    if (roles.event_ansatt) selectedRoles.push('event_ansatt')
    if (roles.leietaker) selectedRoles.push('leietaker')

    const seg: BroadcastSegment = { roles: selectedRoles }
    if (kommuneIds.length > 0) seg.kommune_ids = kommuneIds
    if (eventId) seg.event_id = eventId
    if (serviceAreaId) seg.service_area_id = serviceAreaId
    return seg
  }, [roles, kommuneIds, eventId, serviceAreaId])

  const runPreview = useCallback(async () => {
    setPreviewError(null)
    try {
      const p = await opsPreviewBroadcast(segment)
      setPreview(p)
      if (p.total === 0) setPreviewError(t('opsBroadcastPreviewEmpty'))
    } catch (e) {
      setPreview(null)
      setPreviewError(e instanceof Error ? e.message : t('errorPrefix'))
    }
  }, [segment, t])

  useEffect(() => {
    if (step !== 1 && step !== 3) return
    void runPreview()
  }, [step, runPreview])

  const toggleRole = (key: string, on: boolean) => {
    setRoles((prev) => ({ ...prev, [key]: on }))
    setPreview(null)
  }

  const toggleKommune = (id: string) => {
    setKommuneIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    setPreview(null)
  }

  const saveDraft = async (): Promise<string | null> => {
    if (!titleNo.trim() || !messageNo.trim()) {
      toast(t('opsBroadcastTitle') + ' / ' + t('opsBroadcastMessage'), 'error')
      return null
    }
    const res = await opsUpsertBroadcastDraft({
      id: draftId,
      segment,
      titleNo: titleNo.trim(),
      titleSe: titleSe.trim(),
      titleEn: titleEn.trim(),
      messageNo: messageNo.trim(),
      messageSe: messageSe.trim(),
      messageEn: messageEn.trim(),
      linkHref: linkHref.trim() || null,
      channels,
    })
    setDraftId(res.id)
    return res.id
  }

  const handleSend = async () => {
    const count = preview?.total ?? 0
    if (count === 0) {
      toast(t('opsBroadcastPreviewEmpty'), 'error')
      return
    }
    const ok = await confirm({
      title: t('opsBroadcastSend'),
      message: t('opsBroadcastSendConfirm').replace('{count}', String(count)),
      variant: count > 500 ? 'danger' : 'primary',
    })
    if (!ok) return

    setBusy(true)
    try {
      const id = draftId ?? (await saveDraft())
      if (!id) return
      const sent = await opsSendBroadcast(id)
      toast(t('opsBroadcastSent').replace('{count}', String(sent.recipient_count)), 'success')
      router.push(`/ops/broadcasts/${id}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : t('errorPrefix'), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loadingMeta) return <OpsPageSkeleton />

  const wizardLabels = [
    t('opsBroadcastStepAudience'),
    t('opsBroadcastStepContent'),
    t('opsBroadcastStepReview'),
  ]

  const previewTitle =
    localeTab === 'se'
      ? titleSe || titleNo
      : localeTab === 'en'
        ? titleEn || titleNo
        : titleNo
  const previewMessage =
    localeTab === 'se'
      ? messageSe || messageNo
      : localeTab === 'en'
        ? messageEn || messageNo
        : messageNo

  return (
    <div className="ops-stack ops-stack--lg">
      <OpsPageHeader
        breadcrumb={
          <Link href="/ops/broadcasts" className="ops-link ops-breadcrumb-link">
            <ArrowLeft size={14} aria-hidden className="ops-icon-inline" />
            {t('opsBroadcastsTitle')}
          </Link>
        }
        title={t('opsBroadcastNew')}
        lead={t('opsBroadcastOneWayHint')}
      />

      <OpsWizardProgress steps={3} current={step} labels={wizardLabels} />

      {step === 1 ? (
        <OpsPanel title={t('opsBroadcastStepAudience')}>
          <p className="ops-meta">{t('opsBroadcastRoleHint')}</p>
          <div className="ops-form-grid" style={{ maxWidth: 520 }}>
            {ROLE_KEYS.map(({ key, labelKey }) => (
              <label key={key} className="ops-label" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={Boolean(roles[key])}
                  onChange={(e) => toggleRole(key, e.target.checked)}
                />
                {t(labelKey)}
              </label>
            ))}
          </div>

          <div style={{ marginTop: 'var(--space-6)' }}>
            <p className="ops-list-card-title">{t('opsBroadcastKommuneFilter')}</p>
            <div className="ops-form-grid" style={{ maxWidth: 640, marginTop: 8 }}>
              {kommuner.map((k) => (
                <label key={k.id} className="ops-label" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={kommuneIds.includes(k.id)}
                    onChange={() => toggleKommune(k.id)}
                  />
                  {k.display_name}
                </label>
              ))}
            </div>
          </div>

          <div className="ops-form-grid" style={{ maxWidth: 480, marginTop: 'var(--space-6)' }}>
            <label className="ops-label">
              {t('opsBroadcastEventFilter')}
              <select
                className="ops-input"
                value={eventId}
                onChange={(e) => {
                  setEventId(e.target.value)
                  setPreview(null)
                }}
              >
                <option value="">—</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="ops-label">
              {t('opsBroadcastServiceAreaFilter')}
              <select
                className="ops-input"
                value={serviceAreaId}
                onChange={(e) => {
                  setServiceAreaId(e.target.value)
                  setPreview(null)
                }}
              >
                <option value="">—</option>
                {serviceAreas.map((sa) => (
                  <option key={sa.id} value={sa.id}>
                    {sa.display_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ marginTop: 'var(--space-6)' }}>
            <Button type="button" variant="secondary" onClick={() => void runPreview()}>
              {t('opsBroadcastPreview')}
            </Button>
            {preview ? (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <OpsKpiGrid
                  items={[
                    { label: t('opsBroadcastPreviewTotal'), value: preview.total },
                    { label: t('opsBroadcastPreviewPush'), value: preview.push_eligible },
                    { label: t('opsBroadcastPreviewEmail'), value: preview.email_eligible },
                  ]}
                />
                {preview.total > 500 ? (
                  <div style={{ marginTop: 'var(--space-3)' }}>
                    <OpsAlert tone="info">
                      {t('opsBroadcastLargeWarning').replace('{count}', String(preview.total))}
                    </OpsAlert>
                  </div>
                ) : null}
              </div>
            ) : null}
            {previewError ? (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <OpsAlert tone="info">{previewError}</OpsAlert>
              </div>
            ) : null}
          </div>

          <div className="ops-actions-row" style={{ marginTop: 'var(--space-6)' }}>
            <Button
              type="button"
              variant="accent"
              disabled={!preview || preview.total === 0}
              onClick={() => setStep(2)}
            >
              {t('opsBroadcastStepContent')}
            </Button>
          </div>
        </OpsPanel>
      ) : null}

      {step === 2 ? (
        <OpsPanel title={t('opsBroadcastStepContent')}>
          <OpsTabs
            tabs={[
              { id: 'no' as const, label: t('opsBroadcastLocaleNo') },
              { id: 'se' as const, label: t('opsBroadcastLocaleSe') },
              { id: 'en' as const, label: t('opsBroadcastLocaleEn') },
            ]}
            active={localeTab}
            onChange={setLocaleTab}
          />
          <div className="ops-form-grid" style={{ maxWidth: 640, marginTop: 'var(--space-4)' }}>
            <label className="ops-label">
              {t('opsBroadcastTitle')} {localeTab === 'no' ? '*' : ''}
              <input
                className="ops-input"
                value={localeTab === 'no' ? titleNo : localeTab === 'se' ? titleSe : titleEn}
                onChange={(e) => {
                  const v = e.target.value
                  if (localeTab === 'no') setTitleNo(v)
                  else if (localeTab === 'se') setTitleSe(v)
                  else setTitleEn(v)
                }}
                maxLength={120}
              />
            </label>
            <label className="ops-label">
              {t('opsBroadcastMessage')} {localeTab === 'no' ? '*' : ''}
              <textarea
                className="ops-input"
                rows={6}
                value={localeTab === 'no' ? messageNo : localeTab === 'se' ? messageSe : messageEn}
                onChange={(e) => {
                  const v = e.target.value
                  if (localeTab === 'no') setMessageNo(v)
                  else if (localeTab === 'se') setMessageSe(v)
                  else setMessageEn(v)
                }}
                maxLength={2000}
              />
            </label>
            <label className="ops-label">
              {t('opsBroadcastLink')}
              <input
                className="ops-input"
                value={linkHref}
                onChange={(e) => setLinkHref(e.target.value)}
                placeholder="/homeowner/manage"
              />
            </label>
          </div>

          <div className="ops-form-grid" style={{ maxWidth: 420, marginTop: 'var(--space-4)' }}>
            <label className="ops-label" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={channels.in_app}
                onChange={(e) => setChannels((c) => ({ ...c, in_app: e.target.checked }))}
              />
              {t('opsBroadcastChannelInApp')}
            </label>
            <label className="ops-label" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={channels.push}
                onChange={(e) => setChannels((c) => ({ ...c, push: e.target.checked }))}
              />
              {t('opsBroadcastChannelPush')}
            </label>
            <label className="ops-label" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={channels.email}
                onChange={(e) => setChannels((c) => ({ ...c, email: e.target.checked }))}
              />
              {t('opsBroadcastChannelEmail')}
            </label>
          </div>

          <div className="ops-actions-row" style={{ marginTop: 'var(--space-6)' }}>
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              {t('opsBroadcastStepAudience')}
            </Button>
            <Button
              type="button"
              variant="accent"
              disabled={!titleNo.trim() || !messageNo.trim()}
              onClick={() => setStep(3)}
            >
              {t('opsBroadcastStepReview')}
            </Button>
          </div>
        </OpsPanel>
      ) : null}

      {step === 3 ? (
        <OpsPanel title={t('opsBroadcastStepReview')}>
          {preview ? (
            <OpsKpiGrid
              items={[
                { label: t('opsBroadcastPreviewTotal'), value: preview.total },
                { label: t('opsBroadcastPreviewPush'), value: preview.push_eligible },
                { label: t('opsBroadcastPreviewEmail'), value: preview.email_eligible },
              ]}
            />
          ) : null}

          <div className="card ops-panel" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)' }}>
            <p className="ops-list-card-title">{previewTitle || '—'}</p>
            <p className="ops-meta" style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>
              {previewMessage || '—'}
            </p>
            {linkHref ? (
              <p className="ops-meta" style={{ marginTop: 8 }}>
                {linkHref}
              </p>
            ) : null}
          </div>

          <div className="ops-actions-row" style={{ marginTop: 'var(--space-6)' }}>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setStep(2)}>
              {t('opsBroadcastStepContent')}
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void saveDraft().then(() => toast(t('opsBroadcastSaveDraft'), 'success'))}>
              {t('opsBroadcastSaveDraft')}
            </Button>
            <Button type="button" variant="accent" disabled={busy || !preview?.total} onClick={() => void handleSend()}>
              {busy ? t('dbSavingShort') : t('opsBroadcastSend')}
            </Button>
          </div>
        </OpsPanel>
      ) : null}
    </div>
  )
}
