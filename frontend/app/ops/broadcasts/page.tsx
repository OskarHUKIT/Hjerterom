'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import type { TranslationKey } from '@/lib/translations'
import OpsGdprBanner from '../components/OpsGdprBanner'
import OpsPageHeader from '../components/OpsPageHeader'
import OpsBadge from '../components/OpsBadge'
import OpsAlert from '../components/OpsAlert'
import OpsEmptyState from '../components/OpsEmptyState'
import OpsDataTable from '../components/OpsDataTable'
import { OpsTableSkeleton } from '../components/OpsSkeleton'
import { Button } from '@/app/components/ui/Button'
import { formatDateTimeNo } from '@/app/lib/dateFormat'
import { opsListBroadcasts, type BroadcastListItem } from '@/app/lib/opsApi'

function segmentSummary(
  segment: BroadcastListItem['segment'],
  t: (key: TranslationKey) => string
): string {
  const roles = segment.roles ?? []
  if (roles.length === 0) return '—'
  const labels: string[] = []
  if (roles.includes('homeowner')) labels.push(t('opsBroadcastRoleHomeowner'))
  if (roles.includes('kommune_ansatt') || roles.includes('kommune_admin')) {
    labels.push(t('opsBroadcastRoleKommune'))
  }
  if (roles.includes('event_ansatt')) labels.push(t('opsBroadcastRoleEvent'))
  if (roles.includes('leietaker')) labels.push(t('opsBroadcastRoleLeietaker'))
  const kommuneCount = segment.kommune_ids?.length ?? 0
  if (kommuneCount > 0) labels.push(`${kommuneCount} kommune`)
  return labels.join(' · ') || roles.join(', ')
}

export default function OpsBroadcastsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [items, setItems] = useState<BroadcastListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await opsListBroadcasts()
        if (!cancelled) setItems(res.items ?? [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <OpsTableSkeleton rows={6} cols={5} />
  if (error) return <OpsAlert tone="error">{error}</OpsAlert>

  return (
    <div className="ops-stack ops-stack--lg">
      <OpsPageHeader
        title={t('opsBroadcastsTitle')}
        lead={t('opsBroadcastsLead')}
        actions={
          <Link href="/ops/broadcasts/new">
            <Button variant="primary">
              <Plus size={16} aria-hidden style={{ marginRight: 6 }} />
              {t('opsBroadcastNew')}
            </Button>
          </Link>
        }
      />
      <OpsGdprBanner />
      <OpsAlert tone="info">{t('opsBroadcastOneWayHint')}</OpsAlert>

      {items.length === 0 ? (
        <OpsEmptyState
          title={t('opsBroadcastEmpty')}
          action={
            <Link href="/ops/broadcasts/new">
              <Button variant="primary">{t('opsBroadcastNew')}</Button>
            </Link>
          }
        />
      ) : (
        <OpsDataTable
          rows={items}
          onRowClick={(row) => router.push(`/ops/broadcasts/${row.id}`)}
          columns={[
            {
              key: 'title',
              header: t('opsBroadcastTitle'),
              render: (row) => (
                <Link
                  href={`/ops/broadcasts/${row.id}`}
                  className="ops-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  {row.title_no || '—'}
                </Link>
              ),
            },
            {
              key: 'status',
              header: t('opsKommuneStatus'),
              render: (row) => (
                <OpsBadge tone={row.status === 'sent' ? 'success' : 'neutral'}>
                  {row.status === 'sent' ? t('opsBroadcastStatusSent') : t('opsBroadcastStatusDraft')}
                </OpsBadge>
              ),
            },
            {
              key: 'segment',
              header: t('opsBroadcastStepAudience'),
              render: (row) => <span className="ops-meta">{segmentSummary(row.segment, t)}</span>,
            },
            {
              key: 'recipients',
              header: t('opsBroadcastRecipients'),
              render: (row) => (row.status === 'sent' ? row.recipient_count : '—'),
            },
            {
              key: 'sent',
              header: t('opsBroadcastSentAt'),
              render: (row) =>
                row.sent_at ? formatDateTimeNo(row.sent_at) : formatDateTimeNo(row.created_at),
            },
          ]}
        />
      )}
    </div>
  )
}
