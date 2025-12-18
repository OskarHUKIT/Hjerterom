'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Filter, MapPin, Users, Info, ChevronRight } from 'lucide-react'

// Mock data
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
      <div style={{ marginBottom: '3rem' }}>
        <Link href="/" className="nav-link" style={{ marginLeft: '-1rem', marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          ← Oversikt
        </Link>
        <h1 style={{ fontSize: '2.5rem' }}>Boligbasen</h1>
        <p>Søk i sanntid etter tilgjengelige korttidsboliger for klienter.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Filters Sidebar */}
        <aside className="card" style={{ position: 'sticky', top: '6rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Filter size={18} /> Filtrering
          </h3>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="label">Søk</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="input" 
                placeholder="Adresse eller beskrivelse..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="label">By</label>
            <select className="input" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
              <option value="Alle">Alle byer</option>
              <option value="Oslo">Oslo</option>
              <option value="Bergen">Bergen</option>
              <option value="Trondheim">Trondheim</option>
            </select>
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
            <p style={{ fontSize: '0.85rem' }}>
              Viser <strong>{listings.length}</strong> tilgjengelige boliger.
            </p>
          </div>
        </aside>

        {/* Listings Table/Grid */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          {listings.length > 0 ? (
            listings.map(item => (
              <div key={item.id} className="card" style={{ 
                display: 'grid', 
                gridTemplateColumns: '120px 1fr auto', 
                gap: '1.5rem', 
                alignItems: 'center',
                padding: '1rem'
              }}>
                <div style={{ 
                  height: '80px', 
                  background: 'var(--color-sky-blue)', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-dark-navy)',
                  opacity: 0.6
                }}>
                  <HomeIcon size={32} />
                </div>
                
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{item.address}</h3>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={14} /> {item.city}
                    </span>
                    <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Users size={14} /> {item.beds} senger
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-teal)', fontWeight: 600 }}>
                      {item.type}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-dark-navy)' }}>{item.price_per_night},-</div>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.6 }}>per døgn</div>
                  </div>
                  <button className="button" style={{ padding: '0.6rem' }}>
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '4rem', opacity: 0.6 }}>
              <Info size={48} style={{ margin: '0 auto 1rem' }} />
              <p>Ingen resultater for dette søket.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
