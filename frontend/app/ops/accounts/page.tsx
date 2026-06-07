'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '../../../context/LanguageContext'
import OpsGdprBanner from '../components/OpsGdprBanner'
import LoadingPlaceholder from '../../components/LoadingPlaceholder'
import { Button } from '../../components/ui/Button'
import { opsSearchUsers, type OpsUserListItem } from '../../lib/opsApi'
import { formatDateTimeNo } from '../../lib/dateFormat'

export default function OpsAccountsPage() {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('')
  const [items, setItems] = useState<OpsUserListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runSearch = async () => {
    if (query.trim().length > 0 && query.trim().length < 3) {
      setError(t('opsSearchMinChars'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await opsSearchUsers(query.trim() || null, role || null, 50, 0)
      setItems(res.items)
      setTotal(res.total)
      setSearched(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('pageLoadStuck'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="ops-page-title">{t('opsNavAccounts')}</h1>
      <p className="ops-page-lead">{t('opsAccountsLead')}</p>
      <OpsGdprBanner />

      <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
        <div className="ops-form-grid" style={{ maxWidth: '100%' }}>
          <label>
            {t('opsSearchEmail')}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('opsSearchPlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && void runSearch()}
            />
          </label>
          <label>
            {t('opsFilterRole')}
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">{t('opsAllRoles')}</option>
              <option value="homeowner">{t('opsRoleHomeowner')}</option>
              <option value="kommune_ansatt">{t('opsRoleKommuneAnsatt')}</option>
              <option value="kommune_admin">{t('opsRoleKommuneAdmin')}</option>
            </select>
          </label>
          <Button variant="primary" onClick={() => void runSearch()} disabled={loading}>
            {loading ? t('loadingPleaseWait') : t('opsSearch')}
          </Button>
        </div>
        {error ? <p style={{ color: '#ef4444', marginTop: 'var(--space-3)' }}>{error}</p> : null}
      </div>

      {loading ? <LoadingPlaceholder minHeight={160} /> : null}

      {searched && !loading ? (
        <p className="ops-meta" style={{ marginBottom: 'var(--space-4)' }}>
          {t('opsResultsCount').replace('{count}', String(total))}
        </p>
      ) : null}

      <div className="ops-card-list">
        {items.map((row) => (
          <Link key={row.id} href={`/ops/accounts/${row.id}`} className="card ops-list-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="ops-list-card-head">
              <div>
                <h2 className="ops-list-card-title">{row.full_name || row.email_masked}</h2>
                <p className="ops-meta">{row.email_masked}</p>
                <p className="ops-meta">
                  {row.role || '—'} · {row.kommune_region || '—'} · {formatDateTimeNo(row.created_at)}
                </p>
              </div>
              {row.has_active_agreement ? (
                <span className="ops-status-pill ops-status-pill--ok">{t('opsSigned')}</span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>

      {searched && !loading && items.length === 0 ? (
        <p className="ops-meta">{t('opsNoResults')}</p>
      ) : null}
    </div>
  )
}
