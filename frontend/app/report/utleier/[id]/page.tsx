'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { supabase, getAuthUserDeduped } from '../../../lib/supabase'
import HandoverReport from '../../../components/HandoverReport'

export default function ReportUtleierPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      const user = await getAuthUserDeduped()
      if (!user) {
        router.push(`/login?redirect=/report/utleier/${id}`)
        return
      }

      const { data, error } = await supabase
        .from('listings')
        .select('id, address, owner_id, owner_name')
        .eq('id', id)
        .single()

      if (error || !data) {
        setLoading(false)
        return
      }

      if (data.owner_id !== user.id) {
        router.push('/')
        return
      }

      setListing(data)
      setLoading(false)
    }
    if (id) check()
  }, [id, router])

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

  if (!listing) {
    return (
      <main className="container" style={{ padding: 'var(--space-8)' }}>
        <p>Boligen finnes ikke eller du har ikke tilgang.</p>
        <Link
          href="/homeowner/manage"
          className="nav-link"
          style={{
            marginTop: 'var(--space-4)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ArrowLeft size={18} /> Tilbake til mine boliger
        </Link>
      </main>
    )
  }

  return (
    <main className="container" style={{ padding: 'var(--space-8)', maxWidth: '800px' }}>
      <Link
        href="/homeowner/manage"
        className="nav-link"
        style={{
          marginBottom: 'var(--space-4)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <ArrowLeft size={18} /> Tilbake til mine boliger
      </Link>
      <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>Overtakelsesrapport</h1>
      <p style={{ opacity: 0.8, marginBottom: 'var(--space-6)' }}>
        Fyll ut overtakelsesrapporten for {listing.address}. Denne leveres til kommunen når boligen
        er overtatt.
      </p>
      <HandoverReport
        listingId={listing.id}
        listingAddress={listing.address}
        ownerName={listing.owner_name}
        reporterType="homeowner"
        onSaved={() => router.push(`/listings/${id}`)}
      />
    </main>
  )
}
