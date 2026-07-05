'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Plus, Send } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import type { TranslationKey } from '@/lib/translations'
import OpsGdprBanner from '../components/OpsGdprBanner'
import OpsPageHeader from '../components/OpsPageHeader'
import OpsEmptyState from '../components/OpsEmptyState'
import OpsDataTable from '../components/OpsDataTable'
import OpsBadge from '../components/OpsBadge'
import OpsFab from '../components/OpsFab'
import OpsSegmentedControl from '../components/OpsSegmentedControl'
import { OpsTableSkeleton } from '../components/OpsSkeleton'
import { Button } from '@/app/components/ui/Button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatDateTimeNo } from '@/app/lib/dateFormat'
import { opsListBroadcasts, type BroadcastListItem } from '@/app/lib/opsApi'

function segmentSummary(
  segment: BroadcastListItem['segment'],
  t: (key: TranslationKey) => string,
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

function broadcastHref(row: BroadcastListItem): string {
  if (row.status === 'draft') return `/ops/broadcasts/new?draft=${row.id}`
  return `/ops/broadcasts/${row.id}`
}

export default function OpsBroadcastsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [items, setItems] = useState<BroadcastListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [segment, setSegment] = useState<'draft' | 'sent'>('draft')

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

  const drafts = useMemo(() => items.filter((i) => i.status === 'draft'), [items])
  const sent = useMemo(() => items.filter((i) => i.status === 'sent'), [items])
  const visible = segment === 'draft' ? drafts : sent

  if (loading) return <OpsTableSkeleton rows={6} cols={5} />
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="ops-stack ops-stack--lg">
      <OpsPageHeader
        title={t('opsBroadcastsTitle')}
        lead={t('opsBroadcastsLead')}
        actions={
          <Link href="/ops/broadcasts/new" className="ops-desktop-only">
            <Button variant="primary">
              <Plus size={16} aria-hidden style={{ marginRight: 6 }} />
              {t('opsBroadcastNew')}
            </Button>
          </Link>
        }
      />

      <div className="ops-desktop-only">
        <OpsGdprBanner />
        <Alert>
          <AlertDescription>{t('opsBroadcastOneWayHint')}</AlertDescription>
        </Alert>
      </div>

      <div className="ops-mobile-only">
        <OpsSegmentedControl
          value={segment}
          onChange={(value) => setSegment(value as 'draft' | 'sent')}
          options={[
            { value: 'draft', label: t('opsBroadcastStatusDraft') },
            { value: 'sent', label: t('opsBroadcastStatusSent') },
          ]}
        />
      </div>

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
        <>
          <div className="ops-mobile-only">
            {visible.length === 0 ? (
              <OpsEmptyState title={t('opsNoResults')} />
            ) : (
              visible.map((row) => (
                <Link key={row.id} href={broadcastHref(row)} className="ops-mobile-list-card">
                  <div className="ops-mobile-list-card-head">
                    <p className="ops-mobile-list-card-title">{row.title_no || '—'}</p>
                    <OpsBadge tone={row.status === 'sent' ? 'success' : 'neutral'} dot>
                      {row.status === 'sent'
                        ? t('opsBroadcastStatusSent')
                        : t('opsBroadcastStatusDraft')}
                    </OpsBadge>
                  </div>
                  <div className="ops-mobile-broadcast-meta">
                    <span className="inline-flex items-center gap-1">
                      <Send size={13} aria-hidden />
                      Push
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mail size={13} aria-hidden />
                      E-post
                    </span>
                    {row.recipient_count ? <span>· {row.recipient_count}</span> : null}
                  </div>
                  <p className="ops-mobile-list-card-slug mt-1">
                    {segmentSummary(row.segment, t)} ·{' '}
                    {formatDateTimeNo(row.sent_at ?? row.created_at)}
                  </p>
                </Link>
              ))
            )}
          </div>

          <div className="ops-desktop-only">
            {drafts.length > 0 ? (
              <section className="ops-panel ops-panel--pad-md">
                <h2 className="ops-panel-title">{t('opsBroadcastDraftsSection')}</h2>
                <div className="ops-card-list mt-4">
                  {drafts.map((row) => (
                    <Link key={row.id} href={broadcastHref(row)} className="ops-list-card">
                      <div className="ops-list-card-head">
                        <div>
                          <p className="ops-list-card-title">{row.title_no || '—'}</p>
                          <p className="ops-meta">{segmentSummary(row.segment, t)}</p>
                        </div>
                        <OpsBadge tone="neutral">{t('opsBroadcastStatusDraft')}</OpsBadge>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {sent.length > 0 ? (
              <OpsDataTable
                rows={sent}
                onRowClick={(row) => router.push(broadcastHref(row))}
                columns={[
                  {
                    key: 'title',
                    header: t('opsBroadcastTitle'),
                    render: (row) => (
                      <Link
                        href={broadcastHref(row)}
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
                    render: () => <OpsBadge tone="success">{t('opsBroadcastStatusSent')}</OpsBadge>,
                  },
                  {
                    key: 'segment',
                    header: t('opsBroadcastStepAudience'),
                    render: (row) => <span className="ops-meta">{segmentSummary(row.segment, t)}</span>,
                  },
                  {
                    key: 'recipients',
                    header: t('opsBroadcastRecipients'),
                    render: (row) => row.recipient_count ?? '—',
                  },
                  {
                    key: 'sent',
                    header: t('opsBroadcastSentAt'),
                    render: (row) =>
                      row.sent_at ? formatDateTimeNo(row.sent_at) : formatDateTimeNo(row.created_at),
                  },
                ]}
              />
            ) : null}
          </div>
        </>
      )}

      <OpsFab href="/ops/broadcasts/new" label={t('opsBroadcastNew')} />
    </div>
  )
}
