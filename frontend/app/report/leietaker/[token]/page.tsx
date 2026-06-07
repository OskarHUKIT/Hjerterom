'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import HandoverReport from '../../../components/HandoverReport'
import { useLanguage } from '../../../../context/LanguageContext'

export default function ReportLeietakerPage() {
  const { t } = useLanguage()
  const params = useParams()
  const tokenRaw = params.token
  const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw
  const [listing, setListing] = useState<{
    listing_id: string
    address: string
    owner_name: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    async function fetchListing() {
      const tokenNorm = (typeof token === 'string' ? token.trim() : '') || ''
      const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        tokenNorm
      )
      if (!tokenNorm || !isValidUuid) {
        setError('Lenken er ugyldig eller har utløpt.')
        setLoading(false)
        return
      }
      const { data, error: rpcError } = await supabase.rpc('get_listing_by_tenant_token', {
        p_token: tokenNorm,
      })
      if (rpcError) {
        setError('Lenken er ugyldig eller har utløpt.')
        setLoading(false)
        return
      }
      const row = Array.isArray(data) ? data[0] : data
      if (!row?.listing_id) {
        setError('Lenken er ugyldig eller har utløpt.')
        setLoading(false)
        return
      }
      setListing({
        listing_id: row.listing_id,
        address: row.address ?? '',
        owner_name: row.owner_name ?? '',
      })
      setLoading(false)
    }
    if (token) fetchListing()
  }, [token])

  if (loading) {
    return (
      <main
        className="container"
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="card" style={{ padding: 'var(--space-8)' }}>
          Laster...
        </div>
      </main>
    )
  }

  if (error || !listing) {
    return (
      <main className="container" style={{ padding: 'var(--space-8)', maxWidth: '520px' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-3)' }}>
          Lenken er ugyldig eller har utløpt
        </h1>
        <p style={{ marginBottom: 'var(--space-2)' }}>
          {error || 'Kunne ikke laste boliginformasjon.'}
        </p>
        <p style={{ fontSize: '0.95rem', opacity: 0.85, marginBottom: 'var(--space-6)' }}>
          Be utleier eller kommunen om en ny lenke til overtakelsesrapporten. Den kan genereres på
          nytt fra deres side.
        </p>
        <Link
          href="/"
          className="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={18} /> Til forsiden
        </Link>
      </main>
    )
  }

  if (submitted) {
    return (
      <main
        className="container"
        style={{ padding: 'var(--space-8)', maxWidth: '600px', textAlign: 'center' }}
      >
        <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-4)' }}>Takk!</h1>
        <p style={{ opacity: 0.9, marginBottom: 'var(--space-6)' }}>
          Overtakelsesrapporten er sendt inn til kommunen. Du kan lukke denne siden.
        </p>
        <Link
          href="/"
          className="button"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={18} /> Til forsiden
        </Link>
      </main>
    )
  }

  return (
    <main className="container" style={{ padding: 'var(--space-8)', maxWidth: '800px' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>
        {t('tenantHandoverPageTitle')}
      </h1>
      <p style={{ opacity: 0.85, marginBottom: 'var(--space-6)', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--text-main, #0f172a)' }}>{listing.address}</strong>
        <br />
        {t('tenantHandoverPageLead')}
      </p>
      <HandoverReport
        listingId={listing.listing_id}
        listingAddress={listing.address}
        ownerName={listing.owner_name}
        reporterType="tenant"
        tenantToken={token}
        onSaved={() => setSubmitted(true)}
      />
    </main>
  )
}
