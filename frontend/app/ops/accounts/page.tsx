'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../../context/LanguageContext'
import OpsGdprBanner from '../components/OpsGdprBanner'
import OpsPageHeader from '../components/OpsPageHeader'
import OpsPanel from '../components/OpsPanel'
import OpsBadge from '../components/OpsBadge'
import OpsAlert from '../components/OpsAlert'
import OpsEmptyState from '../components/OpsEmptyState'
import OpsDataTable from '../components/OpsDataTable'
import OpsToolbar from '../components/OpsToolbar'
import OpsChipGroup from '../components/OpsChipGroup'
import OpsMobileSearchBar from '../components/OpsMobileSearchBar'
import { OpsTableSkeleton } from '../components/OpsSkeleton'
import { Button } from '../../components/ui/Button'
import { opsSearchUsers, type OpsUserListItem } from '../../lib/opsApi'
import { formatDateTimeNo } from '../../lib/dateFormat'

function initials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
    return (parts[0]?.slice(0, 2) ?? '??').toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export default function OpsAccountsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('')
  const [items, setItems] = useState<OpsUserListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runSearch = async (nextQuery = query, nextRole = role) => {
    if (nextQuery.trim().length > 0 && nextQuery.trim().length < 3) {
      setError(t('opsSearchMinChars'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await opsSearchUsers(nextQuery.trim() || null, nextRole || null, 50, 0)
      setItems(res.items)
      setTotal(res.total)
      setSearched(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('pageLoadStuck'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (query.trim().length > 0 && query.trim().length < 3) return
    if (query.trim().length === 0 && !role) return
    const timer = window.setTimeout(() => {
      void runSearch(query, role)
    }, 350)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced mobile search
  }, [query, role])

  const roleOptions = useMemo(
    () => [
      { value: '', label: t('opsFilterAll') },
      { value: 'homeowner', label: t('opsRoleHomeowner') },
      { value: 'kommune_ansatt', label: t('opsRoleKommuneAnsatt') },
      { value: 'kommune_admin', label: t('opsRoleKommuneAdmin') },
    ],
    [t],
  )

  return (
    <div className="ops-stack ops-stack--lg">
      <OpsPageHeader title={t('opsNavAccounts')} lead={t('opsAccountsLead')} />

      <div className="ops-mobile-sticky-toolbar ops-mobile-only">
        <OpsMobileSearchBar
          id="ops-account-search"
          value={query}
          onChange={setQuery}
          placeholder={t('opsSearchPlaceholder')}
          onSubmit={() => void runSearch()}
        />
        <OpsChipGroup
          className="mt-2"
          value={role}
          onChange={(value) => setRole(value)}
          options={roleOptions}
        />
      </div>

      <div className="ops-desktop-only">
        <OpsGdprBanner />
        <OpsPanel padding="md">
          <OpsToolbar
            futureOrgSlot={
              <span className="ops-meta" title={t('opsOrgFilterFutureHint')}>
                {t('opsOrgFilterFuture')}
              </span>
            }
          >
            <label className="ops-field">
              {t('opsSearchEmail')}
              <input
                className="ops-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('opsSearchPlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && void runSearch()}
              />
            </label>
            <label className="ops-field">
              {t('opsFilterRole')}
              <select className="ops-input" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">{t('opsAllRoles')}</option>
                <option value="homeowner">{t('opsRoleHomeowner')}</option>
                <option value="kommune_ansatt">{t('opsRoleKommuneAnsatt')}</option>
                <option value="kommune_admin">{t('opsRoleKommuneAdmin')}</option>
              </select>
            </label>
            <div className="ops-field" style={{ alignSelf: 'end' }}>
              <Button variant="primary" onClick={() => void runSearch()} disabled={loading}>
                {loading ? t('loadingPleaseWait') : t('opsSearch')}
              </Button>
            </div>
          </OpsToolbar>
          {error ? <OpsAlert tone="error">{error}</OpsAlert> : null}
        </OpsPanel>
      </div>

      {loading ? <OpsTableSkeleton rows={6} cols={5} /> : null}
      {error ? <div className="ops-mobile-only"><OpsAlert tone="error">{error}</OpsAlert></div> : null}

      {searched && !loading ? (
        <p className="ops-meta">{t('opsResultsCount').replace('{count}', String(total))}</p>
      ) : null}

      {!loading && searched && items.length === 0 ? (
        <OpsEmptyState title={t('opsNoResults')} />
      ) : null}

      {!loading && items.length > 0 ? (
        <>
          <div className="ops-desktop-only">
            <OpsDataTable
              rows={items}
              onRowClick={(row) => router.push(`/ops/accounts/${row.id}`)}
              empty={<OpsEmptyState title={t('opsNoResults')} />}
              columns={[
                {
                  key: 'name',
                  header: t('opsName'),
                  render: (row) => (
                    <div>
                      <div className="ops-list-card-title" style={{ fontSize: '0.875rem' }}>
                        {row.full_name || row.email_masked}
                      </div>
                      <div className="ops-meta">{row.email_masked}</div>
                    </div>
                  ),
                },
                {
                  key: 'role',
                  header: t('opsRole'),
                  render: (row) => row.role || '—',
                },
                {
                  key: 'region',
                  header: t('opsRegion'),
                  render: (row) => row.kommune_region || '—',
                },
                {
                  key: 'created',
                  header: t('opsCreated'),
                  render: (row) => formatDateTimeNo(row.created_at),
                },
                {
                  key: 'status',
                  header: t('opsStatus'),
                  render: (row) =>
                    row.has_active_agreement ? (
                      <OpsBadge tone="success">{t('opsSigned')}</OpsBadge>
                    ) : (
                      <OpsBadge tone="neutral">{t('opsNotSigned')}</OpsBadge>
                    ),
                },
              ]}
            />
          </div>

          <div className="ops-mobile-only">
            {items.map((row) => (
              <Link key={row.id} href={`/ops/accounts/${row.id}`} className="ops-mobile-list-card">
                <div className="ops-mobile-account-row">
                  <span className="ops-mobile-account-avatar" aria-hidden>
                    {initials(row.full_name, row.email_masked)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="ops-mobile-list-card-title truncate">
                        {row.full_name || row.email_masked}
                      </p>
                      {row.role ? (
                        <OpsBadge tone={row.role.includes('admin') ? 'info' : 'neutral'} dot>
                          {row.role.replace('kommune_', '')}
                        </OpsBadge>
                      ) : null}
                    </div>
                    <p className="ops-mobile-list-card-slug">
                      {row.email_masked} · {row.kommune_region || '—'}
                    </p>
                    {row.has_active_agreement ? (
                      <p className="ops-mobile-kpi-delta ops-mobile-kpi-delta--success mt-1">
                        {t('opsSigned')}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
