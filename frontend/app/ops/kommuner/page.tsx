'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'
import OpsGdprBanner from '../components/OpsGdprBanner'
import OpsPageHeader from '../components/OpsPageHeader'
import OpsBadge, { opsHealthTone } from '../components/OpsBadge'
import OpsAlert from '../components/OpsAlert'
import OpsEmptyState from '../components/OpsEmptyState'
import OpsDataTable from '../components/OpsDataTable'
import { OpsTableSkeleton } from '../components/OpsSkeleton'
import { Button } from '../../components/ui/Button'
import { opsListKommuner, type OpsKommuneListItem } from '../../lib/opsApi'
import { opsHealthKey, opsKommuneStatusKey } from '../../lib/opsLabels'

function healthClass(h: string) {
  if (h === 'green') return 'ops-health-pill--green'
  if (h === 'amber') return 'ops-health-pill--amber'
  return 'ops-health-pill--red'
}

export default function OpsKommunerPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [items, setItems] = useState<OpsKommuneListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const rows = await opsListKommuner()
        if (!cancelled) setItems(rows)
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

  if (loading) return <OpsTableSkeleton rows={8} cols={6} />
  if (error) return <OpsAlert tone="error">{error}</OpsAlert>

  return (
    <div className="ops-stack ops-stack--lg">
      <OpsPageHeader
        title={t('opsNavKommuner')}
        lead={t('opsKommunerLead')}
        actions={
          <Link href="/ops/kommuner/new">
            <Button variant="primary">
              <Plus size={16} aria-hidden style={{ marginRight: 6 }} />
              {t('opsKommuneNew')}
            </Button>
          </Link>
        }
      />
      <OpsGdprBanner />

      {items.length === 0 ? (
        <OpsEmptyState
          title={t('opsKommunerEmpty')}
          action={
            <Link href="/ops/kommuner/new">
              <Button variant="primary">{t('opsKommuneNew')}</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="ops-desktop-only">
            <OpsDataTable
              rows={items}
              onRowClick={(k) => router.push(`/ops/kommuner/${k.slug}`)}
              columns={[
                {
                  key: 'name',
                  header: t('opsKommuneName'),
                  render: (k) => (
                    <Link href={`/ops/kommuner/${k.slug}`} className="ops-link" onClick={(e) => e.stopPropagation()}>
                      {k.display_name}
                    </Link>
                  ),
                },
                {
                  key: 'status',
                  header: t('opsKommuneStatus'),
                  render: (k) => (
                    <OpsBadge tone={k.status === 'active' ? 'success' : k.status === 'suspended' ? 'danger' : 'neutral'}>
                      {t(opsKommuneStatusKey(k.status))}
                    </OpsBadge>
                  ),
                },
                {
                  key: 'health',
                  header: t('opsKommuneHealth'),
                  render: (k) => (
                    <OpsBadge tone={opsHealthTone(k.health_metrics?.health ?? 'red')}>
                      {t(opsHealthKey(k.health_metrics?.health ?? 'red'))}
                    </OpsBadge>
                  ),
                },
                { key: 'staff', header: t('opsKommuneStaff'), render: (k) => k.health_metrics?.staff_count ?? 0 },
                { key: 'listings', header: t('opsKommuneListings'), render: (k) => k.health_metrics?.listings_matched ?? 0 },
                {
                  key: 'match',
                  header: t('opsKommuneMatchRate'),
                  render: (k) => `${k.health_metrics?.region_match_rate ?? 0}%`,
                },
              ]}
            />
          </div>

          <div className="ops-card-list ops-mobile-only">
            {items.map((k) => (
              <Link key={k.id} href={`/ops/kommuner/${k.slug}`} className="ops-list-card">
                <div className="ops-list-card-head">
                  <p className="ops-list-card-title">{k.display_name}</p>
                  <span className={`ops-health-pill ${healthClass(k.health_metrics?.health ?? 'red')}`}>
                    {t(opsHealthKey(k.health_metrics?.health ?? 'red'))}
                  </span>
                </div>
                <p className="ops-meta">
                  {t(opsKommuneStatusKey(k.status))} · {k.health_metrics?.staff_count ?? 0}{' '}
                  {t('opsKommuneStaff').toLowerCase()}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
