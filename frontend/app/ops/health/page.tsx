'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '../../../context/LanguageContext'
import OpsPageHeader from '../components/OpsPageHeader'
import OpsGdprBanner from '../components/OpsGdprBanner'
import OpsKpiGrid from '../components/OpsKpiGrid'
import OpsPanel from '../components/OpsPanel'
import OpsBadge, { opsSecurityTone } from '../components/OpsBadge'
import { OpsPageSkeleton } from '../components/OpsSkeleton'
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

  if (loading) return <OpsPageSkeleton />

  return (
    <div className="ops-stack ops-stack--lg">
      <OpsPageHeader title={t('opsNavHealth')} lead={t('opsHealthLead')} />
      <OpsGdprBanner />

      <div className="ops-status-strip">
        {security ? (
          <OpsBadge tone={opsSecurityTone(security.status)} dot>
            {t(`opsSecurityStatus_${security.status}`)}
          </OpsBadge>
        ) : null}
        <label className="ops-field" style={{ flexDirection: 'row', alignItems: 'center', width: 'auto' }}>
          <span className="ops-meta">{t('opsHealthSince')}</span>
          <select
            className="ops-input"
            style={{ width: 'auto', minHeight: 36, padding: '4px 10px' }}
            value={sinceDays}
            onChange={(e) => setSinceDays(Number(e.target.value))}
          >
            <option value={1}>24h</option>
            <option value={7}>7d</option>
            <option value={30}>30d</option>
          </select>
        </label>
      </div>

      {overview ? (
        <>
          <OpsKpiGrid
            items={[
              { label: t('opsHealthErrors24h'), value: overview.funnel.errors_24h },
              { label: t('opsHealthWarnings24h'), value: overview.funnel.warnings_24h },
              { label: t('opsHealthSignInitiated'), value: overview.funnel.sign_initiated },
              { label: t('opsHealthSignCompleted'), value: overview.funnel.sign_completed },
            ]}
          />

          <OpsPanel title={t('opsHealthBySource')} padding="md">
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
          </OpsPanel>

          <OpsPanel title={t('opsHealthInbox')} padding="md">
            {overview.recent.length === 0 ? (
              <p className="ops-meta">{t('opsHealthInboxEmpty')}</p>
            ) : (
              <div className="ops-card-list">
                {overview.recent.map((ev) => (
                  <div key={ev.id} className="ops-list-card">
                    <div className="ops-list-card-head">
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
          </OpsPanel>
        </>
      ) : null}

      <OpsPanel title={t('opsHealthIntegrations')} padding="md" description={t('opsHealthIntegrationsHint')}>
        <Button variant="secondary" disabled={running} onClick={() => void runDiagnostics()}>
          {running ? t('opsRunning') : t('opsRunDiagnostics')}
        </Button>
        {report ? (
          <pre className="ops-diagnostics-pre" style={{ marginTop: 'var(--space-4)' }}>
            {JSON.stringify(report, null, 2)}
          </pre>
        ) : null}
      </OpsPanel>
    </div>
  )
}
