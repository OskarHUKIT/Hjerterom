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
      <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Link href="/" className="nav-link" style={{ marginLeft: '-1rem', marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            ← Oversikt
          </Link>
          <h1 style={{ fontSize: '2.5rem' }}>Mine utleieboliger</h1>
          <p>Administrer dine registrerte boliger og styr tilgjengelighet.</p>
        </div>
        <Link href="/homeowner/register" className="button">
          <Plus size={18} /> Registrer ny bolig
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Sidebar stats */}
        <div className="card" style={{ background: 'var(--color-dark-navy)', color: 'white', border: 'none' }}>
          <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <LayoutDashboard size={18} /> Status
          </h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.6, marginBottom: '0.25rem' }}>Totalt antall</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{myListings.length}</div>
            </div>
            <div style={{ padding: '1.25rem', background: 'rgba(32, 187, 175, 0.15)', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-sky-blue)', marginBottom: '0.25rem' }}>Aktive nå</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-teal)' }}>
                {myListings.filter(l => l.is_available).length}
              </div>
            </div>
          </div>
        </div>

        {/* Listings List */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          {myListings.map(listing => (
            <div key={listing.id} className="card" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '1.25rem 2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ color: 'var(--color-muted-blue)' }}>
                  <HomeIcon size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{listing.address}</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>{listing.city} • {listing.price_per_night},- /døgn</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {listing.is_available ? (
                    <CheckCircle2 size={18} style={{ color: 'var(--color-teal)' }} />
                  ) : (
                    <Circle size={18} style={{ color: 'var(--text-muted)' }} />
                  )}
                  <span style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: 600, 
                    color: listing.is_available ? 'var(--color-teal)' : 'var(--text-muted)',
                    width: '100px'
                  }}>
                    {listing.is_available ? 'TILGJENGELIG' : 'AVSKRUDD'}
                  </span>
                </div>

                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px' }}>
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
                    transition: '.3s',
                    borderRadius: '28px'
                  }}>
                    <span style={{ 
                      position: 'absolute', 
                      content: '""', 
                      height: '20px', 
                      width: '20px', 
                      left: listing.is_available ? '26px' : '4px', 
                      bottom: '4px', 
                      backgroundColor: 'white', 
                      transition: '.3s',
                      borderRadius: '50%',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
