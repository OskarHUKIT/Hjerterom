'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { 
  User, ArrowLeft, Phone, Mail, Clock, MessageSquare, 
  ShieldCheck, Home, Loader2, Send
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface UserProfileClientProps {
  overrideId?: string | null
}

export default function UserProfileClient({ overrideId }: UserProfileClientProps = {}) {
  const params = useParams()
  const id = overrideId ?? params.id

  const [user, setUser] = useState<any>(null)
  const [listings, setListings] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .maybeSingle()
        
        if (profileError) throw profileError

        if (profileData) {
          const { data: agreements } = await supabase
            .from('user_agreements')
            .select('*')
            .eq('user_id', id)
            .eq('is_terminated', false)
          
          const activeAgreement = agreements?.find((a: any) => !a.is_terminated)
          
          setUser({
            owner_id: id,
            owner_name: profileData.full_name || profileData.email?.split('@')[0] || 'Ukjent bruker',
            email: profileData.email,
            role: profileData.role,
            updated_at: profileData.updated_at,
            hasSigned: !!activeAgreement,
            signedAt: activeAgreement?.signed_at
          })
        }

        const { data: listingsData } = await supabase
          .from('listings')
          .select('*')
          .eq('owner_id', id)
        
        setListings(listingsData || [])
        
        if (profileData && !profileData.full_name && listingsData && listingsData.length > 0) {
          setUser((prev: any) => ({
            ...prev,
            owner_name: listingsData[0].owner_name || prev?.owner_name,
            contact_phone: listingsData[0].contact_phone
          }))
        } else if (listingsData && listingsData.length > 0) {
          setUser((prev: any) => prev ? { ...prev, contact_phone: listingsData[0].contact_phone } : prev)
        }

        const { data: logsData } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('user_id', id)
          .order('created_at', { ascending: false })
        
        setHistory(logsData || [])
      } catch (err) {
        console.error('Error fetching user profile:', err)
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchData()
  }, [id])

  if (loading) return <div className="container" style={{ textAlign: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={48} /></div>

  if (!user) return <div className="container">Bruker ikke funnet.</div>

  return (
    <main className="container">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <Link href="/nav/users/" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: '-1rem' }}>
          <ArrowLeft size={18} /> Tilbake til brukere
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-sky-blue)' }}>
            <User size={40} />
          </div>
          <div>
            <h1 style={{ fontSize: '2.5rem', margin: 0 }}>{user.owner_name}</h1>
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: '8px', opacity: 0.7 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={16} /> {user.contact_phone || 'Ingen telefon registrert'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} style={{ color: user.hasSigned ? 'var(--color-teal)' : '#ef4444' }} /> 
                {user.hasSigned ? `Vilkår signert (${new Date(user.signedAt).toLocaleDateString()})` : 'Vilkår IKKE signert'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={16} /> {user.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-8)', alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
          <section className="card" style={{ padding: 'var(--space-6)' }}>
            <h3 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Home size={20} /> Registrerte boliger
            </h3>
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {listings.map(l => (
                <div key={l.id} className="card" style={{ padding: 'var(--space-4)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Link href={`/listings/${l.id}?view=nav`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-sky-blue)' }}>{l.address}</div>
                    </Link>
                    <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>{l.city} • {l.type}</div>
                  </div>
                  <Link href={`/listings/${l.id}?view=nav`} className="button" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Se bolig</Link>
                </div>
              ))}
            </div>
          </section>

          <section className="card" style={{ padding: 'var(--space-6)' }}>
            <h3 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} /> Endringshistorikk
            </h3>
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {history.map(log => (
                <div key={log.id} style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.9rem' }}>
                  <div style={{ fontWeight: 600 }}>{log.action_type}</div>
                  <div style={{ opacity: 0.7 }}>{log.listing_address || 'System'}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{new Date(log.created_at).toLocaleString('no-NO')}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside style={{ display: 'grid', gap: 'var(--space-6)' }}>
          <section className="card" style={{ padding: 'var(--space-6)', background: 'var(--color-dark-navy)', color: 'white' }}>
            <h3 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={20} style={{ color: 'var(--color-sky-blue)' }} /> Chat med utleier
            </h3>
            <div style={{ height: '300px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: 'var(--space-4)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              <p className="text-sm italic">Chat-modulen er under utvikling...</p>
            </div>
            <div style={{ position: 'relative' }}>
              <input className="input" placeholder="Skriv en melding..." disabled style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }} />
              <button disabled style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: 'var(--color-sky-blue)' }}><Send size={18} /></button>
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}
