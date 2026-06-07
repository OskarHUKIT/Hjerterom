'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '../../../context/LanguageContext'
import OpsGdprBanner from '../components/OpsGdprBanner'
import OpsPageHeader from '../components/OpsPageHeader'
import OpsPanel from '../components/OpsPanel'
import OpsBadge, { opsSecurityTone } from '../components/OpsBadge'
import OpsChecklist from '../components/OpsChecklist'
import OpsEmptyState from '../components/OpsEmptyState'
import { OpsCardSkeleton } from '../components/OpsSkeleton'
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

  const checklist = [
    t('opsCheckNoPublicDiagnostics'),
    t('opsCheckNoServiceRoleInClient'),
    t('opsCheckCronSecret'),
    t('opsCheckAuthSmtp'),
  ]

  if (loading) return <OpsCardSkeleton count={3} />

  return (
    <div className="ops-stack ops-stack--lg">
      <OpsPageHeader title={t('opsNavSecurity')} lead={t('opsSecurityLead')} />
      <OpsGdprBanner />

      {snapshot ? (
        <div className="ops-status-strip">
          <OpsBadge tone={opsSecurityTone(snapshot.status)}>
            {t(`opsSecurityStatus_${snapshot.status}`)}
          </OpsBadge>
          <span className="ops-meta">
            {t('opsSignLastHour')}: {snapshot.sign_initiated_last_hour}
          </span>
          <span className="ops-meta">
            {t('opsOpsEvents24h')}: {snapshot.ops_events_last_24h}
          </span>
        </div>
      ) : null}

      <OpsPanel
        title={t('opsSecurityChecklist')}
        actions={
          <Button variant="primary" onClick={() => void runDiagnostics()} disabled={running}>
            {running ? t('loadingPleaseWait') : t('opsRunDiagnostics')}
          </Button>
        }
      >
        <OpsChecklist items={checklist} />
        {report ? (
          <pre className="ops-diagnostics-pre">{JSON.stringify(report, null, 2)}</pre>
        ) : null}
      </OpsPanel>

      {snapshot?.warnings?.length ? (
        <OpsPanel title={t('opsWarnings')}>
          <div className="ops-card-list">
            {snapshot.warnings.map((w) => (
              <article key={w.code} className="ops-list-card ops-list-card--warn">
                <p className="ops-list-card-title">{w.code}</p>
                <p className="ops-meta">{w.message}</p>
              </article>
            ))}
          </div>
        </OpsPanel>
      ) : null}

      <OpsPanel title={t('opsAuditLog')}>
        {audit.length === 0 ? (
          <OpsEmptyState title={t('opsNoAuditEvents')} />
        ) : (
          <div className="ops-card-list">
            {audit.map((row) => (
              <article key={row.id} className="ops-list-card">
                <p className="ops-list-card-title">{row.action_type}</p>
                <p className="ops-meta">{formatDateTimeNo(row.created_at)}</p>
              </article>
            ))}
          </div>
        )}
      </OpsPanel>
    </div>
  )
}
