'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'
import OpsGdprBanner from '../components/OpsGdprBanner'
import LoadingPlaceholder from '../../components/LoadingPlaceholder'
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

  if (loading) return <LoadingPlaceholder minHeight={240} />
  if (error) return <p style={{ color: '#ef4444' }}>{error}</p>

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <div>
          <h1 className="ops-page-title">{t('opsNavKommuner')}</h1>
          <p className="ops-page-lead" style={{ marginBottom: 0 }}>{t('opsKommunerLead')}</p>
        </div>
        <Link href="/ops/kommuner/new">
          <Button variant="primary">
            <Plus size={16} aria-hidden style={{ marginRight: 6 }} />
            {t('opsKommuneNew')}
          </Button>
        </Link>
      </div>
      <OpsGdprBanner />

      {items.length === 0 ? (
        <p className="ops-meta">{t('opsKommunerEmpty')}</p>
      ) : (
        <>
          <div className="ops-table-wrap ops-desktop-only">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>{t('opsKommuneName')}</th>
                  <th>{t('opsKommuneStatus')}</th>
                  <th>{t('opsKommuneHealth')}</th>
                  <th>{t('opsKommuneStaff')}</th>
                  <th>{t('opsKommuneListings')}</th>
                  <th>{t('opsKommuneMatchRate')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((k) => (
                  <tr key={k.id}>
                    <td>
                      <Link href={`/ops/kommuner/${k.slug}`} className="ops-link">
                        {k.display_name}
                      </Link>
                    </td>
                    <td>{t(opsKommuneStatusKey(k.status))}</td>
                    <td>
                      <span className={`ops-health-pill ${healthClass(k.health_metrics?.health ?? 'red')}`}>
                        {t(opsHealthKey(k.health_metrics?.health ?? 'red'))}
                      </span>
                    </td>
                    <td>{k.health_metrics?.staff_count ?? 0}</td>
                    <td>{k.health_metrics?.listings_matched ?? 0}</td>
                    <td>{k.health_metrics?.region_match_rate ?? 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ops-card-list ops-mobile-only">
            {items.map((k) => (
              <Link key={k.id} href={`/ops/kommuner/${k.slug}`} className="card ops-list-card" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                  <p className="ops-list-card-title">{k.display_name}</p>
                  <span className={`ops-health-pill ${healthClass(k.health_metrics?.health ?? 'red')}`}>
                    {t(opsHealthKey(k.health_metrics?.health ?? 'red'))}
                  </span>
                </div>
                <p className="ops-meta">
                  {t(opsKommuneStatusKey(k.status))} · {k.health_metrics?.staff_count ?? 0} {t('opsKommuneStaff').toLowerCase()} · {k.health_metrics?.listings_matched ?? 0} {t('opsKommuneListings').toLowerCase()}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
