'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import OpsPageHeader from '../../components/OpsPageHeader'
import OpsPanel from '../../components/OpsPanel'
import OpsBadge from '../../components/OpsBadge'
import OpsAlert from '../../components/OpsAlert'
import OpsKpiGrid from '../../components/OpsKpiGrid'
import { OpsPageSkeleton } from '../../components/OpsSkeleton'
import { Button } from '@/app/components/ui/Button'
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

  return (
    <div className="ops-stack ops-stack--lg">
      <OpsPageHeader
        breadcrumb={
          <Link href="/ops/broadcasts" className="ops-link ops-breadcrumb-link">
            <ArrowLeft size={14} aria-hidden className="ops-icon-inline" />
            {t('opsBroadcastsTitle')}
          </Link>
        }
        title={t('opsBroadcastDetailTitle')}
        lead={
          <>
            <OpsBadge tone={detail.status === 'sent' ? 'success' : 'neutral'}>
              {detail.status === 'sent' ? t('opsBroadcastStatusSent') : t('opsBroadcastStatusDraft')}
            </OpsBadge>
            {detail.sent_at ? (
              <span className="ops-meta"> · {formatDateTimeNo(detail.sent_at)}</span>
            ) : null}
          </>
        }
        actions={
          <Link href="/ops/broadcasts">
            <Button variant="secondary">{t('opsBroadcastBack')}</Button>
          </Link>
        }
      />

      {detail.status === 'sent' ? (
        <OpsKpiGrid
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

      <OpsPanel title={t('opsBroadcastTitle')}>
        <p className="ops-list-card-title">{detail.title_no}</p>
        {detail.title_se ? <p className="ops-meta">se: {detail.title_se}</p> : null}
        {detail.title_en ? <p className="ops-meta">en: {detail.title_en}</p> : null}
      </OpsPanel>

      <OpsPanel title={t('opsBroadcastMessage')}>
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{detail.message_no}</p>
        {detail.message_se ? (
          <p className="ops-meta" style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
            se: {detail.message_se}
          </p>
        ) : null}
        {detail.message_en ? (
          <p className="ops-meta" style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
            en: {detail.message_en}
          </p>
        ) : null}
        {detail.link_href ? (
          <p className="ops-meta" style={{ marginTop: 12 }}>
            {detail.link_href}
          </p>
        ) : null}
      </OpsPanel>
    </div>
  )
}
