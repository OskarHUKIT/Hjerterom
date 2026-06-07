'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '../../../context/LanguageContext'
import OpsGdprBanner from '../components/OpsGdprBanner'
import LoadingPlaceholder from '../../components/LoadingPlaceholder'
import { Button } from '../../components/ui/Button'
import {
  runSupabaseDiagnostics,
  measureGetSessionMs,
  type SupabaseDiagnosticReport,
} from '../../lib/supabaseDiagnostics'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import {
  opsGetErrorOverview,
  opsGetSecuritySnapshot,
  type OpsErrorOverview,
  type OpsSecuritySnapshot,
} from '../../lib/opsApi'
import { formatDateTimeNo } from '../../lib/dateFormat'

function severityClass(s: string) {
  if (s === 'error') return 'ops-health-pill--red'
  if (s === 'warn') return 'ops-health-pill--amber'
  return 'ops-health-pill--green'
}

export default function OpsHealthPage() {
  const { t } = useLanguage()
  const [overview, setOverview] = useState<OpsErrorOverview | null>(null)
  const [security, setSecurity] = useState<OpsSecuritySnapshot | null>(null)
  const [report, setReport] = useState<SupabaseDiagnosticReport | null>(null)
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sinceDays, setSinceDays] = useState(7)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const since = new Date(Date.now() - sinceDays * 86400000).toISOString()
      const [ov, sec] = await Promise.all([
        opsGetErrorOverview(since, null, 50),
        opsGetSecuritySnapshot(),
      ])
      setOverview(ov)
      setSecurity(sec)
    } finally {
      setLoading(false)
    }
  }, [sinceDays])

  useEffect(() => {
    void load()
  }, [load])

  const runDiagnostics = async () => {
    setRunning(true)
    try {
      const r = await runSupabaseDiagnostics()
      setReport(r)
      if (isSupabaseConfigured) {
        await measureGetSessionMs(supabase)
      }
    } finally {
      setRunning(false)
    }
  }

  if (loading) return <LoadingPlaceholder minHeight={240} />

  return (
    <div>
      <h1 className="ops-page-title">{t('opsNavHealth')}</h1>
      <p className="ops-page-lead">{t('opsHealthLead')}</p>
      <OpsGdprBanner />

      <div className="ops-status-strip">
        {security ? (
          <span className={`ops-status-pill ops-status-pill--${security.status}`}>
            {t(`opsSecurityStatus_${security.status}`)}
          </span>
        ) : null}
        <label className="ops-meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {t('opsHealthSince')}
          <select className="ops-input" style={{ width: 'auto', padding: '4px 8px' }} value={sinceDays} onChange={(e) => setSinceDays(Number(e.target.value))}>
            <option value={1}>24h</option>
            <option value={7}>7d</option>
            <option value={30}>30d</option>
          </select>
        </label>
      </div>

      {overview ? (
        <>
          <div className="ops-kpi-grid" style={{ marginTop: 'var(--space-4)' }}>
            <div className="card ops-kpi-card">
              <p className="ops-kpi-label">{t('opsHealthErrors24h')}</p>
              <p className="ops-kpi-value">{overview.funnel.errors_24h}</p>
            </div>
            <div className="card ops-kpi-card">
              <p className="ops-kpi-label">{t('opsHealthWarnings24h')}</p>
              <p className="ops-kpi-value">{overview.funnel.warnings_24h}</p>
            </div>
            <div className="card ops-kpi-card">
              <p className="ops-kpi-label">{t('opsHealthSignInitiated')}</p>
              <p className="ops-kpi-value">{overview.funnel.sign_initiated}</p>
            </div>
            <div className="card ops-kpi-card">
              <p className="ops-kpi-label">{t('opsHealthSignCompleted')}</p>
              <p className="ops-kpi-value">{overview.funnel.sign_completed}</p>
            </div>
          </div>

          <section className="card" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-6)' }}>
            <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsHealthBySource')}</h2>
            {overview.by_source.length === 0 ? (
              <p className="ops-meta">{t('opsNoData')}</p>
            ) : (
              <div className="ops-table-wrap">
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>{t('opsSource')}</th>
                      <th>{t('opsCount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.by_source.map((row) => (
                      <tr key={row.source}>
                        <td>{row.source}</td>
                        <td>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-6)' }}>
            <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsHealthInbox')}</h2>
            {overview.recent.length === 0 ? (
              <p className="ops-meta">{t('opsHealthInboxEmpty')}</p>
            ) : (
              <div className="ops-card-list">
                {overview.recent.map((ev) => (
                  <div key={ev.id} className="card ops-list-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <p className="ops-list-card-title">{ev.code}</p>
                      <span className={`ops-health-pill ${severityClass(ev.severity)}`}>{ev.severity}</span>
                    </div>
                    <p className="ops-meta">{ev.message}</p>
                    <p className="ops-meta">
                      {formatDateTimeNo(ev.created_at)} · {ev.source}
                      {ev.kommune_slug ? (
                        <> · <Link href={`/ops/kommuner/${ev.kommune_slug}`} className="ops-link">{ev.kommune_name}</Link></>
                      ) : null}
                      {ev.user_id ? (
                        <> · <Link href={`/ops/accounts/${ev.user_id}`} className="ops-link">{t('opsAccount')}</Link></>
                      ) : null}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      <section className="card" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-6)' }}>
        <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsHealthIntegrations')}</h2>
        <p className="ops-meta">{t('opsHealthIntegrationsHint')}</p>
        <Button variant="secondary" disabled={running} onClick={() => void runDiagnostics()}>
          {running ? t('opsRunning') : t('opsRunDiagnostics')}
        </Button>
        {report ? (
          <pre className="ops-diagnostics-pre" style={{ marginTop: 'var(--space-4)' }}>
            {JSON.stringify(report, null, 2)}
          </pre>
        ) : null}
      </section>
    </div>
  )
}
