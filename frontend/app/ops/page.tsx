'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '../../context/LanguageContext'
import OpsKpiGrid from './components/OpsKpiGrid'
import OpsGdprBanner from './components/OpsGdprBanner'
import OpsPageHeader from './components/OpsPageHeader'
import OpsPanel from './components/OpsPanel'
import OpsBadge, { opsSecurityTone } from './components/OpsBadge'
import OpsAlert from './components/OpsAlert'
import { OpsPageSkeleton } from './components/OpsSkeleton'
import { Button } from '../components/ui/Button'
import {
  opsGetDashboardStats,
  opsGetSecuritySnapshot,
  opsListAuditEvents,
  type OpsDashboardStats,
  type OpsAuditItem,
} from '../lib/opsApi'
import { formatDateTimeNo } from '../lib/dateFormat'

export default function OpsDashboardPage() {
  const { t } = useLanguage()
  const [stats, setStats] = useState<OpsDashboardStats | null>(null)
  const [securityStatus, setSecurityStatus] = useState<'ok' | 'warning' | 'critical'>('ok')
  const [recent, setRecent] = useState<OpsAuditItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const [s, sec, audit] = await Promise.all([
          opsGetDashboardStats(),
          opsGetSecuritySnapshot(),
          opsListAuditEvents('OPS_', new Date(Date.now() - 7 * 86400000).toISOString(), 8, 0),
        ])
        if (cancelled) return
        setStats(s)
        setSecurityStatus(sec.status)
        const signAudit = await opsListAuditEvents(
          'SIGN_',
          new Date(Date.now() - 7 * 86400000).toISOString(),
          5,
          0
        )
        if (!cancelled) {
          setRecent(
            [...audit.items, ...signAudit.items]
              .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
              .slice(0, 8)
          )
        }
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

  if (loading) return <OpsPageSkeleton />
  if (error || !stats) {
    return <OpsAlert tone="error">{error || t('pageLoadStuck')}</OpsAlert>
  }

  return (
    <div className="ops-stack ops-stack--lg">
      <OpsPageHeader title={t('opsNavDashboard')} lead={t('opsDashboardLead')} />
      <OpsGdprBanner />

      <div className="ops-status-strip">
        <OpsBadge tone={opsSecurityTone(securityStatus)} dot>
          {t(`opsSecurityStatus_${securityStatus}`)}
        </OpsBadge>
        {stats.terms_pending > 0 ? (
          <Link href="/ops/terms">
            <OpsBadge tone="warning" dot>
              {t('opsPendingTermsCount').replace('{count}', String(stats.terms_pending))}
            </OpsBadge>
          </Link>
        ) : null}
      </div>

      <OpsKpiGrid
        items={[
          { label: t('opsKpiUsers'), value: stats.users_total },
          { label: t('opsKpiLandlords'), value: stats.users_homeowner },
          { label: t('opsKpiKommuneStaff'), value: stats.users_kommune_staff },
          { label: t('opsKpiListings'), value: stats.listings_total },
          { label: t('opsKpiActiveAgreements'), value: stats.agreements_active },
          { label: t('opsKpiPendingTerms'), value: stats.terms_pending },
          { label: t('opsKpiSign7d'), value: stats.sign_events_7d },
          { label: t('opsKpiOperators'), value: stats.operators_active },
        ]}
      />

      <OpsPanel title={t('opsQuickActions')} padding="md">
        <div className="ops-actions-row">
          <Link href="/ops/platform">
            <Button variant="accent">{t('opsNavPlatform')}</Button>
          </Link>
          <Link href="/ops/terms">
            <Button variant="primary">{t('opsGoTermsQueue')}</Button>
          </Link>
          <Link href="/ops/accounts">
            <Button variant="secondary">{t('opsGoAccounts')}</Button>
          </Link>
          <Link href="/ops/kommuner">
            <Button variant="secondary">{t('opsNavKommuner')}</Button>
          </Link>
          <Link href="/ops/health">
            <Button variant="secondary">{t('opsNavHealth')}</Button>
          </Link>
          <Link href="/ops/security">
            <Button variant="secondary">{t('opsGoSecurity')}</Button>
          </Link>
        </div>
      </OpsPanel>

      {recent.length > 0 ? (
        <OpsPanel title={t('opsAuditTrail')} padding="md">
          <div className="ops-table-wrap" style={{ maxHeight: 360 }}>
            <table className="ops-table">
              <thead>
                <tr>
                  <th>{t('opsSource')}</th>
                  <th>{t('opsCreated')}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="ops-list-card-title" style={{ fontSize: '0.875rem' }}>
                        {row.action_type}
                      </span>
                    </td>
                    <td className="ops-meta">{formatDateTimeNo(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </OpsPanel>
      ) : null}
    </div>
  )
}
