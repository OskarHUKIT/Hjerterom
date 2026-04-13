'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  User,
  Search,
  Mail,
  Phone,
  Calendar,
  ChevronRight,
  MessageSquare,
  FileText,
  ShieldCheck,
  Info,
  CheckCircle2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatDateNo } from '../../lib/dateFormat'
import { formatKommuneRegionsForDisplay, listingCityMatchesRegions } from '../../lib/kommuneRegions'
import UserProfileClient from './UserProfileClient'
import LoadingPlaceholder from '../../components/LoadingPlaceholder'
import { useLanguage } from '../../../context/LanguageContext'
import {
  isKommuneAdminRole,
  isKommuneStaffRole,
  kommuneNavUsesAccountsLabel,
} from '../../lib/kommuneRoles'

function NavUsersContent() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('id')
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isKommuneAdmin, setIsKommuneAdmin] = useState(false)
  const [kommuneCanEdit, setKommuneCanEdit] = useState(true)
  /** null = rolle ikke avklart ennå (unngår «Utleiere» → «Kontoer»-flimmer ved innlasting) */
  const [useAccountsNavCopy, setUseAccountsNavCopy] = useState<boolean | null>(null)
  const [accountTab, setAccountTab] = useState<'landlords' | 'staff'>('landlords')
  const [staffRows, setStaffRows] = useState<
    {
      id: string
      full_name: string
      email: string
      kommune_region: string | null
      kommune_can_edit: boolean
      updated_at: string | null
    }[]
  >([])
  const [staffLoading, setStaffLoading] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setUseAccountsNavCopy(false)
        return
      }

      const metadataRole = user.user_metadata?.role
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role, kommune_region')
        .eq('id', user.id)
        .maybeSingle()
      const userRole = currentProfile?.role || metadataRole
      let kommuneRegion: string | string[] | null = currentProfile?.kommune_region ?? null
      if ((kommuneRegion == null || String(kommuneRegion).trim() === '') && user.email) {
        const { data: rpcRegion } = await supabase.rpc('get_whitelist_region_for_email', {
          p_email: user.email,
        })
        const fromRpc =
          typeof rpcRegion === 'string'
            ? rpcRegion
            : Array.isArray(rpcRegion) && rpcRegion?.length
              ? rpcRegion[0]
              : null
        if (fromRpc && String(fromRpc).trim()) {
          kommuneRegion = fromRpc
        } else {
          const { data: whitelistRows } = await supabase
            .from('kommune_access_list')
            .select('region')
            .ilike('email', user.email)
            .eq('is_active', true)
            .limit(1)
          const fromTable = whitelistRows?.[0]?.region
          if (fromTable && String(fromTable).trim()) kommuneRegion = fromTable
        }
      }

      setIsKommuneAdmin(isKommuneAdminRole(userRole))
      setKommuneCanEdit(
        userRole === 'kommune_admin' ||
          (currentProfile as { kommune_can_edit?: boolean | null } | null)?.kommune_can_edit !==
            false
      )
      setUseAccountsNavCopy(kommuneNavUsesAccountsLabel(userRole))

      if (!isKommuneStaffRole(userRole)) {
        setUsers([])
        setUseAccountsNavCopy(false)
        setLoading(false)
        return
      }

      // Kun brukere som har eller har hatt bolig i kommunens region(er) (støtter JSON-array ["Narvik","Gratangen"] og streng; fjerner ekstra anførselstegn)
      let regions: string[] = []
      if (Array.isArray(kommuneRegion))
        regions = kommuneRegion.map((r) => String(r).trim()).filter(Boolean)
      else if (kommuneRegion != null && String(kommuneRegion).trim()) {
        let s = String(kommuneRegion)
          .trim()
          .replace(/^["\\]+|["\\]+$/g, '')
          .trim()
        if (s.startsWith('[')) {
          try {
            const arr = JSON.parse(s)
            regions = Array.isArray(arr)
              ? arr.map((r: any) => String(r).trim()).filter(Boolean)
              : []
          } catch {
            regions = []
          }
        } else {
          const regionStr = s.replace(/\s+og\s+/gi, ',').replace(/[,;\n]+/g, ',')
          regions = regionStr
            .split(',')
            .map((r: string) => r.replace(/^["'\s\\]+|["'\s\\]+$/g, '').trim())
            .filter(Boolean)
        }
      }
      if (regions.length === 0) {
        setUsers([])
        setLoading(false)
        return
      }

      const regionsNorm = regions.map((r) => r.trim().toLowerCase()).filter(Boolean)
      const { data: allListings } = await supabase.rpc('get_listings_for_kommune')
      const listingsInRegion = (allListings || []).filter((l: any) =>
        listingCityMatchesRegions(l.city, regionsNorm)
      )
      const allowedOwnerIds = new Set(listingsInRegion.map((l: any) => l.owner_id).filter(Boolean))

      const { data: profiles, error: profileError } = await supabase.rpc(
        'get_all_users_for_kommune'
      )

      if (profileError) {
        const fallback = await supabase
          .from('profiles')
          .select('id, full_name, email, role, updated_at')
          .order('full_name', { ascending: true })
        if (fallback.error) throw fallback.error
        const { data: agreements } = await supabase
          .from('user_agreements')
          .select('user_id, signed_at, is_terminated, terminated_at')
        const terminatedIds = new Set(
          (agreements || []).filter((a: any) => a.is_terminated).map((a: any) => a.user_id)
        )
        const mapped = (fallback.data || [])
          .map((p: any) => {
            const activeAgreement = agreements?.find(
              (a: any) => a.user_id === p.id && !a.is_terminated
            )
            const terminatedAgreement = agreements?.find(
              (a: any) => a.user_id === p.id && a.is_terminated
            )
            return {
              owner_id: p.id,
              owner_name: p.full_name || p.email?.split('@')[0] || 'Ukjent bruker',
              contact_phone: '',
              role: p.role,
              hasSigned: !!activeAgreement,
              signedAt: activeAgreement?.signed_at,
              isTerminated: terminatedIds.has(p.id),
              terminatedAt: terminatedAgreement?.terminated_at ?? null,
            }
          })
          .filter((u: any) => allowedOwnerIds.has(u.owner_id))
        setUsers(mapped)
        setLoading(false)
        return
      }

      const { data: agreements } = await supabase
        .from('user_agreements')
        .select('user_id, signed_at, is_terminated, terminated_at')
      const terminatedIds = new Set(
        (agreements || []).filter((a) => a.is_terminated).map((a) => a.user_id)
      )

      const mappedUsers = (profiles || [])
        .map((p: any) => {
          const activeAgreement = agreements?.find((a) => a.user_id === p.id && !a.is_terminated)
          const terminatedAgreement = agreements?.find((a) => a.user_id === p.id && a.is_terminated)
          return {
            owner_id: p.id,
            owner_name: p.full_name || p.email?.split('@')[0] || 'Ukjent bruker',
            contact_phone: '',
            role: p.role,
            hasSigned: !!activeAgreement,
            signedAt: activeAgreement?.signed_at,
            isTerminated: terminatedIds.has(p.id),
            terminatedAt: terminatedAgreement?.terminated_at ?? null,
          }
        })
        .filter((u: { owner_id: string }) => allowedOwnerIds.has(u.owner_id))

      setUsers(mappedUsers)
    } catch (err: any) {
      console.error('Error fetching users:', err)
      setUseAccountsNavCopy(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (useAccountsNavCopy !== true || accountTab !== 'staff') return
    let cancelled = false
    ;(async () => {
      setStaffLoading(true)
      const { data, error } = await supabase.rpc('get_kommune_staff_for_admin')
      if (cancelled) return
      if (error) console.error(error)
      setStaffRows((data as typeof staffRows) || [])
      setStaffLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [useAccountsNavCopy, accountTab])

  const toggleStaffEdit = async (staffId: string, currentCanEdit: boolean) => {
    const { error } = await supabase.rpc('kommune_admin_set_staff_can_edit', {
      p_target_user_id: staffId,
      p_can_edit: !currentCanEdit,
    })
    if (error) {
      alert(error.message)
      return
    }
    setStaffRows((prev) =>
      prev.map((r) => (r.id === staffId ? { ...r, kommune_can_edit: !currentCanEdit } : r))
    )
  }

  const landlordUsers = users.filter((u: { role?: string }) => !isKommuneStaffRole(u.role))
  const filteredUsers = landlordUsers.filter((u) =>
    u.owner_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Show user profile when ?id= is present (avoids dynamic route + generateStaticParams)
  if (userId) {
    return <UserProfileClient overrideId={userId} />
  }

  return (
    <main className="container">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <Link
          href="/"
          className="nav-link"
          style={{
            marginLeft: '-1rem',
            marginBottom: 'var(--space-2)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          ← {t('overview')}
        </Link>
        <h1 style={{ fontSize: '2.75rem', minHeight: '1.15em' }}>
          {useAccountsNavCopy === null ? (
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                height: '0.95em',
                width: 'min(12rem, 70vw)',
                borderRadius: '10px',
                background: 'var(--border-subtle)',
                opacity: 0.55,
              }}
            />
          ) : useAccountsNavCopy ? (
            t('navAccounts')
          ) : (
            t('navLandlords')
          )}
        </h1>
        <p style={{ fontSize: '1.125rem', opacity: 0.8, minHeight: '2.75em' }}>
          {useAccountsNavCopy === null ? (
            <span
              aria-hidden
              style={{
                display: 'block',
                height: '0.85em',
                maxWidth: '36rem',
                borderRadius: '8px',
                background: 'var(--border-subtle)',
                opacity: 0.35,
              }}
            />
          ) : useAccountsNavCopy ? (
            isKommuneAdmin ? (
              t('navAccountsDesc')
            ) : kommuneCanEdit ? (
              t('navAccountsDescEditor')
            ) : (
              t('navAccountsDescReadonly')
            )
          ) : (
            t('navLandlordsDesc')
          )}
        </p>
      </div>

      {useAccountsNavCopy === true && (
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-4)',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className={accountTab === 'landlords' ? 'button' : 'button button-secondary'}
            style={{ padding: '8px 16px' }}
            onClick={() => setAccountTab('landlords')}
          >
            {t('tabLandlords')}
          </button>
          <button
            type="button"
            className={accountTab === 'staff' ? 'button' : 'button button-secondary'}
            style={{ padding: '8px 16px' }}
            onClick={() => setAccountTab('staff')}
          >
            {t('tabStaff')}
          </button>
        </div>
      )}

      {accountTab === 'landlords' && (
        <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="input"
              placeholder={t('searchByNamePlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
            />
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '14px', opacity: 0.5 }}
            />
          </div>
        </div>
      )}

      {accountTab === 'staff' && useAccountsNavCopy === true ? (
        staffLoading ? (
          <LoadingPlaceholder minHeight={200} />
        ) : staffRows.length > 0 ? (
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {staffRows.map((s) => (
              <div key={s.id} className="card" style={{ padding: 'var(--space-5)' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 'var(--space-4)',
                  }}
                >
                  <div>
                    <h3 style={{ margin: '0 0 4px', color: 'var(--color-accent)' }}>
                      {s.full_name || s.email}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>{s.email}</p>
                    <p
                      style={{
                        margin: '8px 0 0',
                        fontSize: '0.85rem',
                        opacity: 0.7,
                        maxWidth: '420px',
                      }}
                    >
                      {t('kommuneAccess')}:{' '}
                      {formatKommuneRegionsForDisplay(s.kommune_region) || '—'}
                    </p>
                  </div>
                  {isKommuneAdmin && (
                    <div
                      style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}
                    >
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={s.kommune_can_edit !== false}
                          onChange={() => toggleStaffEdit(s.id, s.kommune_can_edit !== false)}
                        />
                        {t('staffEditAccess')}
                      </label>
                    </div>
                  )}
                </div>
                <div
                  style={{
                    marginTop: 'var(--space-3)',
                    display: 'flex',
                    gap: 'var(--space-2)',
                    flexWrap: 'wrap',
                  }}
                >
                  <Link
                    href={`/nav/messages?with=${s.id}`}
                    className="button button-secondary"
                    style={{
                      padding: '8px 16px',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    <MessageSquare size={16} style={{ marginRight: '8px' }} /> {t('chat')}
                  </Link>
                  <button
                    type="button"
                    className="button"
                    style={{ padding: '8px 16px' }}
                    onClick={() => router.push(`/nav/users?id=${s.id}`)}
                  >
                    {t('seeProfile')} <ChevronRight size={16} style={{ marginLeft: '4px' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
            <Info size={40} style={{ margin: '0 auto var(--space-3)', opacity: 0.3 }} />
            <p>{t('noUsersMatch')}</p>
          </div>
        )
      ) : null}

      {accountTab === 'landlords' &&
        (loading ? (
          <LoadingPlaceholder minHeight={200} />
        ) : filteredUsers.length > 0 ? (
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {filteredUsers.map((user) => (
              <div
                key={user.owner_id}
                className="card user-card"
                onClick={() => router.push(`/nav/users?id=${user.owner_id}`)}
                style={{ padding: 'var(--space-6)', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <div
                  className="user-card-inner"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 'var(--space-4)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--space-4)',
                      alignItems: 'center',
                      flex: '1 1 200px',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'rgba(59, 130, 246, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-accent)',
                      }}
                    >
                      <User size={28} />
                    </div>
                    <div>
                      <Link
                        href={`/nav/users?id=${user.owner_id}`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <h3 style={{ margin: 0, color: 'var(--color-accent)' }}>
                          {user.owner_name || 'Ukjent bruker'}
                        </h3>
                      </Link>
                      <div
                        className="user-card-meta"
                        style={{
                          display: 'flex',
                          gap: 'var(--space-4)',
                          marginTop: '4px',
                          fontSize: '0.9rem',
                          opacity: 0.7,
                          flexWrap: 'wrap',
                        }}
                      >
                        {user.isTerminated && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'rgba(148, 163, 184, 0.2)',
                              color: 'var(--text-muted)',
                              fontSize: '0.85rem',
                            }}
                          >
                            <CheckCircle2 size={14} style={{ color: '#94a3b8' }} /> {t('expired')}
                            {user.terminatedAt ? ` (${formatDateNo(user.terminatedAt)})` : ''}
                          </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={14} /> {user.contact_phone || t('noPhone')}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldCheck
                            size={14}
                            style={{ color: user.hasSigned ? 'var(--color-teal)' : '#ef4444' }}
                          />
                          {user.hasSigned
                            ? `${t('signedOn')} (${formatDateNo(user.signedAt)})`
                            : user.isTerminated
                              ? t('expired')
                              : t('notSigned')}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User
                            size={14}
                            style={{
                              color:
                                user.role === 'kommune_ansatt' ? 'var(--color-accent)' : 'inherit',
                            }}
                          />
                          {user.role === 'kommune_ansatt' ? t('kommuneStaff') : t('landlord')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                    {kommuneCanEdit ? (
                      <Link
                        href={`/nav/messages?with=${user.owner_id}`}
                        className="button button-secondary"
                        style={{
                          padding: '8px 16px',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageSquare size={16} style={{ marginRight: '8px' }} /> {t('chat')}
                      </Link>
                    ) : null}
                    <button className="button" style={{ padding: '8px 16px' }}>
                      {t('seeProfile')} <ChevronRight size={16} style={{ marginLeft: '4px' }} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
            <Info size={40} style={{ margin: '0 auto var(--space-3)', opacity: 0.3 }} />
            <p>{t('noUsersMatch')}</p>
          </div>
        ))}

      <style jsx>{`
        .user-card:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-2px);
          border-color: var(--color-sky-blue);
        }
      `}</style>
    </main>
  )
}

export default function NavUsers() {
  return (
    <Suspense fallback={<div className="container" style={{ minHeight: '80vh' }} />}>
      <NavUsersContent />
    </Suspense>
  )
}
