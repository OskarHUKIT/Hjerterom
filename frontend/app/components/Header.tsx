'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import Logo from './Logo'
import { User, LogOut, LogIn, ChevronDown, LayoutDashboard, ShieldCheck } from 'lucide-react'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hasSignedTerms, setHasSignedTerms] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        checkAgreement(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        checkAgreement(session.user.id)
      } else {
        setHasSignedTerms(false)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkAgreement = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_agreements')
        .select('*')
        .eq('user_id', userId)
        .eq('is_terminated', false)
        .maybeSingle()
      
      setHasSignedTerms(!!data)
    } catch (err) {
      console.error('Error checking agreement:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <header className="header">
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 var(--space-4)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <Logo />
        </Link>
        
        <nav style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <Link href="/nav/database" className="nav-link">Boligbanken</Link>
          <Link href="/homeowner/manage" className="nav-link">For utleiere</Link>
          
          {loading ? (
            <div style={{ width: '100px' }}></div>
          ) : user ? (
            <div style={{ position: 'relative', marginLeft: 'var(--space-4)' }} className="user-menu-trigger">
              <button 
                className="button-login"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 'var(--space-2)',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-subtle)',
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: '10px',
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                <User size={18} />
                <span style={{ fontSize: '0.9rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email?.split('@')[0]}
                </span>
                <ChevronDown size={14} />
              </button>
              
              <div className="user-menu" style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 'var(--space-2)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                borderRadius: '12px',
                padding: 'var(--space-2)',
                minWidth: '220px',
                boxShadow: 'var(--shadow-xl)',
                zIndex: 1000,
                backdropFilter: 'blur(16px)'
              }}>
                <div style={{ padding: 'var(--space-2) var(--space-4)', borderBottom: '1px solid var(--border-subtle)', marginBottom: 'var(--space-2)' }}>
                  <p className="text-sm" style={{ fontWeight: 600, color: 'var(--color-sky-blue)' }}>Brukerpanel</p>
                </div>
                
                <Link href="/homeowner/manage" className="menu-item">
                  <LayoutDashboard size={16} /> Mine boliger
                </Link>
                
                <Link href="/homeowner/sign-terms" className="menu-item">
                  <ShieldCheck size={16} /> {hasSignedTerms ? 'Signert avtale' : 'Signer vilkår'}
                </Link>

                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: 'var(--space-2) 0' }}></div>

                <button 
                  onClick={handleLogout}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 'var(--space-2)',
                    width: '100%',
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    textAlign: 'left'
                  }}
                  className="menu-item-logout"
                >
                  <LogOut size={16} /> Logg ut
                </button>
              </div>
            </div>
          ) : (
            <Link 
              href="/login" 
              className="button" 
              style={{ 
                fontSize: '0.85rem', 
                padding: 'var(--space-2) var(--space-5)', 
                marginLeft: 'var(--space-2)',
                borderRadius: '10px'
              }}
            >
              <LogIn size={16} style={{ marginRight: '6px' }} /> Logg inn
            </Link>
          )}
        </nav>
      </div>

      <style jsx>{`
        .user-menu {
          display: none;
        }
        .user-menu-trigger:hover .user-menu {
          display: block;
        }
        .menu-item {
          display: flex;
          alignItems: center;
          gap: var(--space-2);
          width: 100%;
          padding: var(--space-3) var(--space-4);
          color: var(--text-main);
          text-decoration: none;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: background 0.2s;
        }
        .menu-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .menu-item-logout:hover {
          background: rgba(239, 68, 68, 0.1) !important;
        }
      `}</style>
    </header>
  )
}


