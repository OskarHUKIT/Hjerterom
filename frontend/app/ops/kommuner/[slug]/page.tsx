'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useLanguage } from '../../../../context/LanguageContext'
import OpsGdprBanner from '../../components/OpsGdprBanner'
import OpsPageHeader from '../../components/OpsPageHeader'
import OpsPanel from '../../components/OpsPanel'
import OpsTabs from '../../components/OpsTabs'
import OpsKpiGrid from '../../components/OpsKpiGrid'
import OpsBadge, { opsHealthTone, opsKommuneStatusTone, opsSeverityTone } from '../../components/OpsBadge'
import OpsAlert from '../../components/OpsAlert'
import OpsEmptyState from '../../components/OpsEmptyState'
import OpsDataTable from '../../components/OpsDataTable'
import { OpsTableSkeleton } from '../../components/OpsSkeleton'
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
    setError(null)
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
    setError(null)
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
    setError(null)
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
    setError(null)
    try {
      await opsUpsertDpo(detail.kommune.id, dpoEmail.trim(), dpoName.trim() || null, dpoPhone.trim() || null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
    } finally {
      setBusy(false)
    }
  }

  const tabs = useMemo(() => {
    if (!detail) return []
    const h = detail.health_metrics
    return [
      { id: 'overview' as const, label: t('opsTabOverview') },
      { id: 'people' as const, label: t('opsTabPeople'), badge: detail.staff.length },
      { id: 'access' as const, label: t('opsTabAccess'), badge: detail.whitelist.filter((w) => w.is_active).length },
      { id: 'terms' as const, label: t('opsTabTerms'), badge: h.terms_pending || undefined },
      { id: 'compliance' as const, label: t('opsTabCompliance') },
      { id: 'regions' as const, label: t('opsTabRegions'), badge: mismatches.length || undefined },
      { id: 'activity' as const, label: t('opsTabActivity'), badge: detail.recent_events.length || undefined },
    ]
  }, [detail, mismatches.length, t])

  if (loading) return <OpsTableSkeleton rows={6} cols={4} />
  if (error && !detail) return <OpsAlert tone="error">{error}</OpsAlert>
  if (!detail) return <OpsAlert tone="error">{t('pageLoadStuck')}</OpsAlert>

  const k = detail.kommune
  const h = detail.health_metrics
  const dpoStatus =
    h.has_dpo ? t('opsKommuneDpoOk') : h.dpo_fallback_only ? t('opsKommuneDpoFallback') : t('opsKommuneDpoMissing')

  return (
    <div className="ops-stack ops-stack--lg">
      <OpsPageHeader
        breadcrumb={
          <Link href="/ops/kommuner" className="ops-link ops-breadcrumb-link">
            <ArrowLeft size={14} aria-hidden className="ops-icon-inline" />
            {t('opsNavKommuner')}
          </Link>
        }
        title={k.display_name}
        lead={
          <>
            <OpsBadge tone={opsKommuneStatusTone(k.status)}>{t(opsKommuneStatusKey(k.status))}</OpsBadge>
            <span className="ops-meta"> · {k.slug}</span>
            <span className="ops-meta"> · </span>
            <OpsBadge tone={opsHealthTone(h.health)}>{t(opsHealthKey(h.health))}</OpsBadge>
          </>
        }
        actions={
          <div className="ops-inline-actions">
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
        }
      />
      <OpsGdprBanner />
      {error ? <OpsAlert tone="error">{error}</OpsAlert> : null}

      <OpsTabs tabs={tabs} active={tab} onChange={setTab} ariaLabel={k.display_name} />

      {tab === 'overview' ? (
        <div className="ops-tab-panel">
          <OpsKpiGrid
            items={[
              {
                label: t('opsKommuneStaff'),
                value: h.staff_count,
                hint: `${t('opsKommuneAdmins')}: ${h.admin_count}`,
              },
              {
                label: t('opsKommuneListings'),
                value: h.listings_matched,
                hint: `${t('opsKommuneMatchRate')}: ${h.region_match_rate}%`,
              },
              {
                label: t('opsKommuneTermsApproved'),
                value: h.terms_approved,
                hint: `${t('opsKpiPendingTerms')}: ${h.terms_pending}`,
              },
              {
                label: t('opsKommuneSign7d'),
                value: `${h.sign_completed_7d}/${h.sign_initiated_7d}`,
              },
              {
                label: t('opsKommuneDpo'),
                value: dpoStatus,
              },
            ]}
          />
        </div>
      ) : null}

      {tab === 'people' ? (
        <div className="ops-tab-panel">
          {detail.staff.length === 0 ? (
            <OpsEmptyState title={t('opsKommuneNoStaff')} />
          ) : (
            <OpsDataTable
              rows={detail.staff}
              columns={[
                {
                  key: 'name',
                  header: t('opsName'),
                  render: (s) => (
                    <Link href={`/ops/accounts/${s.id}`} className="ops-link">
                      {s.full_name}
                    </Link>
                  ),
                },
                { key: 'email', header: t('opsEmail'), render: (s) => s.email_masked },
                { key: 'role', header: t('opsRole'), render: (s) => s.role },
              ]}
            />
          )}
        </div>
      ) : null}

      {tab === 'access' ? (
        <div className="ops-tab-panel ops-stack">
          <OpsPanel title={t('opsBulkWhitelist')}>
            <div className="ops-form-stack">
              <textarea
                className="ops-input"
                rows={3}
                value={whitelistRaw}
                onChange={(e) => setWhitelistRaw(e.target.value)}
                placeholder="email@kommune.no"
              />
              <div className="ops-inline-actions">
                <Button variant="primary" disabled={busy} onClick={() => void addWhitelist()}>
                  {t('opsAddWhitelist')}
                </Button>
              </div>
            </div>
          </OpsPanel>
          {detail.whitelist.length === 0 ? (
            <OpsEmptyState title={t('opsKommuneNoWhitelist')} />
          ) : (
            <OpsDataTable
              rows={detail.whitelist}
              columns={[
                { key: 'email', header: t('opsEmail'), render: (w) => w.email },
                {
                  key: 'status',
                  header: t('opsStatus'),
                  render: (w) => (
                    <OpsBadge tone={w.is_active ? 'success' : 'neutral'}>
                      {w.is_active ? t('opsActive') : t('opsInactive')}
                    </OpsBadge>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  className: 'ops-table-cell--actions',
                  render: (w) =>
                    w.is_active ? (
                      <Button variant="secondary" disabled={busy} onClick={() => void deactivate(w.id)}>
                        {t('opsDeactivate')}
                      </Button>
                    ) : null,
                },
              ]}
            />
          )}
        </div>
      ) : null}

      {tab === 'terms' ? (
        <div className="ops-tab-panel ops-stack">
          <OpsPanel
            title={t('opsTabTerms')}
            description={t('opsWizardTermsHint')}
            actions={
              <Link href="/ops/terms" className="ops-link">
                {t('opsGoTermsQueue')}
              </Link>
            }
          >
            {detail.terms.length === 0 ? (
              <OpsEmptyState title={t('opsNoTermsDocs')} />
            ) : (
              <OpsDataTable
                rows={detail.terms}
                columns={[
                  { key: 'title', header: t('opsTermsTitle'), render: (doc) => doc.title },
                  { key: 'version', header: t('opsVersion'), render: (doc) => doc.version },
                  {
                    key: 'status',
                    header: t('opsStatus'),
                    render: (doc) => (
                      <OpsBadge tone={doc.approved_for_utleier_signing ? 'success' : 'warning'}>
                        {doc.approved_for_utleier_signing ? t('opsApproved') : t('opsPending')}
                      </OpsBadge>
                    ),
                  },
                ]}
              />
            )}
          </OpsPanel>
        </div>
      ) : null}

      {tab === 'compliance' ? (
        <div className="ops-tab-panel">
          <OpsPanel title={t('opsTabCompliance')} description={t('opsDpoLead')}>
            <div className="ops-form-stack">
              <label className="ops-field">
                {t('opsDpoEmail')}
                <input className="ops-input" type="email" value={dpoEmail} onChange={(e) => setDpoEmail(e.target.value)} />
              </label>
              <label className="ops-field">
                {t('opsDpoName')}
                <input className="ops-input" value={dpoName} onChange={(e) => setDpoName(e.target.value)} />
              </label>
              <label className="ops-field">
                {t('opsDpoPhone')}
                <input className="ops-input" value={dpoPhone} onChange={(e) => setDpoPhone(e.target.value)} />
              </label>
              <div className="ops-inline-actions">
                <Button variant="primary" disabled={busy || !dpoEmail.trim()} onClick={() => void saveDpo()}>
                  {t('opsSave')}
                </Button>
              </div>
            </div>
          </OpsPanel>
        </div>
      ) : null}

      {tab === 'regions' ? (
        <div className="ops-tab-panel ops-stack">
          <OpsPanel title={t('opsTabRegions')} description={t('opsRegionMismatchLead')}>
            <p className="ops-meta">
              {t('opsKommuneRegionKeys')}: {k.region_keys.join(', ')}
            </p>
          </OpsPanel>
          {mismatches.length === 0 ? (
            <OpsEmptyState title={t('opsRegionMismatchNone')} />
          ) : (
            <OpsDataTable
              rows={mismatches}
              columns={[
                { key: 'address', header: t('opsAddress'), render: (m) => m.address ?? '—' },
                { key: 'city', header: t('opsCity'), render: (m) => m.city ?? '—' },
                { key: 'normalized', header: t('opsNormalized'), render: (m) => m.city_normalized },
              ]}
            />
          )}
        </div>
      ) : null}

      {tab === 'activity' ? (
        <div className="ops-tab-panel">
          {detail.recent_events.length === 0 ? (
            <OpsEmptyState title={t('opsNoEvents')} />
          ) : (
            <div className="ops-card-list">
              {detail.recent_events.map((ev) => (
                <article key={ev.id} className="ops-list-card">
                  <div className="ops-list-card-head">
                    <p className="ops-list-card-title">{ev.code}</p>
                    <OpsBadge tone={opsSeverityTone(ev.severity)}>{ev.severity}</OpsBadge>
                  </div>
                  <p className="ops-meta">{ev.message}</p>
                  <p className="ops-meta">
                    {formatDateTimeNo(ev.created_at)} · {ev.source}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
