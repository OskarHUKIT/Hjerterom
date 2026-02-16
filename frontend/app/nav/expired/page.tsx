'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  AlertCircle, History, UserX, Home, Search, 
  Loader2, Info, Clock, ChevronRight 
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function NavExpired() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [expiredListings, setExpiredListings] = useState<any[]>([])
  // ... rest of state ...

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const role = user.user_metadata?.role
      if (role === 'kommune_ansatt') {
        setIsAuthorized(true)
      } else {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        if (profile?.role === 'kommune_ansatt') {
          setIsAuthorized(true)
        } else {
          setIsAuthorized(false)
        }
      }
    }
    checkAccess()
  }, [router])

  useEffect(() => {
    if (isAuthorized) {
      fetchData()
    }
  }, [isAuthorized])

  if (isAuthorized === false) {
    return (
      <main className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: 'var(--space-10)' }}>
          <ShieldCheck size={64} style={{ color: '#ef4444', margin: '0 auto var(--space-6)' }} />
          <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-4)' }}>Ingen tilgang</h1>
          <p style={{ marginBottom: 'var(--space-8)', opacity: 0.8 }}>
            Denne siden er forbeholdt kommune-ansatte.
          </p>
          <Link href="/" className="button" style={{ width: '100%' }}>
            Tilbake til forsiden
          </Link>
        </div>
      </main>
    )
  }

  if (isAuthorized === null) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" size={48} color="var(--color-royal-blue)" />
      </div>
    )
  }

  return (
    <main className="container">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <Link href="/" className="nav-link" style={{ marginLeft: '-1rem', marginBottom: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          ← Oversikt
        </Link>
        <h1 style={{ fontSize: '2.75rem' }}>Utløpte & Inaktive</h1>
        <p style={{ fontSize: '1.125rem', opacity: 0.8 }}>Historisk oversikt over brukere og boliger som ikke lenger er aktive i Boligbanken.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
        <section>
          <h2 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserX size={24} className="text-muted" /> Inaktive Brukere
          </h2>
          {loading ? <Loader2 className="animate-spin" /> : terminatedUsers.length > 0 ? (
            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              {terminatedUsers.map(user => (
                <div key={user.id} className="card" style={{ padding: 'var(--space-4)', background: 'rgba(255,255,255,0.02)', opacity: 0.7 }}>
                  <div style={{ fontWeight: 600 }}>{user.profiles?.full_name || 'Navn ikke lagret'}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.5 }}>Utløpt: {new Date(user.terminated_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          ) : <p className="opacity-50 italic">Ingen inaktive brukere funnet.</p>}
        </section>

        <section>
          <h2 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Home size={24} className="text-muted" /> Utløpte Boliger
          </h2>
          {loading ? <Loader2 className="animate-spin" /> : expiredListings.length > 0 ? (
            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              {expiredListings.map(l => (
                <div key={l.id} className="card" style={{ padding: 'var(--space-4)', background: 'rgba(255,255,255,0.02)', opacity: 0.7 }}>
                  <div style={{ fontWeight: 600 }}>{l.address}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.5 }}>{l.city} • {l.owner_name}</div>
                </div>
              ))}
            </div>
          ) : <p className="opacity-50 italic">Ingen utløpte boliger funnet.</p>}
        </section>
      </div>
    </main>
  )
}
