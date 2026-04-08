'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { 
  User, ArrowLeft, Phone, Mail, Clock, MessageSquare, 
  ShieldCheck, Home, Search, ChevronDown, CheckCircle2
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatAuditLogDescription } from '../../lib/auditLogFormat'
import { formatDateNo, formatDateTimeNo } from '../../lib/dateFormat'
import { DateInput } from '../../components/DateInput'
import LoadingPlaceholder from '../../components/LoadingPlaceholder'
import { useLanguage } from '../../../context/LanguageContext'
import { parseKommuneRegions, listingCityMatchesRegions, regionsOverlap, mergeKommuneRegionSources } from '../../lib/kommuneRegions'
import { isKommuneAdminRole, isKommuneStaffRole } from '../../lib/kommuneRoles'

interface UserProfileClientProps {
  overrideId?: string | null
}

export default function UserProfileClient({ overrideId }: UserProfileClientProps = {}) {
  const { t } = useLanguage()
  const params = useParams()
  const id = overrideId ?? params.id

  const [user, setUser] = useState<any>(null)
  const [listings, setListings] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [regionAccessDenied, setRegionAccessDenied] = useState(false)
  /** Hvorfor: utleier uten bolig i område vs. kommuneansatt uten overlapp i profil-regioner */
  const [regionDenyKind, setRegionDenyKind] = useState<'homeowner' | 'staff' | null>(null)
  const [historySearch, setHistorySearch] = useState('')
  const [historyDateFrom, setHistoryDateFrom] = useState('')
  const [historyDateTo, setHistoryDateTo] = useState('')
  const [historyExpanded, setHistoryExpanded] = useState(false)
  /** Kun kommune_admin ser endringshistorikk (audit logs). */
  const [viewerIsKommuneAdmin, setViewerIsKommuneAdmin] = useState(false)

  const HISTORY_INITIAL_SHOW = 10

  useEffect(() => {
    setRegionAccessDenied(false)
    setRegionDenyKind(null)
    setViewerIsKommuneAdmin(false)
    async function fetchData() {
      if (!id) return
      setLoading(true)
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        const { data: currentProfile } = currentUser
          ? await supabase.from('profiles').select('kommune_region, role').eq('id', currentUser.id).maybeSingle()
          : { data: null }
        const viewerRole =
          (currentUser?.user_metadata?.role as string | undefined) || currentProfile?.role || null
        setViewerIsKommuneAdmin(isKommuneAdminRole(viewerRole))

        let profileRow: { full_name?: string; email?: string; role?: string; updated_at?: string } | null = null
        const { data: rpcData } = await supabase.rpc('get_single_user_for_kommune', { p_user_id: id })
        if (Array.isArray(rpcData) && rpcData.length > 0) {
          profileRow = rpcData[0]
        } else {
          const { data: p } = await supabase.from('profiles').select('full_name, email, role, updated_at').eq('id', id).maybeSingle()
          profileRow = p
        }

        if (!profileRow) {
          setLoading(false)
          return
        }

        const viewerAdmin = isKommuneAdminRole(viewerRole)
        const [{ data: agreements }, { data: listingsData }, logsRes] = await Promise.all([
          supabase.from('user_agreements').select('*').eq('user_id', id).order('signed_at', { ascending: false }),
          supabase.from('listings').select('*').eq('owner_id', id),
          viewerAdmin
            ? supabase.from('audit_logs').select('*').eq('user_id', id).order('created_at', { ascending: false })
            : Promise.resolve({ data: [] as any[] }),
        ])
        const logsData = Array.isArray(logsRes?.data) ? logsRes.data : []

        let viewerRegionRaw: string | string[] | null = currentProfile?.kommune_region ?? null
        if ((viewerRegionRaw == null || String(viewerRegionRaw).trim() === '') && currentUser?.email) {
          const { data: rpcRegion } = await supabase.rpc('get_whitelist_region_for_email', { p_email: currentUser.email })
          const fromRpc =
            typeof rpcRegion === 'string' ? rpcRegion : Array.isArray(rpcRegion) && rpcRegion?.length ? rpcRegion[0] : null
          if (fromRpc && String(fromRpc).trim()) {
            viewerRegionRaw = fromRpc
          } else {
            const { data: whitelistRows } = await supabase
              .from('kommune_access_list')
              .select('region')
              .ilike('email', currentUser.email)
              .eq('is_active', true)
              .limit(1)
            const fromTable = whitelistRows?.[0]?.region
            if (fromTable && String(fromTable).trim()) viewerRegionRaw = fromTable
          }
        }
        const regions = mergeKommuneRegionSources(currentProfile?.kommune_region, viewerRegionRaw)

        if (regions.length > 0) {
          const targetRole = profileRow.role ?? 'homeowner'
          if (isKommuneStaffRole(targetRole)) {
            const { data: targetProf } = await supabase.from('profiles').select('kommune_region').eq('id', id).maybeSingle()
            let targetRegionRaw: string | string[] | null = targetProf?.kommune_region ?? null
            if ((targetRegionRaw == null || String(targetRegionRaw).trim() === '') && profileRow.email) {
              const { data: tr } = await supabase.rpc('get_whitelist_region_for_email', { p_email: profileRow.email })
              const fromRpc =
                typeof tr === 'string' ? tr : Array.isArray(tr) && tr?.length ? tr[0] : null
              if (fromRpc && String(fromRpc).trim()) {
                targetRegionRaw = fromRpc
              } else {
                const { data: wlRows } = await supabase
                  .from('kommune_access_list')
                  .select('region')
                  .ilike('email', profileRow.email)
                  .eq('is_active', true)
                  .limit(1)
                const fromTable = wlRows?.[0]?.region
                if (fromTable && String(fromTable).trim()) targetRegionRaw = fromTable
              }
            }
            const targetRegions = mergeKommuneRegionSources(targetProf?.kommune_region, targetRegionRaw)
            if (!regionsOverlap(regions, targetRegions)) {
              setRegionAccessDenied(true)
              setRegionDenyKind('staff')
            }
          } else {
            const hasListingInRegion = (listingsData || []).some((l: any) =>
              listingCityMatchesRegions(l.city, regions)
            )
            if (!hasListingInRegion) {
              setRegionAccessDenied(true)
              setRegionDenyKind('homeowner')
            }
          }
        }

        const activeAgreement = agreements?.find((a: any) => !a.is_terminated)
        const terminatedAgreement = agreements?.find((a: any) => a.is_terminated)
        const firstListing = listingsData?.[0]

        setUser({
          owner_id: id,
          owner_name: profileRow.full_name || profileRow.email?.split('@')[0] || firstListing?.owner_name || 'Ukjent bruker',
          email: profileRow.email ?? null,
          role: profileRow.role ?? 'homeowner',
          updated_at: profileRow.updated_at ?? null,
          hasSigned: !!activeAgreement,
          signedAt: activeAgreement?.signed_at ?? null,
          isTerminated: !!terminatedAgreement,
          terminatedAt: terminatedAgreement?.terminated_at ?? null,
          contact_phone: firstListing?.contact_phone ?? null
        })
        setListings(listingsData || [])
        setHistory(logsData || [])
      } catch (err) {
        console.error('Error fetching user profile:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase()
    const from = historyDateFrom ? new Date(historyDateFrom) : null
    const to = historyDateTo ? new Date(historyDateTo + 'T23:59:59') : null
    return history.filter(log => {
      if (q) {
        const desc = formatAuditLogDescription(log).toLowerCase()
        const addr = (log.listing_address || '').toLowerCase()
        const action = (log.action_type || '').toLowerCase()
        if (!desc.includes(q) && !addr.includes(q) && !action.includes(q)) return false
      }
      if (from || to) {
        const d = new Date(log.created_at)
        if (from && d < from) return false
        if (to && d > to) return false
      }
      return true
    })
  }, [history, historySearch, historyDateFrom, historyDateTo])

  if (loading) {
    return (
      <main className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingPlaceholder minHeight={200} />
      </main>
    )
  }

  if (!user) return <div className="container">{t('notFound')}</div>

  const targetIsStaff = isKommuneStaffRole(user.role)
  const showLandlordPanels = !targetIsStaff
  const showChangeHistory = viewerIsKommuneAdmin

  if (regionAccessDenied) {
    const denyBody =
      regionDenyKind === 'staff'
        ? t('userProfileAccessDeniedStaff')
        : t('userProfileAccessDeniedHomeowner')
    return (
      <main className="container" style={{ padding: 'var(--space-10)', maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-main)', marginBottom: 'var(--space-3)' }}>{t('userProfileAccessDeniedTitle')}</h2>
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-6)' }}>{denyBody}</p>
        <Link href="/nav/users" className="button" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={18} /> {t('backToUsers')}
        </Link>
      </main>
    )
  }

  return (
    <main className="container">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <Link href="/nav/users/" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: '-1rem' }}>
          <ArrowLeft size={18} /> {t('backToUsers')}
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
            <User size={40} />
          </div>
          <div>
            <h1 style={{ fontSize: '2.5rem', margin: 0 }}>{user.owner_name}</h1>
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: '8px', opacity: 0.7 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={16} /> {user.contact_phone || t('noPhone')}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {(user as any).isTerminated ? (
                  <CheckCircle2 size={16} style={{ color: '#94a3b8' }} />
                ) : (
                  <ShieldCheck size={16} style={{ color: user.hasSigned ? 'var(--color-teal)' : '#ef4444' }} />
                )}
                {user.hasSigned ? `${t('termsSigned')} (${formatDateNo(user.signedAt)})` : (user as any).isTerminated ? `${t('expired')}${(user as any).terminatedAt ? ` (${formatDateNo((user as any).terminatedAt)})` : ''}` : t('termsNotSigned')}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={16} /> {user.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      {(showLandlordPanels || showChangeHistory) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: showLandlordPanels ? '1.5fr 1fr' : '1fr',
            gap: 'var(--space-8)',
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
            {showLandlordPanels && (
              <section className="card" style={{ padding: 'var(--space-6)' }}>
                <h3 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Home size={20} /> {t('registeredProperties')}
                </h3>
                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                  {listings.map(l => (
                    <div key={l.id} className="card" style={{ padding: 'var(--space-4)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Link href={`/listings/${l.id}?view=nav`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{l.address}</div>
                        </Link>
                        <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>{l.city} • {l.type}</div>
                      </div>
                      <Link href={`/listings/${l.id}?view=nav`} className="button" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>{t('seeProperty')}</Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {showChangeHistory && (
              <section className="card" style={{ padding: 'var(--space-6)' }}>
                <h3 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={20} /> {t('changeHistory')}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input
                      type="text"
                      placeholder={t('searchHistory')}
                      value={historySearch}
                      onChange={e => setHistorySearch(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 8, background: 'var(--bg-app)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: 'var(--space-2)',
                      alignItems: 'stretch',
                      width: '100%',
                    }}
                  >
                    <div style={{ flex: '1 1 0', minWidth: 0 }}>
                      <DateInput
                        showCalendar
                        className="input"
                        placeholder={t('dateInputPlaceholder')}
                        value={historyDateFrom}
                        onChange={setHistoryDateFrom}
                        max={historyDateTo || undefined}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-app)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div style={{ flex: '1 1 0', minWidth: 0 }}>
                      <DateInput
                        showCalendar
                        className="input"
                        placeholder={t('dateInputPlaceholder')}
                        value={historyDateTo}
                        onChange={setHistoryDateTo}
                        min={historyDateFrom || undefined}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-app)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                  {(historyExpanded ? filteredHistory : filteredHistory.slice(0, HISTORY_INITIAL_SHOW)).map(log => (
                    <div key={log.id} style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.9rem' }}>
                      <div style={{ fontWeight: 600 }}>{formatAuditLogDescription(log)}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{formatDateTimeNo(log.created_at)}</div>
                    </div>
                  ))}
                  {!historyExpanded && filteredHistory.length > HISTORY_INITIAL_SHOW && (
                    <button
                      type="button"
                      onClick={() => setHistoryExpanded(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-2)',
                        padding: 'var(--space-3)',
                        marginTop: 'var(--space-2)',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 8,
                        color: 'var(--color-accent)',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      <ChevronDown size={18} /> {t('showMoreHistory')} ({filteredHistory.length - HISTORY_INITIAL_SHOW})
                    </button>
                  )}
                  {history.length > 0 && filteredHistory.length === 0 && (
                    <p style={{ fontSize: '0.9rem', opacity: 0.6 }}>{t('noResults')}</p>
                  )}
                </div>
              </section>
            )}
          </div>

          {showLandlordPanels && (
            <aside style={{ display: 'grid', gap: 'var(--space-6)' }}>
              <section className="card" style={{ padding: 'var(--space-6)', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                  <MessageSquare size={20} style={{ color: 'var(--color-accent)' }} /> {t('chatWithLandlord')}
                </h3>
                <p className="text-sm" style={{ marginBottom: 'var(--space-4)', opacity: 0.9, color: 'var(--text-body)' }}>
                  {t('chatDesc')}
                </p>
                <Link
                  href={`/nav/messages?with=${id}`}
                  className="button"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: 'var(--space-3) var(--space-5)' }}
                >
                  <MessageSquare size={18} /> {t('openChat')}
                </Link>
              </section>
            </aside>
          )}
        </div>
      )}
    </main>
  )
}
