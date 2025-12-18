'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, LayoutDashboard, Home as HomeIcon, CheckCircle2, Circle, ArrowRight } from 'lucide-react'

// Mock data
const INITIAL_MY_LISTINGS = [
  {
    id: '1',
    address: 'Storgata 15',
    city: 'Oslo',
    is_available: true,
    price_per_night: 850
  }
]

export default function HomeownerManage() {
  const [myListings, setMyListings] = useState(INITIAL_MY_LISTINGS)

  const toggleAvailability = (id: string) => {
    setMyListings(myListings.map(item => 
      item.id === id ? { ...item, is_available: !item.is_available } : item
    ))
  }

  return (
    <main className="container">
      <div style={{ marginBottom: 'var(--space-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Link href="/" className="nav-link" style={{ marginLeft: '-1rem', marginBottom: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            ← Oversikt
          </Link>
          <h1 style={{ fontSize: '2.75rem' }}>Mine utleieboliger</h1>
          <p style={{ fontSize: '1.125rem' }}>Administrer dine registrerte boliger og styr tilgjengelighet i sanntid.</p>
        </div>
        <Link href="/homeowner/register" className="button" style={{ padding: 'var(--space-4) var(--space-6)', borderRadius: '14px' }}>
          <Plus size={20} /> Registrer ny bolig
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Sidebar stats */}
        <div className="card no-hover" style={{ background: 'rgba(15, 23, 42, 0.8)', color: 'white', border: '1px solid var(--border-subtle)', padding: 'var(--space-6)', backdropFilter: 'blur(8px)' }}>
          <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', fontSize: '1.1rem' }}>
            <LayoutDashboard size={18} /> Oversikt
          </h3>
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <div style={{ padding: 'var(--space-4)', background: 'rgba(255,255,255,0.06)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.6, fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>Boliger totalt</div>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>{myListings.length}</div>
            </div>
            <div style={{ padding: 'var(--space-4)', background: 'rgba(32, 187, 175, 0.12)', borderRadius: '14px', border: '1px solid rgba(32, 187, 175, 0.2)' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-sky-blue)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>Aktive nå</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-teal)' }}>
                {myListings.filter(l => l.is_available).length}
              </div>
            </div>
          </div>
        </div>

        {/* Listings List */}
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {myListings.map((listing, index) => (
            <div key={listing.id} className={`card animate-delay-${(index % 3) + 1}`} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: 'var(--space-4) var(--space-6)',
              borderRadius: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
                <div style={{ 
                  width: '52px', 
                  height: '52px', 
                  background: 'var(--bg-app)', 
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-muted-blue)'
                }}>
                  <HomeIcon size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{listing.address}</h3>
                  <p className="text-sm" style={{ marginTop: '2px' }}>{listing.city} • <strong>{listing.price_per_night},-</strong> per døgn</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    backgroundColor: listing.is_available ? 'var(--color-teal)' : 'var(--text-muted)',
                    boxShadow: listing.is_available ? '0 0 8px var(--color-teal)' : 'none'
                  }}></div>
                  <span style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: 700, 
                    color: listing.is_available ? 'var(--color-teal)' : 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: '100px'
                  }}>
                    {listing.is_available ? 'Tilgjengelig' : 'Avskrudd'}
                  </span>
                </div>

                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '56px', height: '30px' }}>
                  <input 
                    type="checkbox" 
                    checked={listing.is_available} 
                    onChange={() => toggleAvailability(listing.id)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{ 
                    position: 'absolute', 
                    cursor: 'pointer', 
                    top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: listing.is_available ? 'var(--color-teal)' : '#e2e8f0',
                    transition: '.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderRadius: '30px',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                  }}>
                    <span style={{ 
                      position: 'absolute', 
                      content: '""', 
                      height: '22px', 
                      width: '22px', 
                      left: listing.is_available ? '30px' : '4px', 
                      bottom: '4px', 
                      backgroundColor: 'white', 
                      transition: '.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      borderRadius: '50%',
                      boxShadow: '0 2px 8px rgba(33, 51, 102, 0.15)'
                    }}></span>
                  </span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
