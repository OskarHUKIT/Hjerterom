'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useLanguage } from '../../../../context/LanguageContext'
import OpsGdprBanner from '../../components/OpsGdprBanner'
import OpsPageHeader from '../../components/OpsPageHeader'
import OpsPanel from '../../components/OpsPanel'
import OpsBadge from '../../components/OpsBadge'
import OpsAlert from '../../components/OpsAlert'
import { OpsPageSkeleton } from '../../components/OpsSkeleton'
import { Button } from '../../../components/ui/Button'
import {
  opsGetUserDetail,
  opsGrantOperator,
  opsBulkInvite,
  opsListKommuner,
  opsRevokeOperator,
  opsSetUserGrants,
  opsSetUserRole,
  type OpsGrantInput,
  type OpsKommuneGrant,
  type OpsKommuneListItem,
  type OpsUserDetail,
} from '../../../lib/opsApi'
import { formatDateTimeNo } from '../../../lib/dateFormat'

type GrantDraft = {
  selected: boolean
  can_edit: boolean
  grant_role: 'staff' | 'admin'
}

export default function OpsAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { t } = useLanguage()
  const [user, setUser] = useState<OpsUserDetail | null>(null)
  const [kommuner, setKommuner] = useState<OpsKommuneListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success')

  const [role, setRole] = useState('homeowner')
  const [canEdit, setCanEdit] = useState(true)
  const [grantDraft, setGrantDraft] = useState<Record<string, GrantDraft>>({})
  const [inviteKommuneId, setInviteKommuneId] = useState('')
  const [inviteNotes, setInviteNotes] = useState('')
  const [inviteViewOnly, setInviteViewOnly] = useState(false)

  const activeKommuner = useMemo(
    () => kommuner.filter((k) => k.status !== 'suspended'),
    [kommuner]
  )

  const applyGrantsToDraft = (grants: OpsKommuneGrant[]) => {
    const next: Record<string, GrantDraft> = {}
    for (const k of activeKommuner) {
      const g = grants.find((x) => x.kommune_id === k.id)
      next[k.id] = {
        selected: !!g,
        can_edit: g?.can_edit ?? true,
        grant_role: g?.grant_role === 'admin' ? 'admin' : 'staff',
      }
    }
    setGrantDraft(next)
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const [detail, kommuneRows] = await Promise.all([opsGetUserDetail(id), opsListKommuner()])
        if (cancelled) return
        setUser(detail)
        setKommuner(kommuneRows)
        setRole(detail.role || 'homeowner')
        setCanEdit(detail.kommune_can_edit)
        applyGrantsToDraft(detail.kommune_grants || [])
        if (!inviteKommuneId && kommuneRows[0]) setInviteKommuneId(kommuneRows[0].id)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const saveRoleAndGrants = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await opsSetUserRole(id, role, null, canEdit)
      if (role === 'kommune_ansatt' || role === 'kommune_admin') {
        const grants: OpsGrantInput[] = Object.entries(grantDraft)
          .filter(([, v]) => v.selected)
          .map(([kommune_id, v]) => ({
            kommune_id,
            grant_role: role === 'kommune_admin' ? v.grant_role : 'staff',
            can_edit: v.can_edit,
          }))
        await opsSetUserGrants(id, grants)
      }
      setMessageTone('success')
      setMessage(t('opsSaved'))
      const detail = await opsGetUserDetail(id)
      setUser(detail)
      applyGrantsToDraft(detail.kommune_grants || [])
    } catch (e) {
      setMessageTone('error')
      setMessage(e instanceof Error ? e.message : t('pageLoadStuck'))
    } finally {
      setSaving(false)
    }
  }

  const saveInvite = async () => {
    if (!user?.email_full || !inviteKommuneId) return
    setSaving(true)
    setMessage(null)
    try {
      await opsBulkInvite(
        [inviteKommuneId],
        [user.email_full],
        'staff',
        !inviteViewOnly,
        inviteNotes.trim() || null
      )
      setMessageTone('success')
      setMessage(t('opsWhitelistSaved'))
      setUser(await opsGetUserDetail(id))
    } catch (e) {
      setMessageTone('error')
      setMessage(e instanceof Error ? e.message : t('pageLoadStuck'))
    } finally {
      setSaving(false)
    }
  }

  const toggleOperator = async (grant: boolean) => {
    setSaving(true)
    setMessage(null)
    try {
      if (grant) await opsGrantOperator(id, null)
      else await opsRevokeOperator(id)
      setMessageTone('success')
      setMessage(grant ? t('opsOperatorGranted') : t('opsOperatorRevoked'))
      setUser(await opsGetUserDetail(id))
    } catch (e) {
      setMessageTone('error')
      setMessage(e instanceof Error ? e.message : t('pageLoadStuck'))
    } finally {
      setSaving(false)
    }
  }

  const selectAllKommuner = () => {
    setGrantDraft((prev) => {
      const next = { ...prev }
      for (const k of activeKommuner) {
        next[k.id] = {
          selected: true,
          can_edit: canEdit,
          grant_role: next[k.id]?.grant_role ?? 'staff',
        }
      }
      return next
    })
  }

  const setViewOnlyAccess = (viewOnly: boolean) => {
    const nextCanEdit = !viewOnly
    setCanEdit(nextCanEdit)
    setGrantDraft((prev) => {
      const next = { ...prev }
      for (const kid of Object.keys(next)) {
        next[kid] = { ...next[kid], can_edit: nextCanEdit }
      }
      return next
    })
  }

  if (loading) return <OpsPageSkeleton />
  if (!user) return <OpsAlert tone="error">{t('opsUserNotFound')}</OpsAlert>

  const isStaffRole = role === 'kommune_ansatt' || role === 'kommune_admin'

  return (
    <div className="ops-stack ops-stack--lg">
      <OpsPageHeader
        breadcrumb={
          <Link href="/ops/accounts" className="ops-link">
            <ArrowLeft size={14} style={{ verticalAlign: -2, marginRight: 4 }} aria-hidden />
            {t('opsBackAccounts')}
          </Link>
        }
        title={user.full_name || user.email}
        lead={user.email}
      />
      <OpsGdprBanner />

      {message ? <OpsAlert tone={messageTone}>{message}</OpsAlert> : null}

      <div className="ops-kpi-grid">
        <div className="ops-kpi-card">
          <p className="ops-kpi-label">{t('opsListingsCount')}</p>
          <p className="ops-kpi-value">{user.listings_count}</p>
        </div>
        <div className="ops-kpi-card">
          <p className="ops-kpi-label">{t('opsAgreement')}</p>
          <p className="ops-kpi-value" style={{ fontSize: '1rem' }}>
            {user.signed_at ? formatDateTimeNo(user.signed_at) : t('opsNotSigned')}
          </p>
          {user.is_terminated ? (
            <p className="ops-kpi-hint">
              <OpsBadge tone="danger">{t('opsTerminated')}</OpsBadge>
            </p>
          ) : null}
        </div>
        <div className="ops-kpi-card">
          <p className="ops-kpi-label">{t('opsPlatformOperator')}</p>
          <p className="ops-kpi-value" style={{ fontSize: '1rem' }}>
            <OpsBadge tone={user.is_operator ? 'info' : 'neutral'}>
              {user.is_operator ? t('opsYes') : t('opsNo')}
            </OpsBadge>
          </p>
        </div>
        <div className="ops-kpi-card">
          <p className="ops-kpi-label">{t('opsCreated')}</p>
          <p className="ops-kpi-value" style={{ fontSize: '0.95rem' }}>
            {formatDateTimeNo(user.auth_created_at)}
          </p>
        </div>
      </div>

      {user.landlord_kommune_scope?.length ? (
        <OpsPanel title={t('opsLandlordScope')} padding="md">
          <ul className="ops-meta" style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {user.landlord_kommune_scope.map((s) => (
              <li key={s.kommune_id}>
                {s.display_name}
                {s.service_areas?.length ? ` — ${s.service_areas.join(', ')}` : ''}
              </li>
            ))}
          </ul>
        </OpsPanel>
      ) : null}

      <OpsPanel title={t('opsEditRole')} padding="md">
        <div className="ops-form-grid">
          <label className="ops-field">
            {t('opsFilterRole')}
            <select className="ops-input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="homeowner">{t('opsRoleHomeowner')}</option>
              <option value="kommune_ansatt">{t('opsRoleKommuneAnsatt')}</option>
              <option value="kommune_admin">{t('opsRoleKommuneAdmin')}</option>
            </select>
          </label>
        </div>
      </OpsPanel>

      {isStaffRole ? (
        <OpsPanel title={t('opsKommuneGrants')} padding="md">
          <p className="ops-panel-desc">{t('opsKommuneGrantsHint')}</p>
          {role === 'kommune_ansatt' ? (
            <label
              className="ops-field"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                flexDirection: 'row',
                marginBottom: 'var(--space-3)',
                padding: 'var(--space-3)',
                borderRadius: 8,
                border: '1px solid var(--ops-border)',
                background: 'var(--ops-surface-muted, rgba(255,255,255,0.03))',
              }}
            >
              <input
                type="checkbox"
                checked={!canEdit}
                onChange={(e) => setViewOnlyAccess(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <span>
                <strong>{t('opsViewOnlyAccess')}</strong>
                <span className="ops-meta" style={{ display: 'block', marginTop: 4 }}>
                  {t('opsViewOnlyAccessHint')}
                </span>
              </span>
            </label>
          ) : null}
          <div className="ops-actions-row" style={{ marginBottom: 'var(--space-3)' }}>
            <Button variant="secondary" type="button" onClick={selectAllKommuner}>
              {t('opsSelectAllKommuner')}
            </Button>
          </div>
          <div className="ops-form-grid">
            {activeKommuner.map((k) => {
              const draft = grantDraft[k.id] || { selected: false, can_edit: true, grant_role: 'staff' as const }
              return (
                <div key={k.id} className="ops-field ops-field--full" style={{ borderBottom: '1px solid var(--ops-border)', paddingBottom: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row' }}>
                    <input
                      type="checkbox"
                      checked={draft.selected}
                      onChange={(e) =>
                        setGrantDraft((prev) => ({
                          ...prev,
                          [k.id]: { ...draft, selected: e.target.checked, can_edit: canEdit },
                        }))
                      }
                    />
                    <span>
                      <strong>{k.display_name}</strong>{' '}
                      <span className="ops-meta">({(k.region_keys || []).join(', ')})</span>
                    </span>
                  </label>
                  {draft.selected && role !== 'kommune_ansatt' ? (
                    <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 8, marginLeft: 28 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={draft.can_edit}
                          onChange={(e) =>
                            setGrantDraft((prev) => ({
                              ...prev,
                              [k.id]: { ...draft, can_edit: e.target.checked },
                            }))
                          }
                        />
                        {t('opsGrantCanEdit')}
                      </label>
                      {role === 'kommune_admin' ? (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="checkbox"
                            checked={draft.grant_role === 'admin'}
                            onChange={(e) =>
                              setGrantDraft((prev) => ({
                                ...prev,
                                [k.id]: {
                                  ...draft,
                                  grant_role: e.target.checked ? 'admin' : 'staff',
                                },
                              }))
                            }
                          />
                          {t('opsGrantAdmin')}
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </OpsPanel>
      ) : null}

      <div className="ops-actions-row">
        <Button variant="primary" disabled={saving} onClick={() => void saveRoleAndGrants()}>
          {t('opsSaveRole')}
        </Button>
      </div>

      <OpsPanel title={t('opsInvitePreSignup')} padding="md">
        <p className="ops-panel-desc">{t('opsInvitePreSignupHint')}</p>
        <div className="ops-form-grid">
          <label className="ops-field">
            {t('opsKommune')}
            <select className="ops-input" value={inviteKommuneId} onChange={(e) => setInviteKommuneId(e.target.value)}>
              {activeKommuner.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.display_name}
                </option>
              ))}
            </select>
          </label>
          <label className="ops-field">
            {t('opsNoteOptional')}
            <input className="ops-input" value={inviteNotes} onChange={(e) => setInviteNotes(e.target.value)} />
          </label>
          <label
            className="ops-field"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              flexDirection: 'row',
              gridColumn: '1 / -1',
            }}
          >
            <input
              type="checkbox"
              checked={inviteViewOnly}
              onChange={(e) => setInviteViewOnly(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              <strong>{t('opsViewOnlyAccess')}</strong>
              <span className="ops-meta" style={{ display: 'block', marginTop: 4 }}>
                {t('opsViewOnlyAccessHint')}
              </span>
            </span>
          </label>
          <Button variant="secondary" disabled={saving} onClick={() => void saveInvite()}>
            {t('opsAddInvite')}
          </Button>
        </div>
        {user.whitelist_entries.length > 0 ? (
          <div className="ops-table-wrap" style={{ marginTop: 'var(--space-4)', maxHeight: 200 }}>
            <table className="ops-table">
              <thead>
                <tr>
                  <th>{t('opsRegion')}</th>
                  <th>{t('opsAccessLevel')}</th>
                  <th>{t('opsStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {user.whitelist_entries.map((w) => (
                  <tr key={w.id}>
                    <td>{w.region}</td>
                    <td>
                      <OpsBadge tone={w.can_edit ? 'info' : 'neutral'}>
                        {w.can_edit ? t('opsGrantCanEdit') : t('opsViewOnlyAccess')}
                      </OpsBadge>
                    </td>
                    <td>
                      <OpsBadge tone={w.is_active ? 'success' : 'neutral'}>
                        {w.is_active ? t('opsActive') : t('opsInactive')}
                      </OpsBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </OpsPanel>

      <OpsPanel title={t('opsOperatorAccess')} padding="md">
        <p className="ops-panel-desc">{t('opsGdprNotice').slice(0, 120)}…</p>
        <div className="ops-actions-row" style={{ marginTop: 'var(--space-3)' }}>
          {user.is_operator ? (
            <Button variant="secondary" disabled={saving} onClick={() => void toggleOperator(false)}>
              {t('opsRevokeOperator')}
            </Button>
          ) : (
            <Button variant="primary" disabled={saving} onClick={() => void toggleOperator(true)}>
              {t('opsGrantOperator')}
            </Button>
          )}
        </div>
      </OpsPanel>
    </div>
  )
}
