'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Filter } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'
import OpsGdprBanner from '../components/OpsGdprBanner'
import OpsPageHeader from '../components/OpsPageHeader'
import OpsBadge, { opsHealthTone } from '../components/OpsBadge'
import OpsAlert from '../components/OpsAlert'
import OpsEmptyState from '../components/OpsEmptyState'
import OpsDataTable from '../components/OpsDataTable'
import OpsChipGroup from '../components/OpsChipGroup'
import OpsFab from '../components/OpsFab'
import OpsMobileSearchBar from '../components/OpsMobileSearchBar'
import { OpsTableSkeleton } from '../components/OpsSkeleton'
import { Button } from '../../components/ui/Button'
import { opsListKommuner, type OpsKommuneListItem } from '../../lib/opsApi'
import { opsHealthKey, opsKommuneStatusKey } from '../../lib/opsLabels'

function healthDotClass(h: string) {
  if (h === 'green') return 'ops-mobile-list-card-meta-dot--green'
  if (h === 'amber') return 'ops-mobile-list-card-meta-dot--amber'
  return 'ops-mobile-list-card-meta-dot--red'
}

export default function OpsKommunerPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [items, setItems] = useState<OpsKommuneListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((k) => {
      const matchesQuery =
        !q ||
        k.display_name.toLowerCase().includes(q) ||
        k.slug.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || k.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [items, query, statusFilter])

  if (loading) return <OpsTableSkeleton rows={8} cols={6} />
  if (error) return <OpsAlert tone="error">{error}</OpsAlert>

  return (
    <div className="ops-stack ops-stack--lg">
      <OpsPageHeader
        title={t('opsNavKommuner')}
        lead={t('opsKommunerLead')}
        actions={
          <Link href="/ops/kommuner/new" className="ops-desktop-only">
            <Button variant="primary">{t('opsKommuneNew')}</Button>
          </Link>
        }
      />

      <div className="ops-mobile-sticky-toolbar ops-mobile-only">
        <OpsMobileSearchBar
          id="ops-kommune-search"
          value={query}
          onChange={setQuery}
          placeholder={t('opsKommuneSearchPlaceholder')}
          trailing={
            <button type="button" className="ops-icon-btn" aria-label={t('opsFilterRole')}>
              <Filter size={16} aria-hidden />
            </button>
          }
        />
        <OpsChipGroup
          className="mt-2"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: t('opsFilterAll') },
            { value: 'pilot', label: t(opsKommuneStatusKey('pilot')) },
            { value: 'active', label: t(opsKommuneStatusKey('active')) },
            { value: 'suspended', label: t(opsKommuneStatusKey('suspended')) },
          ]}
        />
      </div>

      <div className="ops-desktop-only">
        <OpsGdprBanner />
      </div>

      {filtered.length === 0 ? (
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
              rows={filtered}
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

          <div className="ops-mobile-only">
            {filtered.map((k) => {
              const health = k.health_metrics?.health ?? 'red'
              return (
                <Link key={k.id} href={`/ops/kommuner/${k.slug}`} className="ops-mobile-list-card">
                  <div className="ops-mobile-list-card-head">
                    <div>
                      <p className="ops-mobile-list-card-title">{k.display_name}</p>
                      <p className="ops-mobile-list-card-slug">{k.slug}</p>
                    </div>
                    <OpsBadge
                      tone={k.status === 'active' ? 'success' : k.status === 'suspended' ? 'danger' : 'warning'}
                      dot
                    >
                      {t(opsKommuneStatusKey(k.status))}
                    </OpsBadge>
                  </div>
                  <div className="ops-mobile-list-card-meta">
                    <span className="flex items-center gap-1">
                      <span className={`ops-mobile-list-card-meta-dot ${healthDotClass(health)}`} aria-hidden />
                      {t(opsHealthKey(health))}
                    </span>
                    <span>
                      {t('opsKommuneStaff')} {k.health_metrics?.staff_count ?? 0}
                    </span>
                    <span>
                      {t('opsKommuneListings')} {k.health_metrics?.listings_matched ?? 0}
                    </span>
                    <span>{k.health_metrics?.region_match_rate ?? 0}%</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}

      <OpsFab href="/ops/kommuner/new" label={t('opsKommuneNew')} />
    </div>
  )
}
