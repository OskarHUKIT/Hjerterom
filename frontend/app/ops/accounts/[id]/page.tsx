'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useLanguage } from '../../../../context/LanguageContext'
import OpsGdprBanner from '../../components/OpsGdprBanner'
import LoadingPlaceholder from '../../../components/LoadingPlaceholder'
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
      setMessage(t('opsSaved'))
      const detail = await opsGetUserDetail(id)
      setUser(detail)
    } catch (e) {
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
      setMessage(t('opsWhitelistSaved'))
      const detail = await opsGetUserDetail(id)
      setUser(detail)
    } catch (e) {
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
      setMessage(grant ? t('opsOperatorGranted') : t('opsOperatorRevoked'))
      const detail = await opsGetUserDetail(id)
      setUser(detail)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t('pageLoadStuck'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingPlaceholder minHeight={240} />
  if (!user) return <p>{t('opsUserNotFound')}</p>

  return (
    <div>
      <Link href="/ops/accounts" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)', color: 'var(--color-accent)' }}>
        <ArrowLeft size={18} /> {t('opsBackAccounts')}
      </Link>

      <h1 className="ops-page-title">{user.full_name || user.email}</h1>
      <p className="ops-page-lead">{user.email}</p>
      <OpsGdprBanner />

      {message ? <p style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-4)' }}>{message}</p> : null}

      <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
        <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsProfileSummary')}</h2>
        <p className="ops-meta">{t('opsCreated')}: {formatDateTimeNo(user.auth_created_at)}</p>
        <p className="ops-meta">{t('opsListingsCount')}: {user.listings_count}</p>
        <p className="ops-meta">
          {t('opsAgreement')}: {user.signed_at ? formatDateTimeNo(user.signed_at) : t('opsNotSigned')}
          {user.is_terminated ? ` · ${t('opsTerminated')}` : ''}
        </p>
        <p className="ops-meta">
          {t('opsPlatformOperator')}: {user.is_operator ? t('opsYes') : t('opsNo')}
        </p>
      </div>

      <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
        <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsEditRole')}</h2>
        <div className="ops-form-grid">
          <label>
            {t('opsFilterRole')}
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="homeowner">{t('opsRoleHomeowner')}</option>
              <option value="kommune_ansatt">{t('opsRoleKommuneAnsatt')}</option>
              <option value="kommune_admin">{t('opsRoleKommuneAdmin')}</option>
            </select>
          </label>
          <label>
            {t('opsRegion')}
            <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="narvik" />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={canEdit} onChange={(e) => setCanEdit(e.target.checked)} />
            {t('opsKommuneCanEdit')}
          </label>
          <Button variant="primary" disabled={saving} onClick={() => void saveRole()}>
            {t('opsSaveRole')}
          </Button>
        </div>
      </div>

      <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
        <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsWhitelist')}</h2>
        {user.whitelist_entries.length > 0 ? (
          <ul style={{ margin: '0 0 var(--space-4)', paddingLeft: '1.2rem' }}>
            {user.whitelist_entries.map((w) => (
              <li key={w.id} className="ops-meta">
                {w.region} · {w.is_active ? t('opsActive') : t('opsInactive')}
              </li>
            ))}
          </ul>
        ) : (
          <p className="ops-meta">{t('opsNoWhitelist')}</p>
        )}
        <div className="ops-form-grid">
          <label>
            {t('opsRegion')}
            <input value={wlRegion} onChange={(e) => setWlRegion(e.target.value)} />
          </label>
          <label>
            {t('opsNoteOptional')}
            <input value={wlNotes} onChange={(e) => setWlNotes(e.target.value)} />
          </label>
          <Button variant="secondary" disabled={saving} onClick={() => void saveWhitelist()}>
            {t('opsAddWhitelist')}
          </Button>
        </div>
      </div>

      <div className="card" style={{ padding: 'var(--space-5)' }}>
        <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{t('opsOperatorAccess')}</h2>
        <div className="ops-actions-row">
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
      </div>
    </div>
  )
}
