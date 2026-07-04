'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Info } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { useToast, useConfirm } from '@/app/components/design-system'
import { Button } from '@/app/components/ui/Button'
import OpsPageHeader from '../../components/OpsPageHeader'
import OpsAlert from '../../components/OpsAlert'
import { OpsPageSkeleton } from '../../components/OpsSkeleton'
import { BroadcastStepper } from '../components/BroadcastStepper'
import { BroadcastPreviewStats } from '../components/BroadcastPreviewStats'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  opsGetBroadcast,
  opsListKommuner,
  opsListServiceAreas,
  opsPreviewBroadcast,
  opsSendBroadcast,
  opsUpsertBroadcastDraft,
  type BroadcastChannels,
  type BroadcastDetail,
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
  { key: 'kommune_ansatt', labelKey: 'opsBroadcastRoleKommune' as const },
  { key: 'event_ansatt', labelKey: 'opsBroadcastRoleEvent' as const },
  { key: 'leietaker', labelKey: 'opsBroadcastRoleLeietaker' as const },
]

function applyDraftToForm(
  d: BroadcastDetail,
  setters: {
    setDraftId: (id: string) => void
    setRoles: (r: Record<string, boolean>) => void
    setKommuneIds: (ids: string[]) => void
    setEventId: (id: string) => void
    setServiceAreaId: (id: string) => void
    setTitleNo: (v: string) => void
    setTitleSe: (v: string) => void
    setTitleEn: (v: string) => void
    setMessageNo: (v: string) => void
    setMessageSe: (v: string) => void
    setMessageEn: (v: string) => void
    setLinkHref: (v: string) => void
    setChannels: (c: BroadcastChannels) => void
    setStep: (s: 1 | 2 | 3) => void
  },
) {
  const rolesInSeg = d.segment.roles ?? []
  setters.setDraftId(d.id)
  setters.setRoles({
    homeowner: rolesInSeg.includes('homeowner'),
    kommune_ansatt:
      rolesInSeg.includes('kommune_ansatt') || rolesInSeg.includes('kommune_admin'),
    event_ansatt: rolesInSeg.includes('event_ansatt'),
    leietaker: rolesInSeg.includes('leietaker'),
  })
  setters.setKommuneIds(d.segment.kommune_ids ?? [])
  setters.setEventId(d.segment.event_id ?? '')
  setters.setServiceAreaId(d.segment.service_area_id ?? '')
  setters.setTitleNo(d.title_no)
  setters.setTitleSe(d.title_se)
  setters.setTitleEn(d.title_en)
  setters.setMessageNo(d.message_no)
  setters.setMessageSe(d.message_se)
  setters.setMessageEn(d.message_en)
  setters.setLinkHref(d.link_href ?? '')
  setters.setChannels(d.channels)
  const hasContent = Boolean(d.title_no.trim() && d.message_no.trim())
  setters.setStep(hasContent ? 2 : 1)
}

function OpsBroadcastNewPageInner() {
  const { t } = useLanguage()
  const toast = useToast()
  const confirm = useConfirm()
  const router = useRouter()
  const searchParams = useSearchParams()
  const draftParam = searchParams.get('draft')

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingDraft, setLoadingDraft] = useState(Boolean(draftParam))
  const [busy, setBusy] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(draftParam)

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

  useEffect(() => {
    if (!draftParam) {
      setLoadingDraft(false)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const d = await opsGetBroadcast(draftParam)
        if (cancelled) return
        if (d.status !== 'draft') {
          router.replace(`/ops/broadcasts/${draftParam}`)
          return
        }
        applyDraftToForm(d, {
          setDraftId,
          setRoles,
          setKommuneIds,
          setEventId,
          setServiceAreaId,
          setTitleNo,
          setTitleSe,
          setTitleEn,
          setMessageNo,
          setMessageSe,
          setMessageEn,
          setLinkHref,
          setChannels,
          setStep,
        })
      } catch (e) {
        if (!cancelled) {
          toast(e instanceof Error ? e.message : t('errorPrefix'), 'error')
        }
      } finally {
        if (!cancelled) setLoadingDraft(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [draftParam, router, t, toast])

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

  if (loadingMeta || loadingDraft) return <OpsPageSkeleton />

  const wizardLabels = [
    t('opsBroadcastStepAudience'),
    t('opsBroadcastStepContent'),
    t('opsBroadcastStepReview'),
  ] as [string, string, string]

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

  const previewStats = preview
    ? [
        { label: t('opsBroadcastPreviewTotal'), value: preview.total },
        { label: t('opsBroadcastPreviewPush'), value: preview.push_eligible },
        { label: t('opsBroadcastPreviewEmail'), value: preview.email_eligible },
      ]
    : null

  return (
    <div className="ops-stack ops-stack--lg">
      <OpsPageHeader
        breadcrumb={
          <Link href="/ops/broadcasts" className="ops-link ops-breadcrumb-link">
            <ArrowLeft size={14} aria-hidden className="ops-icon-inline" />
            {t('opsBroadcastsTitle')}
          </Link>
        }
        title={draftId ? t('opsBroadcastContinueDraft') : t('opsBroadcastNew')}
        lead={t('opsBroadcastOneWayHint')}
      />

      {draftId ? (
        <Alert>
          <Info className="size-4" />
          <AlertDescription>{t('opsBroadcastResumeHint')}</AlertDescription>
        </Alert>
      ) : null}

      <BroadcastStepper step={step} labels={wizardLabels} />

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('opsBroadcastStepAudience')}</CardTitle>
            <CardDescription>{t('opsBroadcastRoleHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {ROLE_KEYS.map(({ key, labelKey }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`role-${key}`}
                    checked={Boolean(roles[key])}
                    onCheckedChange={(checked) => toggleRole(key, checked === true)}
                  />
                  <Label htmlFor={`role-${key}`} className="cursor-pointer font-normal">
                    {t(labelKey)}
                  </Label>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-medium">{t('opsBroadcastKommuneFilter')}</p>
              <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
                {kommuner.map((k) => (
                  <div key={k.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`kommune-${k.id}`}
                      checked={kommuneIds.includes(k.id)}
                      onCheckedChange={() => toggleKommune(k.id)}
                    />
                    <Label htmlFor={`kommune-${k.id}`} className="cursor-pointer font-normal">
                      {k.display_name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-filter">{t('opsBroadcastEventFilter')}</Label>
                <select
                  id="event-filter"
                  className="ops-input w-full"
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-area-filter">{t('opsBroadcastServiceAreaFilter')}</Label>
                <select
                  id="service-area-filter"
                  className="ops-input w-full"
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
              </div>
            </div>

            <div className="space-y-4">
              <Button type="button" variant="secondary" onClick={() => void runPreview()}>
                {t('opsBroadcastPreview')}
              </Button>
              {previewStats ? (
                <div className="space-y-3">
                  <BroadcastPreviewStats items={previewStats} />
                  {preview && preview.total > 500 ? (
                    <Alert>
                      <Info className="size-4" />
                      <AlertDescription>
                        {t('opsBroadcastLargeWarning').replace('{count}', String(preview.total))}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>
              ) : null}
              {previewError ? (
                <Alert>
                  <Info className="size-4" />
                  <AlertDescription>{previewError}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t">
            <Button
              type="button"
              variant="accent"
              disabled={!preview || preview.total === 0}
              onClick={() => setStep(2)}
            >
              {t('opsBroadcastStepContent')}
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('opsBroadcastStepContent')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs
              value={localeTab}
              onValueChange={(v) => setLocaleTab(v as LocaleTab)}
            >
              <TabsList>
                <TabsTrigger value="no">{t('opsBroadcastLocaleNo')}</TabsTrigger>
                <TabsTrigger value="se">{t('opsBroadcastLocaleSe')}</TabsTrigger>
                <TabsTrigger value="en">{t('opsBroadcastLocaleEn')}</TabsTrigger>
              </TabsList>
              <TabsContent value={localeTab} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="broadcast-title">
                    {t('opsBroadcastTitle')} {localeTab === 'no' ? '*' : ''}
                  </Label>
                  <Input
                    id="broadcast-title"
                    value={localeTab === 'no' ? titleNo : localeTab === 'se' ? titleSe : titleEn}
                    onChange={(e) => {
                      const v = e.target.value
                      if (localeTab === 'no') setTitleNo(v)
                      else if (localeTab === 'se') setTitleSe(v)
                      else setTitleEn(v)
                    }}
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="broadcast-message">
                    {t('opsBroadcastMessage')} {localeTab === 'no' ? '*' : ''}
                  </Label>
                  <Textarea
                    id="broadcast-message"
                    rows={6}
                    value={
                      localeTab === 'no' ? messageNo : localeTab === 'se' ? messageSe : messageEn
                    }
                    onChange={(e) => {
                      const v = e.target.value
                      if (localeTab === 'no') setMessageNo(v)
                      else if (localeTab === 'se') setMessageSe(v)
                      else setMessageEn(v)
                    }}
                    maxLength={2000}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label htmlFor="broadcast-link">{t('opsBroadcastLink')}</Label>
              <Input
                id="broadcast-link"
                value={linkHref}
                onChange={(e) => setLinkHref(e.target.value)}
                placeholder="/homeowner/manage"
              />
            </div>

            <Separator />

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="channel-in-app"
                  checked={channels.in_app}
                  onCheckedChange={(checked) =>
                    setChannels((c) => ({ ...c, in_app: checked === true }))
                  }
                />
                <Label htmlFor="channel-in-app" className="cursor-pointer font-normal">
                  {t('opsBroadcastChannelInApp')}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="channel-push"
                  checked={channels.push}
                  onCheckedChange={(checked) =>
                    setChannels((c) => ({ ...c, push: checked === true }))
                  }
                />
                <Label htmlFor="channel-push" className="cursor-pointer font-normal">
                  {t('opsBroadcastChannelPush')}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="channel-email"
                  checked={channels.email}
                  onCheckedChange={(checked) =>
                    setChannels((c) => ({ ...c, email: checked === true }))
                  }
                />
                <Label htmlFor="channel-email" className="cursor-pointer font-normal">
                  {t('opsBroadcastChannelEmail')}
                </Label>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-between border-t">
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
          </CardFooter>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('opsBroadcastStepReview')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewStats ? <BroadcastPreviewStats items={previewStats} /> : null}

            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-base">{previewTitle || '—'}</CardTitle>
                <CardDescription className="whitespace-pre-wrap">
                  {previewMessage || '—'}
                </CardDescription>
                {linkHref ? (
                  <CardDescription className="text-primary">{linkHref}</CardDescription>
                ) : null}
              </CardHeader>
            </Card>
          </CardContent>
          <CardFooter className="flex-wrap justify-between gap-2 border-t">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setStep(2)}>
              {t('opsBroadcastStepContent')}
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void saveDraft().then(() => toast(t('opsBroadcastSaveDraft'), 'success'))
                }
              >
                {t('opsBroadcastSaveDraft')}
              </Button>
              <Button
                type="button"
                variant="accent"
                disabled={busy || !preview?.total}
                onClick={() => void handleSend()}
              >
                {busy ? t('dbSavingShort') : t('opsBroadcastSend')}
              </Button>
            </div>
          </CardFooter>
        </Card>
      ) : null}
    </div>
  )
}

export default function OpsBroadcastNewPage() {
  return (
    <Suspense fallback={<OpsPageSkeleton />}>
      <OpsBroadcastNewPageInner />
    </Suspense>
  )
}
