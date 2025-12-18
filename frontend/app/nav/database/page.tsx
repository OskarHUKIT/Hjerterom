'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Filter, MapPin, Users, Info, ChevronRight, Home as HomeIcon } from 'lucide-react'

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
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <Link href="/" className="nav-link" style={{ marginLeft: '-1rem', marginBottom: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          ← Oversikt
        </Link>
        <h1 style={{ fontSize: '2.75rem' }}>Boligbasen</h1>
        <p style={{ fontSize: '1.125rem' }}>Søk i sanntid etter tilgjengelige korttidsboliger for klienter.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Filters Sidebar */}
        <aside className="card" style={{ position: 'sticky', top: 'calc(var(--space-10) + 20px)', padding: 'var(--space-5)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', fontSize: '1.1rem' }}>
            <Filter size={18} /> Filtrering
          </h3>
          
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label className="label" style={{ fontSize: '0.75rem' }}>Søk på adresse</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="input" 
                placeholder="Gatenavn..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.75rem', marginBottom: 0 }}
              />
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '14px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-5)' }}>
            <label className="label" style={{ fontSize: '0.75rem' }}>By / Område</label>
            <select className="input" value={filterCity} onChange={(e) => setFilterCity(e.target.value)} style={{ marginBottom: 0 }}>
              <option value="Alle">Alle byer</option>
              <option value="Oslo">Oslo</option>
              <option value="Bergen">Bergen</option>
              <option value="Trondheim">Trondheim</option>
            </select>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-sm">Treff i databasen</span>
              <strong style={{ color: 'var(--color-dark-navy)' }}>{listings.length}</strong>
            </div>
          </div>
        </aside>

        {/* Listings Grid */}
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {listings.length > 0 ? (
            listings.map((item, index) => (
              <div key={item.id} className={`card animate-delay-${(index % 3) + 1}`} style={{ 
                display: 'grid', 
                gridTemplateColumns: '140px 1fr auto', 
                gap: 'var(--space-5)', 
                alignItems: 'center',
                padding: 'var(--space-4)'
              }}>
                <div style={{ 
                  height: '100px', 
                  background: 'linear-gradient(135deg, var(--color-sky-blue) 0%, rgba(170, 223, 240, 0.4) 100%)', 
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-dark-navy)',
                  opacity: 0.8
                }}>
                  <HomeIcon size={36} strokeWidth={1.5} />
                </div>
                
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{item.address}</h3>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      background: 'rgba(32, 187, 175, 0.1)', 
                      color: 'var(--color-dark-teal)', 
                      padding: '2px 8px', 
                      borderRadius: '4px',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      {item.type}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-1)' }}>
                    <span className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} /> {item.city}
                    </span>
                    <span className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={14} /> {item.beds} senger
                    </span>
                  </div>
                  <p style={{ fontSize: '0.95rem', marginTop: 'var(--space-2)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.description}
                  </p>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
                  <div style={{ minWidth: '100px' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--color-dark-navy)', lineHeight: 1 }}>{item.price_per_night},-</div>
                    <div className="text-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>per døgn</div>
                  </div>
                  <button className="button" style={{ padding: 'var(--space-3)', borderRadius: '12px' }}>
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)', opacity: 0.6 }}>
              <Info size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--color-muted-blue)' }} />
              <p>Ingen boliger matcher dine søkekriterier.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
