'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useLanguage } from '../../../../context/LanguageContext'
import OpsGdprBanner from '../../components/OpsGdprBanner'
import LoadingPlaceholder from '../../../components/LoadingPlaceholder'
import { Button } from '../../../components/ui/Button'
import { formatDateTimeNo } from '../../../lib/dateFormat'
import {
  opsGetKommuneDetail,
  opsSetKommuneStatus,
  opsBulkWhitelist,
  opsDeactivateWhitelist,
  opsUpsertDpo,
  opsRegionMismatchReport,
  type OpsKommuneDetail,
  type OpsRegionMismatch,
} from '../../../lib/opsApi'
import { opsHealthKey, opsKommuneStatusKey } from '../../../lib/opsLabels'

type Tab = 'overview' | 'people' | 'access' | 'terms' | 'compliance' | 'regions' | 'activity'

function healthClass(h: string) {
  if (h === 'green') return 'ops-health-pill--green'
  if (h === 'amber') return 'ops-health-pill--amber'
  return 'ops-health-pill--red'
}

export default function OpsKommuneDetailPage() {
  const params = useParams()
  const slug = typeof params.slug === 'string' ? params.slug : ''
  const { t } = useLanguage()
  const [tab, setTab] = useState<Tab>('overview')
  const [detail, setDetail] = useState<OpsKommuneDetail | null>(null)
  const [mismatches, setMismatches] = useState<OpsRegionMismatch[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [whitelistRaw, setWhitelistRaw] = useState('')
  const [dpoEmail, setDpoEmail] = useState('')
  const [dpoName, setDpoName] = useState('')
  const [dpoPhone, setDpoPhone] = useState('')

  const load = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setError(null)
    try {
      const d = await opsGetKommuneDetail(slug)
      setDetail(d)
      setDpoEmail(d.dpo?.dpo_email ?? '')
      setDpoName(d.dpo?.dpo_name ?? '')
      setDpoPhone(d.dpo?.dpo_phone ?? '')
      const mm = await opsRegionMismatchReport(d.kommune.id, 50)
      setMismatches(mm)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    void load()
  }, [load])

  const setStatus = async (status: string) => {
    if (!slug) return
    setBusy(true)
    try {
      await opsSetKommuneStatus(slug, status)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
    } finally {
      setBusy(false)
    }
  }

  const addWhitelist = async () => {
    if (!detail) return
    const emails = whitelistRaw
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes('@'))
    if (emails.length === 0) return
    setBusy(true)
    try {
      await opsBulkWhitelist(detail.kommune.id, emails)
      setWhitelistRaw('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
    } finally {
      setBusy(false)
    }
  }

  const deactivate = async (id: string) => {
    setBusy(true)
    try {
      await opsDeactivateWhitelist(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
    } finally {
      setBusy(false)
    }
  }

  const saveDpo = async () => {
    if (!detail || !dpoEmail.trim()) return
    setBusy(true)
    try {
      await opsUpsertDpo(detail.kommune.id, dpoEmail.trim(), dpoName.trim() || null, dpoPhone.trim() || null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingPlaceholder minHeight={240} />
  if (error || !detail) return <p style={{ color: '#ef4444' }}>{error || t('pageLoadStuck')}</p>

  const k = detail.kommune
  const h = detail.health_metrics
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: t('opsTabOverview') },
    { id: 'people', label: t('opsTabPeople') },
    { id: 'access', label: t('opsTabAccess') },
    { id: 'terms', label: t('opsTabTerms') },
    { id: 'compliance', label: t('opsTabCompliance') },
    { id: 'regions', label: t('opsTabRegions') },
    { id: 'activity', label: t('opsTabActivity') },
  ]

  return (
    <div>
      <p className="ops-meta" style={{ marginBottom: 'var(--space-2)' }}>
        <Link href="/ops/kommuner" className="ops-link">{t('opsNavKommuner')}</Link>
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
        <div>
          <h1 className="ops-page-title">{k.display_name}</h1>
          <p className="ops-page-lead" style={{ marginBottom: 'var(--space-2)' }}>
            {t(opsKommuneStatusKey(k.status))} · {k.slug}
          </p>
          <span className={`ops-health-pill ${healthClass(h.health)}`}>{t(opsHealthKey(h.health))}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {k.status !== 'active' ? (
            <Button variant="primary" disabled={busy} onClick={() => void setStatus('active')}>
              {t('opsKommuneMarkActive')}
            </Button>
          ) : null}
          {k.status !== 'pilot' && k.status !== 'active' ? (
            <Button variant="secondary" disabled={busy} onClick={() => void setStatus('pilot')}>
              {t('opsKommuneMarkPilot')}
            </Button>
          ) : null}
          {k.status !== 'suspended' ? (
            <Button variant="secondary" disabled={busy} onClick={() => void setStatus('suspended')}>
              {t('opsKommuneSuspend')}
            </Button>
          ) : (
            <Button variant="secondary" disabled={busy} onClick={() => void setStatus('active')}>
              {t('opsKommuneReactivate')}
            </Button>
          )}
        </div>
      </div>
      <OpsGdprBanner />

      <div className="ops-tabs" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`ops-tab${tab === item.id ? ' ops-tab--active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="ops-kpi-grid" style={{ marginTop: 'var(--space-4)' }}>
          <div className="card ops-kpi-card">
            <p className="ops-kpi-label">{t('opsKommuneStaff')}</p>
            <p className="ops-kpi-value">{h.staff_count}</p>
            <p className="ops-kpi-hint">{t('opsKommuneAdmins')}: {h.admin_count}</p>
          </div>
          <div className="card ops-kpi-card">
            <p className="ops-kpi-label">{t('opsKommuneListings')}</p>
            <p className="ops-kpi-value">{h.listings_matched}</p>
            <p className="ops-kpi-hint">{t('opsKommuneMatchRate')}: {h.region_match_rate}%</p>
          </div>
          <div className="card ops-kpi-card">
            <p className="ops-kpi-label">{t('opsKommuneTermsApproved')}</p>
            <p className="ops-kpi-value">{h.terms_approved}</p>
            <p className="ops-kpi-hint">{t('opsKpiPendingTerms')}: {h.terms_pending}</p>
          </div>
          <div className="card ops-kpi-card">
            <p className="ops-kpi-label">{t('opsKommuneSign7d')}</p>
            <p className="ops-kpi-value">{h.sign_completed_7d}/{h.sign_initiated_7d}</p>
          </div>
          <div className="card ops-kpi-card">
            <p className="ops-kpi-label">{t('opsKommuneDpo')}</p>
            <p className="ops-kpi-value" style={{ fontSize: '1rem' }}>
              {h.has_dpo ? t('opsKommuneDpoOk') : h.dpo_fallback_only ? t('opsKommuneDpoFallback') : t('opsKommuneDpoMissing')}
            </p>
          </div>
        </div>
      ) : null}

      {tab === 'people' ? (
        <section style={{ marginTop: 'var(--space-4)' }}>
          {detail.staff.length === 0 ? (
            <p className="ops-meta">{t('opsKommuneNoStaff')}</p>
          ) : (
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>{t('opsName')}</th>
                    <th>{t('opsEmail')}</th>
                    <th>{t('opsRole')}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.staff.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link href={`/ops/accounts/${s.id}`} className="ops-link">{s.full_name}</Link>
                      </td>
                      <td>{s.email_masked}</td>
                      <td>{s.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {tab === 'access' ? (
        <section style={{ marginTop: 'var(--space-4)' }}>
          <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ marginTop: 0, fontSize: '0.95rem' }}>{t('opsBulkWhitelist')}</h3>
            <textarea className="ops-input" rows={3} value={whitelistRaw} onChange={(e) => setWhitelistRaw(e.target.value)} placeholder="email@kommune.no" />
            <Button variant="primary" disabled={busy} style={{ marginTop: 'var(--space-3)' }} onClick={() => void addWhitelist()}>
              {t('opsAddWhitelist')}
            </Button>
          </div>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>{t('opsEmail')}</th>
                  <th>{t('opsStatus')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {detail.whitelist.map((w) => (
                  <tr key={w.id}>
                    <td>{w.email}</td>
                    <td>{w.is_active ? t('opsActive') : t('opsInactive')}</td>
                    <td>
                      {w.is_active ? (
                        <Button variant="secondary" disabled={busy} onClick={() => void deactivate(w.id)}>
                          {t('opsDeactivate')}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === 'terms' ? (
        <section style={{ marginTop: 'var(--space-4)' }}>
          <Link href="/ops/terms" className="ops-link">{t('opsGoTermsQueue')}</Link>
          <div className="ops-table-wrap" style={{ marginTop: 'var(--space-4)' }}>
            <table className="ops-table">
              <thead>
                <tr>
                  <th>{t('opsTermsTitle')}</th>
                  <th>{t('opsVersion')}</th>
                  <th>{t('opsStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {detail.terms.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.title}</td>
                    <td>{doc.version}</td>
                    <td>{doc.approved_for_utleier_signing ? t('opsApproved') : t('opsPending')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === 'compliance' ? (
        <section className="card" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-4)' }}>
          <h3 style={{ marginTop: 0, fontSize: '0.95rem' }}>{t('opsTabCompliance')}</h3>
          <div className="ops-form-stack">
            <label>
              {t('opsDpoEmail')}
              <input className="ops-input" type="email" value={dpoEmail} onChange={(e) => setDpoEmail(e.target.value)} />
            </label>
            <label>
              {t('opsDpoName')}
              <input className="ops-input" value={dpoName} onChange={(e) => setDpoName(e.target.value)} />
            </label>
            <label>
              {t('opsDpoPhone')}
              <input className="ops-input" value={dpoPhone} onChange={(e) => setDpoPhone(e.target.value)} />
            </label>
          </div>
          <Button variant="primary" disabled={busy} style={{ marginTop: 'var(--space-3)' }} onClick={() => void saveDpo()}>
            {t('opsSave')}
          </Button>
        </section>
      ) : null}

      {tab === 'regions' ? (
        <section style={{ marginTop: 'var(--space-4)' }}>
          <p className="ops-meta">{t('opsRegionMismatchLead')}</p>
          <p className="ops-meta">{t('opsKommuneRegionKeys')}: {k.region_keys.join(', ')}</p>
          {mismatches.length === 0 ? (
            <p className="ops-meta">{t('opsRegionMismatchNone')}</p>
          ) : (
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>{t('opsAddress')}</th>
                    <th>{t('opsCity')}</th>
                    <th>{t('opsNormalized')}</th>
                  </tr>
                </thead>
                <tbody>
                  {mismatches.map((m) => (
                    <tr key={m.id}>
                      <td>{m.address ?? '—'}</td>
                      <td>{m.city ?? '—'}</td>
                      <td>{m.city_normalized}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {tab === 'activity' ? (
        <section style={{ marginTop: 'var(--space-4)' }}>
          {detail.recent_events.length === 0 ? (
            <p className="ops-meta">{t('opsNoEvents')}</p>
          ) : (
            <div className="ops-card-list">
              {detail.recent_events.map((ev) => (
                <div key={ev.id} className="card ops-list-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                    <p className="ops-list-card-title">{ev.code}</p>
                    <span className={`ops-health-pill ops-health-pill--${ev.severity === 'error' ? 'red' : ev.severity === 'warn' ? 'amber' : 'green'}`}>
                      {ev.severity}
                    </span>
                  </div>
                  <p className="ops-meta">{ev.message}</p>
                  <p className="ops-meta">{formatDateTimeNo(ev.created_at)} · {ev.source}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
