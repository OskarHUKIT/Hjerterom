'use client'

import { use, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import HandoverReport from '../../../components/HandoverReport'

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> }

export default function ReportLeietakerPage(props: PageProps) {
  use(props.searchParams ?? Promise.resolve({}))
  const params = useParams()
  const token = params.token as string
  const [listing, setListing] = useState<{ listing_id: string; address: string; owner_name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    async function fetchListing() {
      const { data, error: rpcError } = await supabase.rpc('get_listing_by_tenant_token', { p_token: token })
      if (rpcError || !data || data.length === 0) {
        setError('Lenken er ugyldig eller har utløpt.')
        setLoading(false)
        return
      }
      setListing(data[0])
      setLoading(false)
    }
    if (token) fetchListing()
  }, [token])

  if (loading) {
    return (
      <main className="container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ padding: 'var(--space-8)' }}>Laster...</div>
      </main>
    )
  }

  if (error || !listing) {
    return (
      <main className="container" style={{ padding: 'var(--space-8)' }}>
        <p>{error || 'Kunne ikke laste boliginformasjon.'}</p>
        <Link href="/" className="nav-link" style={{ marginTop: 'var(--space-4)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={18} /> Til forsiden
        </Link>
      </main>
    )
  }

  if (submitted) {
    return (
      <main className="container" style={{ padding: 'var(--space-8)', maxWidth: '600px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-4)' }}>Takk!</h1>
        <p style={{ opacity: 0.9, marginBottom: 'var(--space-6)' }}>
          Overtakelsesrapporten er sendt inn til kommunen. Du kan lukke denne siden.
        </p>
        <Link href="/" className="button" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={18} /> Til forsiden
        </Link>
      </main>
    )
  }

  return (
    <main className="container" style={{ padding: 'var(--space-8)', maxWidth: '800px' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>Overtakelsesrapport – Leietaker</h1>
      <p style={{ opacity: 0.8, marginBottom: 'var(--space-6)' }}>
        Fyll ut overtakelsesrapporten for {listing.address}. Du trenger ikke logge inn – denne lenken er kun for deg.
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
