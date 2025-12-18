'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// Mock data for initial display
const MOCK_LISTINGS = [
  {
    id: '1',
    address: 'Storgata 15',
    city: 'Oslo',
    price_per_night: 850,
    beds: 2,
    type: 'Leilighet',
    description: 'Lys og trivelig leilighet sentralt i Oslo. Passer for par eller enslige.',
    is_available: true
  },
  {
    id: '2',
    address: 'Vika allé 4',
    city: 'Oslo',
    price_per_night: 1200,
    beds: 4,
    type: 'Enebolig',
    description: 'Stor enebolig med hage. Kort vei til kollektivtransport.',
    is_available: true
  },
  {
    id: '3',
    address: 'Parkveien 12',
    city: 'Bergen',
    price_per_night: 700,
    beds: 1,
    type: 'Hybel',
    description: 'Rolig hybel med egen inngang. Inkluderer strøm og internett.',
    is_available: true
  },
  {
    id: '4',
    address: 'Sjøveien 89',
    city: 'Trondheim',
    price_per_night: 950,
    beds: 3,
    type: 'Rekkehus',
    description: 'Moderne rekkehus i barnevennlig område.',
    is_available: true
  }
]

export default function NavDatabase() {
  const [searchTerm, setSearchTerm] = useState('')
  const [listings, setListings] = useState(MOCK_LISTINGS)
  const [filterCity, setFilterCity] = useState('Alle')

  // Filter logic
  useEffect(() => {
    const filtered = MOCK_LISTINGS.filter(item => {
      const matchesSearch = item.address.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCity = filterCity === 'Alle' || item.city === filterCity
      return matchesSearch && matchesCity
    })
    setListings(filtered)
  }, [searchTerm, filterCity])

  return (
    <main className="container">
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          ← Tilbake til portalen
        </Link>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-dark-navy)' }}>
          Boligbasen for NAV
        </h1>
        <p style={{ opacity: 0.8 }}>Søk og filtrer tilgjengelige boliger for korttidsleie.</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', background: 'var(--color-dark-navy)', color: 'white' }}>
        <div style={{ flex: 2, minWidth: '250px' }}>
          <label className="label" style={{ color: 'var(--color-sky-blue)' }}>Søk på adresse eller beskrivelse</label>
          <input 
            type="text" 
            className="input" 
            placeholder="F.eks. Storgata..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginBottom: 0 }}
          />
        </div>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label className="label" style={{ color: 'var(--color-sky-blue)' }}>By</label>
          <select 
            className="input" 
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            style={{ marginBottom: 0 }}
          >
            <option value="Alle">Alle byer</option>
            <option value="Oslo">Oslo</option>
            <option value="Bergen">Bergen</option>
            <option value="Trondheim">Trondheim</option>
          </select>
        </div>
      </div>

      {/* Listings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
        {listings.length > 0 ? (
          listings.map(item => (
            <div key={item.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: '200px', background: 'var(--color-muted-blue)', position: 'relative' }}>
                <div style={{ 
                  position: 'absolute', 
                  top: '1rem', 
                  right: '1rem', 
                  background: 'var(--color-teal)', 
                  color: 'white', 
                  padding: '0.4rem 0.8rem', 
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}>
                  {item.type}
                </div>
                <div style={{ 
                  height: '100%', 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '4rem',
                  opacity: 0.5
                }}>
                  🏠
                </div>
              </div>
              <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0 }}>{item.address}</h3>
                  <span style={{ fontWeight: 700, color: 'var(--color-royal-blue)', fontSize: '1.2rem' }}>{item.price_per_night},- <small style={{ fontSize: '0.7rem', opacity: 0.6 }}>/døgn</small></span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-dark-navy)', opacity: 0.6, marginBottom: '1rem' }}>{item.city}</p>
                <p style={{ fontSize: '1rem', marginBottom: '1.5rem', flex: 1 }}>{item.description}</p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', fontWeight: 600 }}>
                    <span>🛏️ {item.beds} senger</span>
                  </div>
                  <button className="button" style={{ padding: '0.5rem 1rem' }}>Se detaljer</button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem' }}>
            <p style={{ fontSize: '1.2rem', opacity: 0.6 }}>Ingen boliger matcher søket ditt.</p>
          </div>
        )}
      </div>
    </main>
  )
}

