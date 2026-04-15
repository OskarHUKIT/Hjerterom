'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { History, UserX, Home, ChevronRight, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatDateNo } from '../../lib/dateFormat'
import { useLanguage } from '../../../context/LanguageContext'
import { getOverviewBackLink } from '../../lib/overviewBackNav'
import LoadingPlaceholder from '../../components/LoadingPlaceholder'
import { Button } from '../../components/ui/Button'
import { useKommuneNavAccess } from '../../hooks/useKommuneNavAccess'

export default function NavExpired() {
  const { t } = useLanguage()
  const pathname = usePathname()
  const {
    data: access,
    isPending: accessPending,
    isError: accessError,
    error: accessQueryError,
    refetch: refetchKommuneAccess,
  } = useKommuneNavAccess()

  const isAuthorized: boolean | null =
    accessPending || access === undefined
      ? null
      : access.kind === 'unauthenticated'
        ? null
        : access.kind === 'ok'
          ? true
          : access.kind === 'forbidden'
            ? false
            : null
  const [expiredListings, setExpiredListings] = useState<any[]>([])
  const [terminatedUsers, setTerminatedUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: termAgreements } = await supabase
        .from('user_agreements')
        .select('user_id, terminated_at')
        .eq('is_terminated', true)

      const userIds = termAgreements?.map((a) => a.user_id) || []
      const usersWithTerminated = (termAgreements || []).map((a) => ({
        id: a.user_id,
        terminated_at: a.terminated_at,
        profiles: { full_name: null as string | null },
      }))

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds)

        profiles?.forEach((p) => {
          const u = usersWithTerminated.find((x) => x.id === p.id)
          if (u) u.profiles = { full_name: p.full_name }
        })
      }
      setTerminatedUsers(usersWithTerminated)

      if (userIds.length > 0) {
        const { data: listings } = await supabase
          .from('listings')
          .select('*')
          .in('owner_id', userIds)
        setExpiredListings(listings || [])
      } else {
        setExpiredListings([])
      }
    } catch (err) {
      console.error('Error fetching expired data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthorized) {
      fetchData()
    }
  }, [isAuthorized])

  if (isAuthorized === false) {
    return (
      <main className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div
          className="card"
          style={{ maxWidth: '500px', margin: '0 auto', padding: 'var(--space-10)' }}
        >
          <ShieldCheck size={64} style={{ color: '#ef4444', margin: '0 auto var(--space-6)' }} />
          <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-4)' }}>{t('noAccess')}</h1>
          <p style={{ marginBottom: 'var(--space-8)', opacity: 0.8 }}>{t('noAccessExpiredDesc')}</p>
          <Link href="/" className="button" style={{ width: '100%' }}>
            {t('goHome')}
          </Link>
        </div>
      </main>
    )
  }

  if (accessError) {
    return (
      <main className="container" style={{ padding: 'var(--space-8)' }}>
        <div className="card" style={{ padding: 'var(--space-6)', maxWidth: 480, margin: '0 auto' }}>
          <p style={{ marginBottom: 'var(--space-4)' }}>
            {accessQueryError instanceof Error ? accessQueryError.message : String(accessQueryError)}
          </p>
          <Button type="button" variant="primary" onClick={() => void refetchKommuneAccess()}>
            {t('retryLoad')}
          </Button>
        </div>
      </main>
    )
  }

  if (isAuthorized === null) {
    return (
      <main className="container">
        <LoadingPlaceholder minHeight={560} />
      </main>
    )
  }

  const overviewBack = getOverviewBackLink(pathname, 'kommune_ansatt', t)

  return (
    <main className="container">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        {overviewBack && (
          <Link
            href={overviewBack.href}
            className="nav-link"
            style={{
              marginLeft: '-1rem',
              marginBottom: 'var(--space-2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            ← {overviewBack.label}
          </Link>
        )}
        <h1 style={{ fontSize: '2.75rem' }}>{t('expiredAndInactive')}</h1>
        <p style={{ fontSize: '1.125rem', opacity: 0.8 }}>{t('expiredDesc')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
        <section>
          <h2
            style={{
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <UserX size={24} className="text-muted" /> Inaktive Brukere
          </h2>
          {loading ? (
            <div className="card" style={{ padding: 'var(--space-4)', minHeight: '80px' }} />
          ) : terminatedUsers.length > 0 ? (
            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              {terminatedUsers.map((user) => (
                <Link
                  key={user.id}
                  href={`/nav/users?id=${user.id}`}
                  className="card"
                  style={{
                    padding: 'var(--space-4)',
                    background: 'rgba(255,255,255,0.02)',
                    opacity: 0.9,
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    cursor: 'pointer',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {user.profiles?.full_name || t('nameNotStored')}
                    </div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.5 }}>
                      {t('expiredDate')}: {formatDateNo(user.terminated_at)}
                    </div>
                  </div>
                  <ChevronRight size={20} style={{ opacity: 0.6, flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="italic opacity-50">{t('noInactiveUsers')}</p>
          )}
        </section>

        <section>
          <h2
            style={{
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Home size={24} className="text-muted" /> {t('expiredProperties')}
          </h2>
          {loading ? (
            <div className="card" style={{ padding: 'var(--space-4)', minHeight: '80px' }} />
          ) : expiredListings.length > 0 ? (
            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              {expiredListings.map((l) => (
                <div
                  key={l.id}
                  className="card"
                  style={{
                    padding: 'var(--space-4)',
                    background: 'rgba(255,255,255,0.02)',
                    opacity: 0.7,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{l.address}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.5 }}>
                    {l.city} • {l.owner_name}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="italic opacity-50">{t('noExpiredProperties')}</p>
          )}
        </section>
      </div>
    </main>
  )
}
