'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '../../../context/LanguageContext'
import OpsGdprBanner from '../components/OpsGdprBanner'
import LoadingPlaceholder from '../../components/LoadingPlaceholder'
import {
  opsGetDashboardStats,
  opsGetTimeSeries,
  opsGetFunnelStats,
  opsGetKommuneGrowthStats,
  type OpsDashboardStats,
  type OpsTimeSeries,
  type OpsFunnelStats,
  type OpsKommuneGrowthRow,
} from '../../lib/opsApi'

function MiniBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'var(--border-subtle)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-accent)' }} />
      </div>
    </div>
  )
}

function FunnelStep({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginBottom: 'var(--space-2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
        <span>{label}</span>
        <span>{value} ({pct}%)</span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: 'var(--border-subtle)', overflow: 'hidden', marginTop: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-accent)' }} />
      </div>
    </div>
  )
}

export default function OpsStatsPage() {
  const { t } = useLanguage()
  const [stats, setStats] = useState<OpsDashboardStats | null>(null)
  const [series, setSeries] = useState<OpsTimeSeries | null>(null)
  const [funnel, setFunnel] = useState<OpsFunnelStats | null>(null)
  const [kommuner, setKommuner] = useState<OpsKommuneGrowthRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [s, ts, f, k] = await Promise.all([
          opsGetDashboardStats(),
          opsGetTimeSeries(),
          opsGetFunnelStats(),
          opsGetKommuneGrowthStats(),
        ])
        if (!cancelled) {
          setStats(s)
          setSeries(ts)
          setFunnel(f)
          setKommuner(k)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <LoadingPlaceholder minHeight={240} />
  if (!stats || !series || !funnel) return <p>{t('pageLoadStuck')}</p>

  const signupMax = Math.max(1, ...series.signups_by_week.map((x) => x.count))
  const listingMax = Math.max(1, ...series.listings_by_week.map((x) => x.count))
  const termsMax = Math.max(1, ...series.terms_approved_by_week.map((x) => x.count))
  const funnelMax = funnel.users_total || 1

  return (
    <div>
      <h1 className="ops-page-title">{t('opsNavStats')}</h1>
      <p className="ops-page-lead">{t('opsStatsLead')}</p>
      <OpsGdprBanner />

      <div className="ops-kpi-grid" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="card ops-kpi-card">
          <p className="ops-kpi-label">{t('opsKpiTerminatedAgreements')}</p>
          <p className="ops-kpi-value">{stats.agreements_terminated}</p>
        </div>
        <div className="card ops-kpi-card">
          <p className="ops-kpi-label">{t('opsKpiResignPending')}</p>
          <p className="ops-kpi-value">{stats.resign_pending}</p>
        </div>
        <div className="card ops-kpi-card">
          <p className="ops-kpi-label">{t('opsKpiSign30d')}</p>
          <p className="ops-kpi-value">{stats.sign_events_30d}</p>
        </div>
        <div className="card ops-kpi-card">
          <p className="ops-kpi-label">{t('opsKpiTermsApproved')}</p>
          <p className="ops-kpi-value">{stats.terms_approved}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
        <section className="card" style={{ padding: 'var(--space-5)' }}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsStatsFunnel')}</h2>
          <FunnelStep label={t('opsFunnelUsers')} value={funnel.users_total} max={funnelMax} />
          <FunnelStep label={t('opsFunnelConfirmed')} value={funnel.users_confirmed} max={funnelMax} />
          <FunnelStep label={t('opsFunnelLandlords')} value={funnel.landlords} max={funnelMax} />
          <FunnelStep label={t('opsFunnelListings')} value={funnel.listings_total} max={funnelMax} />
          <FunnelStep label={t('opsFunnelSigned')} value={funnel.agreements_signed} max={funnelMax} />
          <p className="ops-meta" style={{ marginTop: 'var(--space-4)' }}>
            {t('opsFunnelSignInitiated')}: {funnel.sign_initiated_30d} · {t('opsFunnelSignCompleted')}: {funnel.sign_completed_30d}
          </p>
        </section>

        <section className="card" style={{ padding: 'var(--space-5)' }}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsStatsSignups')}</h2>
          {series.signups_by_week.length === 0 ? (
            <p className="ops-meta">{t('opsNoData')}</p>
          ) : (
            series.signups_by_week.map((row) => (
              <MiniBar key={row.week_start} label={row.week_start} value={row.count} max={signupMax} />
            ))
          )}
        </section>

        <section className="card" style={{ padding: 'var(--space-5)' }}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsStatsListings')}</h2>
          {series.listings_by_week.length === 0 ? (
            <p className="ops-meta">{t('opsNoData')}</p>
          ) : (
            series.listings_by_week.map((row) => (
              <MiniBar key={row.week_start} label={row.week_start} value={row.count} max={listingMax} />
            ))
          )}
        </section>

        <section className="card" style={{ padding: 'var(--space-5)' }}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsStatsTermsApprovedWeek')}</h2>
          {series.terms_approved_by_week.length === 0 ? (
            <p className="ops-meta">{t('opsNoData')}</p>
          ) : (
            series.terms_approved_by_week.map((row) => (
              <MiniBar key={row.week_start} label={row.week_start} value={row.count} max={termsMax} />
            ))
          )}
        </section>

        <section className="card" style={{ padding: 'var(--space-5)' }}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsStatsKommuneLeaderboard')}</h2>
          {kommuner.length === 0 ? (
            <p className="ops-meta">{t('opsNoData')}</p>
          ) : (
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>{t('opsKommuneName')}</th>
                    <th>{t('opsKommuneListings')}</th>
                    <th>{t('opsKpiLandlords')}</th>
                    <th>{t('opsKommuneStaff')}</th>
                  </tr>
                </thead>
                <tbody>
                  {kommuner.slice(0, 20).map((k) => (
                    <tr key={k.id}>
                      <td>
                        <Link href={`/ops/kommuner/${k.slug}`} className="ops-link">{k.display_name}</Link>
                      </td>
                      <td>{k.listings}</td>
                      <td>{k.landlords}</td>
                      <td>{k.staff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card" style={{ padding: 'var(--space-5)' }}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsStatsByRegion')}</h2>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>{t('opsRegion')}</th>
                  <th>{t('opsCount')}</th>
                </tr>
              </thead>
              <tbody>
                {series.listings_by_region.map((row) => (
                  <tr key={row.region}>
                    <td>{row.region}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
