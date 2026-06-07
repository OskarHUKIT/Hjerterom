'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '../../../context/LanguageContext'
import OpsPageHeader from '../components/OpsPageHeader'
import OpsPanel from '../components/OpsPanel'
import OpsAlert from '../components/OpsAlert'
import OpsGdprBanner from '../components/OpsGdprBanner'
import { OpsPageSkeleton } from '../components/OpsSkeleton'
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
    <div className="ops-chart-bar">
      <div className="ops-chart-bar-head">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="ops-chart-bar-track">
        <div className="ops-chart-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function FunnelStep({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="ops-chart-bar">
      <div className="ops-chart-bar-head">
        <span>{label}</span>
        <span>{value} ({pct}%)</span>
      </div>
      <div className="ops-chart-bar-track ops-chart-bar-track--tall">
        <div className="ops-chart-bar-fill" style={{ width: `${pct}%` }} />
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

  if (loading) return <OpsPageSkeleton />
  if (!stats || !series || !funnel) return <OpsAlert tone="error">{t('pageLoadStuck')}</OpsAlert>

  const signupMax = Math.max(1, ...series.signups_by_week.map((x) => x.count))
  const listingMax = Math.max(1, ...series.listings_by_week.map((x) => x.count))
  const termsMax = Math.max(1, ...series.terms_approved_by_week.map((x) => x.count))
  const funnelMax = funnel.users_total || 1

  return (
    <div className="ops-stack ops-stack--lg">
      <OpsPageHeader title={t('opsNavStats')} lead={t('opsStatsLead')} />
      <OpsGdprBanner />

      <div className="ops-kpi-grid">
        <div className="ops-kpi-card">
          <p className="ops-kpi-label">{t('opsKpiTerminatedAgreements')}</p>
          <p className="ops-kpi-value">{stats.agreements_terminated}</p>
        </div>
        <div className="ops-kpi-card">
          <p className="ops-kpi-label">{t('opsKpiResignPending')}</p>
          <p className="ops-kpi-value">{stats.resign_pending}</p>
        </div>
        <div className="ops-kpi-card">
          <p className="ops-kpi-label">{t('opsKpiSign30d')}</p>
          <p className="ops-kpi-value">{stats.sign_events_30d}</p>
        </div>
        <div className="ops-kpi-card">
          <p className="ops-kpi-label">{t('opsKpiTermsApproved')}</p>
          <p className="ops-kpi-value">{stats.terms_approved}</p>
        </div>
      </div>

      <div className="ops-stack">
        <OpsPanel title={t('opsStatsFunnel')} padding="md">
          <FunnelStep label={t('opsFunnelUsers')} value={funnel.users_total} max={funnelMax} />
          <FunnelStep label={t('opsFunnelConfirmed')} value={funnel.users_confirmed} max={funnelMax} />
          <FunnelStep label={t('opsFunnelLandlords')} value={funnel.landlords} max={funnelMax} />
          <FunnelStep label={t('opsFunnelListings')} value={funnel.listings_total} max={funnelMax} />
          <FunnelStep label={t('opsFunnelSigned')} value={funnel.agreements_signed} max={funnelMax} />
          <p className="ops-meta" style={{ marginTop: 'var(--space-4)' }}>
            {t('opsFunnelSignInitiated')}: {funnel.sign_initiated_30d} · {t('opsFunnelSignCompleted')}:{' '}
            {funnel.sign_completed_30d}
          </p>
        </OpsPanel>

        <OpsPanel title={t('opsStatsSignups')} padding="md">
          {series.signups_by_week.length === 0 ? (
            <p className="ops-meta">{t('opsNoData')}</p>
          ) : (
            series.signups_by_week.map((row) => (
              <MiniBar key={row.week_start} label={row.week_start} value={row.count} max={signupMax} />
            ))
          )}
        </OpsPanel>

        <OpsPanel title={t('opsStatsListings')} padding="md">
          {series.listings_by_week.length === 0 ? (
            <p className="ops-meta">{t('opsNoData')}</p>
          ) : (
            series.listings_by_week.map((row) => (
              <MiniBar key={row.week_start} label={row.week_start} value={row.count} max={listingMax} />
            ))
          )}
        </OpsPanel>

        <OpsPanel title={t('opsStatsTermsApprovedWeek')} padding="md">
          {series.terms_approved_by_week.length === 0 ? (
            <p className="ops-meta">{t('opsNoData')}</p>
          ) : (
            series.terms_approved_by_week.map((row) => (
              <MiniBar key={row.week_start} label={row.week_start} value={row.count} max={termsMax} />
            ))
          )}
        </OpsPanel>

        <OpsPanel title={t('opsStatsKommuneLeaderboard')} padding="md">
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
                        <Link href={`/ops/kommuner/${k.slug}`} className="ops-link">
                          {k.display_name}
                        </Link>
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
        </OpsPanel>

        <OpsPanel title={t('opsStatsByRegion')} padding="md">
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
        </OpsPanel>
      </div>
    </div>
  )
}
