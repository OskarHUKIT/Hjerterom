'use client'

import { useCallback, useEffect, useState } from 'react'
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
  opsGetSecuritySnapshot,
  opsListAuditEvents,
  type OpsAuditItem,
  type OpsSecuritySnapshot,
} from '../../lib/opsApi'
import { formatDateTimeNo } from '../../lib/dateFormat'

export default function OpsSecurityPage() {
  const { t } = useLanguage()
  const [snapshot, setSnapshot] = useState<OpsSecuritySnapshot | null>(null)
  const [audit, setAudit] = useState<OpsAuditItem[]>([])
  const [report, setReport] = useState<SupabaseDiagnosticReport | null>(null)
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sec, events] = await Promise.all([
        opsGetSecuritySnapshot(),
        opsListAuditEvents('OPS_', new Date(Date.now() - 30 * 86400000).toISOString(), 30, 0),
      ])
      setSnapshot(sec)
      setAudit(events.items)
    } finally {
      setLoading(false)
    }
  }, [])

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
      <h1 className="ops-page-title">{t('opsNavSecurity')}</h1>
      <p className="ops-page-lead">{t('opsSecurityLead')}</p>
      <OpsGdprBanner />

      {snapshot ? (
        <div className="ops-status-strip">
          <span className={`ops-status-pill ops-status-pill--${snapshot.status}`}>
            {t(`opsSecurityStatus_${snapshot.status}`)}
          </span>
          <span className="ops-meta">
            {t('opsSignLastHour')}: {snapshot.sign_initiated_last_hour}
          </span>
          <span className="ops-meta">
            {t('opsOpsEvents24h')}: {snapshot.ops_events_last_24h}
          </span>
        </div>
      ) : null}

      <section className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
        <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsSecurityChecklist')}</h2>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6 }}>
          <li>{t('opsCheckNoPublicDiagnostics')}</li>
          <li>{t('opsCheckNoServiceRoleInClient')}</li>
          <li>{t('opsCheckCronSecret')}</li>
          <li>{t('opsCheckAuthSmtp')}</li>
        </ul>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button variant="primary" onClick={() => void runDiagnostics()} disabled={running}>
            {running ? t('loadingPleaseWait') : t('opsRunDiagnostics')}
          </Button>
        </div>
        {report ? (
          <pre
            style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-4)',
              borderRadius: 10,
              background: 'var(--bg-app)',
              overflow: 'auto',
              fontSize: '0.8rem',
            }}
          >
            {JSON.stringify(report, null, 2)}
          </pre>
        ) : null}
      </section>

      {snapshot?.warnings?.length ? (
        <section className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsWarnings')}</h2>
          <div className="ops-card-list">
            {snapshot.warnings.map((w) => (
              <div key={w.code} className="ops-list-card">
                <p className="ops-list-card-title">{w.code}</p>
                <p className="ops-meta">{w.message}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 style={{ fontSize: '1rem' }}>{t('opsAuditLog')}</h2>
        <div className="ops-card-list">
          {audit.map((row) => (
            <div key={row.id} className="card ops-list-card">
              <p className="ops-list-card-title">{row.action_type}</p>
              <p className="ops-meta">{formatDateTimeNo(row.created_at)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
