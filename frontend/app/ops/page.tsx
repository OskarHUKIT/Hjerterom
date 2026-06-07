'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '../../context/LanguageContext'
import OpsKpiGrid from './components/OpsKpiGrid'
import OpsGdprBanner from './components/OpsGdprBanner'
import LoadingPlaceholder from '../components/LoadingPlaceholder'
import { Button } from '../components/ui/Button'
import { opsGetDashboardStats, opsGetSecuritySnapshot, opsListAuditEvents, type OpsDashboardStats, type OpsAuditItem } from '../lib/opsApi'
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
        const signAudit = await opsListAuditEvents('SIGN_', new Date(Date.now() - 7 * 86400000).toISOString(), 5, 0)
        if (!cancelled) {
          setRecent([...audit.items, ...signAudit.items].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 8))
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

  if (loading) {
    return <LoadingPlaceholder minHeight={240} />
  }

  if (error || !stats) {
    return <p style={{ color: '#ef4444' }}>{error || t('pageLoadStuck')}</p>
  }

  return (
    <div>
      <h1 className="ops-page-title">{t('opsNavDashboard')}</h1>
      <p className="ops-page-lead">{t('opsDashboardLead')}</p>
      <OpsGdprBanner />

      <div className="ops-status-strip">
        <span className={`ops-status-pill ops-status-pill--${securityStatus}`}>
          {t(`opsSecurityStatus_${securityStatus}`)}
        </span>
        {stats.terms_pending > 0 ? (
          <Link href="/ops/terms" className="ops-status-pill ops-status-pill--warning">
            {t('opsPendingTermsCount').replace('{count}', String(stats.terms_pending))}
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

      <div style={{ marginTop: 'var(--space-8)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
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

      {recent.length > 0 ? (
        <section style={{ marginTop: 'var(--space-8)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>{t('opsRecentEvents')}</h2>
          <div className="ops-card-list">
            {recent.map((row) => (
              <div key={row.id} className="card ops-list-card">
                <p className="ops-list-card-title">{row.action_type}</p>
                <p className="ops-meta">{formatDateTimeNo(row.created_at)}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
