'use client'

import { use, useEffect, useState } from 'react'
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
  opsManageWhitelist,
  opsRevokeOperator,
  opsSetUserRole,
  type OpsUserDetail,
} from '../../../lib/opsApi'
import { formatDateTimeNo } from '../../../lib/dateFormat'

export default function OpsAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { t } = useLanguage()
  const [user, setUser] = useState<OpsUserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success')

  const [role, setRole] = useState('homeowner')
  const [region, setRegion] = useState('')
  const [canEdit, setCanEdit] = useState(true)
  const [wlRegion, setWlRegion] = useState('')
  const [wlNotes, setWlNotes] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const detail = await opsGetUserDetail(id)
        if (cancelled) return
        setUser(detail)
        setRole(detail.role || 'homeowner')
        setRegion(detail.kommune_region || '')
        setCanEdit(detail.kommune_can_edit)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const saveRole = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await opsSetUserRole(id, role, region.trim() || null, canEdit)
      setMessageTone('success')
      setMessage(t('opsSaved'))
      setUser(await opsGetUserDetail(id))
    } catch (e) {
      setMessageTone('error')
      setMessage(e instanceof Error ? e.message : t('pageLoadStuck'))
    } finally {
      setSaving(false)
    }
  }

  const saveWhitelist = async () => {
    if (!user?.email_full || !wlRegion.trim()) return
    setSaving(true)
    setMessage(null)
    try {
      await opsManageWhitelist(user.email_full, wlRegion.trim(), true, wlNotes.trim() || null)
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

  if (loading) return <OpsPageSkeleton />
  if (!user) return <OpsAlert tone="error">{t('opsUserNotFound')}</OpsAlert>

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
          <label className="ops-field">
            {t('opsRegion')}
            <input className="ops-input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="narvik" />
          </label>
          <label className="ops-field" style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row' }}>
            <input type="checkbox" checked={canEdit} onChange={(e) => setCanEdit(e.target.checked)} />
            {t('opsKommuneCanEdit')}
          </label>
          <Button variant="primary" disabled={saving} onClick={() => void saveRole()}>
            {t('opsSaveRole')}
          </Button>
        </div>
      </OpsPanel>

      <OpsPanel title={t('opsWhitelist')} padding="md">
        {user.whitelist_entries.length > 0 ? (
          <div className="ops-table-wrap" style={{ marginBottom: 'var(--space-4)', maxHeight: 240 }}>
            <table className="ops-table">
              <thead>
                <tr>
                  <th>{t('opsRegion')}</th>
                  <th>{t('opsStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {user.whitelist_entries.map((w) => (
                  <tr key={w.id}>
                    <td>{w.region}</td>
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
        ) : (
          <p className="ops-meta" style={{ marginBottom: 'var(--space-4)' }}>
            {t('opsNoWhitelist')}
          </p>
        )}
        <div className="ops-form-grid">
          <label className="ops-field">
            {t('opsRegion')}
            <input className="ops-input" value={wlRegion} onChange={(e) => setWlRegion(e.target.value)} />
          </label>
          <label className="ops-field">
            {t('opsNoteOptional')}
            <input className="ops-input" value={wlNotes} onChange={(e) => setWlNotes(e.target.value)} />
          </label>
          <Button variant="secondary" disabled={saving} onClick={() => void saveWhitelist()}>
            {t('opsAddWhitelist')}
          </Button>
        </div>
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
