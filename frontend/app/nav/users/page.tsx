'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  User, Search, Mail, Phone, Calendar, ChevronRight, 
  MessageSquare, FileText, Clock, ShieldCheck, Info
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import UserProfileClient from './UserProfileClient'

function NavUsersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('id')
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Sjekk om brukeren er kommuneansatt (sjekk både metadata og profil)
      const metadataRole = user.user_metadata?.role
      const { data: currentProfile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      
      const userRole = metadataRole || currentProfile?.role
      
      if (userRole !== 'kommune_ansatt') {
        console.warn("Bruker har ikke kommune-tilgang:", userRole)
        setUsers([])
        setLoading(false)
        return
      }

      // 1. Hent alle brukere via RPC (inkl. nye BankID-brukere fra auth.users)
      const { data: profiles, error: profileError } = await supabase.rpc('get_all_users_for_kommune')
      
      if (profileError) {
        console.error('RPC get_all_users_for_kommune feilet, prøver profiles direkte:', profileError)
        const fallback = await supabase.from('profiles').select('id, full_name, email, role, updated_at').order('full_name', { ascending: true })
        if (fallback.error) throw fallback.error
        const { data: agreements } = await supabase.from('user_agreements').select('user_id, signed_at, is_terminated')
        setUsers((fallback.data || []).map((p: any) => {
          const activeAgreement = agreements?.find((a: any) => a.user_id === p.id && !a.is_terminated)
          return {
            owner_id: p.id,
            owner_name: p.full_name || p.email?.split('@')[0] || 'Ukjent bruker',
            contact_phone: '',
            role: p.role,
            hasSigned: !!activeAgreement,
            signedAt: activeAgreement?.signed_at
          }
        }))
        setLoading(false)
        return
      }

      // 2. Hent alle avtaler separat
      const { data: agreements } = await supabase
        .from('user_agreements')
        .select('user_id, signed_at, is_terminated')
      
      // 3. Koble sammen
      const mappedUsers = (profiles || []).map((p: any) => {
        const activeAgreement = agreements?.find(a => a.user_id === p.id && !a.is_terminated)
        return {
          owner_id: p.id,
          owner_name: p.full_name || p.email?.split('@')[0] || 'Ukjent bruker',
          contact_phone: '',
          role: p.role,
          hasSigned: !!activeAgreement,
          signedAt: activeAgreement?.signed_at
        }
      })

      console.log("Hentet brukere:", mappedUsers.length)
      setUsers(mappedUsers)
    } catch (err: any) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = users.filter(u => 
    u.owner_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Show user profile when ?id= is present (avoids dynamic route + generateStaticParams)
  if (userId) {
    return <UserProfileClient overrideId={userId} />
  }

  return (
    <main className="container">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <Link href="/" className="nav-link" style={{ marginLeft: '-1rem', marginBottom: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          ← Oversikt
        </Link>
        <h1 style={{ fontSize: '2.75rem' }}>Brukere</h1>
        <p style={{ fontSize: '1.125rem', opacity: 0.8 }}>Oversikt over alle registrerte utleiere i Boligbanken.</p>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
        <div style={{ position: 'relative' }}>
          <input 
            type="text" 
            className="input" 
            placeholder="Søk etter navn..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            style={{ paddingLeft: '2.5rem', marginBottom: 0 }} 
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', opacity: 0.5 }} />
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 'var(--space-10)', minHeight: '200px' }} />
      ) : filteredUsers.length > 0 ? (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {filteredUsers.map(user => (
            <div 
              key={user.owner_id} 
              className="card user-card" 
              onClick={() => router.push(`/nav/users?id=${user.owner_id}`)}
              style={{ padding: 'var(--space-6)', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <div className="user-card-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-sky-blue)' }}>
                    <User size={28} />
                  </div>
                  <div>
                    <Link 
                      href={`/nav/users?id=${user.owner_id}`} 
                      style={{ textDecoration: 'none', color: 'inherit' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 style={{ margin: 0, color: 'var(--color-sky-blue)' }}>{user.owner_name || 'Ukjent bruker'}</h3>
                    </Link>
                    <div className="user-card-meta" style={{ display: 'flex', gap: 'var(--space-4)', marginTop: '4px', fontSize: '0.9rem', opacity: 0.7, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={14} /> {user.contact_phone || 'Ingen telefon'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShieldCheck size={14} style={{ color: user.hasSigned ? 'var(--color-teal)' : '#ef4444' }} /> 
                        {user.hasSigned ? `Signert (${new Date(user.signedAt).toLocaleDateString()})` : 'Ikke signert'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={14} style={{ color: user.role === 'kommune_ansatt' ? 'var(--color-sky-blue)' : 'inherit' }} /> 
                        {user.role === 'kommune_ansatt' ? 'Kommuneansatt' : 'Utleier'}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <Link
                    href={`/nav/messages?with=${user.owner_id}`}
                    className="button"
                    style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MessageSquare size={16} style={{ marginRight: '8px' }} /> Chat
                  </Link>
                  <button className="button" style={{ padding: '8px 16px' }}>
                    Se profil <ChevronRight size={16} style={{ marginLeft: '4px' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <Info size={40} style={{ margin: '0 auto var(--space-3)', opacity: 0.3 }} />
          <p>Ingen brukere matcher søket.</p>
        </div>
      )}

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
