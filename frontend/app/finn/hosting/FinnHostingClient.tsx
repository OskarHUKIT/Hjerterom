'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { EmptyState, PageSkeleton } from '@/app/components/design-system'
import { buttonClassName } from '@/app/components/ui/Button'

type ListingRow = {
  id: string
  address: string
  city: string
  image_url: string | null
  tourism_enabled: boolean
}

async function fetchHostListings(userId: string): Promise<ListingRow[]> {
  const { data } = await supabase
    .from('listings')
    .select('id, address, city, image_url, tourism_enabled')
    .eq('owner_id', userId)
    .order('address')
    .limit(20)
  return (data ?? []) as ListingRow[]
}

export default function FinnHostingClient() {
  const { t } = useLanguage()
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const user = await getAuthUserDeduped()
      if (user?.id) {
        setUserId(user.id)
        const meta = user.user_metadata
        const name =
          typeof meta?.full_name === 'string'
            ? meta.full_name
            : typeof meta?.name === 'string'
              ? meta.name
              : user.email?.split('@')[0] ?? null
        setDisplayName(name)
      }
      setAuthLoading(false)
    })()
  }, [])

  const { data: listings = [], isPending } = useQuery({
    queryKey: ['finn', 'hosting', userId],
    queryFn: () => fetchHostListings(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })

  if (authLoading || (userId && isPending)) {
    return <PageSkeleton minHeight={240} />
  }

  if (!userId) {
    return (
      <div style={{ paddingTop: 16 }}>
        <h2 className="finn-page-title">{t('finnHostingTitle')}</h2>
        <p className="finn-page-lead">{t('finnHostingGuestLead')}</p>
        <EmptyState
          title={t('finnHostingLoginTitle')}
          description={t('finnHostingLoginDesc')}
          action={
            <Link href="/login?redirect=/homeowner/manage" className={buttonClassName('accent')}>
              {t('finnHostingPortalCta')}
            </Link>
          }
        />
      </div>
    )
  }

  const tourismCount = listings.filter((l) => l.tourism_enabled).length

  return (
    <div style={{ paddingTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 className="finn-page-title">
            {t('finnHostingGreeting').replace('{name}', displayName ?? '')}
          </h2>
          <p className="finn-page-lead" style={{ marginBottom: 0 }}>
            {t('finnHostingLead')}
          </p>
        </div>
        <span className="finn-avatar" aria-hidden>
          {(displayName ?? 'H').charAt(0).toUpperCase()}
        </span>
      </div>

      <div
        className="finn-anim-fade-up finn-stagger-1"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}
      >
        {[
          { value: String(listings.length), label: t('finnHostingStatListings') },
          { value: String(tourismCount), label: t('finnHostingStatNights'), accent: true },
          { value: '—', label: t('finnHostingStatEarned') },
        ].map(({ value, label, accent }) => (
          <div
            key={label}
            style={{
              padding: 12,
              borderRadius: 12,
              border: '1px solid var(--finn-border)',
              background: 'var(--finn-bg-elevated)',
              textAlign: 'center',
            }}
          >
            <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: accent ? 'var(--finn-lane)' : 'var(--finn-text)' }}>
              {value}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '0.625rem', color: 'var(--finn-text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      <div
        className="finn-anim-fade-up finn-stagger-2"
        style={{
          padding: 16,
          borderRadius: 12,
          border: '1px solid var(--finn-border)',
          background: 'var(--finn-bg-elevated)',
          marginBottom: 20,
        }}
      >
        <h3 style={{ margin: '0 0 12px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--finn-text-muted)' }}>
          {t('finnHostingActiveLanes')}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--finn-lane)' }} aria-hidden />
            <span style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600 }}>{t('finnLaneTourism')}</p>
              <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--finn-text-muted)' }}>
                {t('finnHostingTourismActive').replace('{count}', String(tourismCount))}
              </p>
            </span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'color-mix(in srgb, var(--ds-success) 10%, transparent)', color: 'var(--ds-success)' }}>
              {t('finnHostingLive')}
            </span>
          </div>
        </div>
      </div>

      <h3 style={{ margin: '0 0 12px', fontSize: '0.875rem', fontWeight: 600 }}>{t('finnHostingYourListings')}</h3>

      {listings.length === 0 ? (
        <EmptyState
          title={t('finnHostingNoListings')}
          description={t('finnHostingNoListingsDesc')}
          action={
            <Link href="/homeowner/register" className={buttonClassName('accent')}>
              {t('finnHostingAddListing')}
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {listings.map((listing, i) => (
            <Link
              key={listing.id}
              href={`/homeowner/manage/${listing.id}`}
              className={`finn-inbox-row finn-anim-fade-up finn-stagger-${Math.min(i + 1, 4)}`}
              style={{ textDecoration: 'none' }}
            >
              <span
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 8,
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: 'var(--finn-bg-muted)',
                }}
              >
                {listing.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={listing.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : null}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {listing.address}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.625rem', color: 'var(--finn-text-secondary)' }}>
                  {listing.tourism_enabled ? t('finnLaneTourism') : t('finnHostingListingPaused')}
                </p>
              </span>
              <ChevronRight size={16} style={{ color: 'var(--finn-text-muted)' }} aria-hidden />
            </Link>
          ))}
        </div>
      )}

      <div
        className="finn-anim-fade-up finn-stagger-3"
        style={{
          padding: 16,
          borderRadius: 12,
          border: '1px solid color-mix(in srgb, var(--ds-warning) 20%, transparent)',
          background: 'color-mix(in srgb, var(--ds-warning) 10%, transparent)',
        }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <AlertTriangle size={20} style={{ color: 'var(--ds-warning)', flexShrink: 0 }} aria-hidden />
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--ds-warning)' }}>
              {t('finnHostingActionRequired')}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '0.6875rem', color: 'var(--finn-text-secondary)' }}>
              {t('finnHostingBankIdHint')}
            </p>
            <Link href="/homeowner/agreements" className={buttonClassName('secondary')} style={{ marginTop: 8, display: 'inline-flex', fontSize: '0.6875rem' }}>
              {t('finnHostingCompleteNow')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
