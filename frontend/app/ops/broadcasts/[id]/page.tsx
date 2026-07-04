'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import OpsPageHeader from '../../components/OpsPageHeader'
import OpsAlert from '../../components/OpsAlert'
import { OpsPageSkeleton } from '../../components/OpsSkeleton'
import { BroadcastPreviewStats } from '../components/BroadcastPreviewStats'
import { Button } from '@/app/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTimeNo } from '@/app/lib/dateFormat'
import { opsGetBroadcast, type BroadcastDetail } from '@/app/lib/opsApi'

export default function OpsBroadcastDetailPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''
  const { t } = useLanguage()
  const [detail, setDetail] = useState<BroadcastDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void (async () => {
      try {
        const d = await opsGetBroadcast(id)
        if (!cancelled) setDetail(d)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) return <OpsPageSkeleton />
  if (error || !detail) return <OpsAlert tone="error">{error || t('pageLoadStuck')}</OpsAlert>

  const stats = detail.delivery_stats as Record<string, number | unknown>
  const isDraft = detail.status === 'draft'

  return (
    <div className="ops-stack ops-stack--lg">
      <OpsPageHeader
        breadcrumb={
          <Link href="/ops/broadcasts" className="ops-link ops-breadcrumb-link">
            <ArrowLeft size={14} aria-hidden className="ops-icon-inline" />
            {t('opsBroadcastsTitle')}
          </Link>
        }
        title={isDraft ? t('opsBroadcastContinueDraft') : t('opsBroadcastDetailTitle')}
        lead={
          <>
            <Badge variant={detail.status === 'sent' ? 'default' : 'secondary'}>
              {detail.status === 'sent' ? t('opsBroadcastStatusSent') : t('opsBroadcastStatusDraft')}
            </Badge>
            {detail.sent_at ? (
              <span className="ops-meta"> · {formatDateTimeNo(detail.sent_at)}</span>
            ) : null}
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {isDraft ? (
              <Link href={`/ops/broadcasts/new?draft=${detail.id}`}>
                <Button variant="accent">{t('opsBroadcastContinueDraft')}</Button>
              </Link>
            ) : null}
            <Link href="/ops/broadcasts">
              <Button variant="secondary">{t('opsBroadcastBack')}</Button>
            </Link>
          </div>
        }
      />

      {detail.status === 'sent' ? (
        <BroadcastPreviewStats
          items={[
            { label: t('opsBroadcastRecipients'), value: detail.recipient_count },
            {
              label: t('opsBroadcastPreviewPush'),
              value: typeof stats.push_eligible === 'number' ? stats.push_eligible : '—',
            },
            {
              label: t('opsBroadcastPreviewEmail'),
              value: typeof stats.email_eligible === 'number' ? stats.email_eligible : '—',
            },
          ]}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('opsBroadcastTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="font-medium">{detail.title_no}</p>
          {detail.title_se ? <CardDescription>se: {detail.title_se}</CardDescription> : null}
          {detail.title_en ? <CardDescription>en: {detail.title_en}</CardDescription> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('opsBroadcastMessage')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="whitespace-pre-wrap leading-relaxed">{detail.message_no}</p>
          {detail.message_se ? (
            <CardDescription className="whitespace-pre-wrap">se: {detail.message_se}</CardDescription>
          ) : null}
          {detail.message_en ? (
            <CardDescription className="whitespace-pre-wrap">en: {detail.message_en}</CardDescription>
          ) : null}
          {detail.link_href ? (
            <CardDescription className="text-primary">{detail.link_href}</CardDescription>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
