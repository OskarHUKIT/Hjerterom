'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Filter, MapPin, Users, Info, ChevronRight, Home as HomeIcon, ShieldCheck } from 'lucide-react'

// Mock data with "special" metadata for workers
const MOCK_LISTINGS = [
  {
    id: '1',
    address: 'Storgata 15',
    city: 'Oslo',
    price_per_night: 850,
    beds: 2,
    type: 'Leilighet',
    description: 'Lys og trivelig leilighet sentralt i Oslo. Passer for par eller enslige.',
    is_available: true,
    last_verified: 'I dag',
    distance_to_center: '5 min gange',
    energy_class: 'A'
  },
  {
    id: '2',
    address: 'Vika allé 4',
    city: 'Oslo',
    price_per_night: 1200,
    beds: 4,
    type: 'Enebolig',
    description: 'Stor enebolig med hage. Kort vei til kollektivtransport.',
    is_available: true,
    last_verified: '2 dager siden',
    distance_to_center: '12 min bane',
    energy_class: 'B'
  },
  {
    id: '3',
    address: 'Parkveien 12',
    city: 'Bergen',
    price_per_night: 700,
    beds: 1,
    type: 'Hybel',
    description: 'Rolig hybel med egen inngang. Inkluderer strøm og internett.',
    is_available: true,
    last_verified: 'I går',
    distance_to_center: '10 min gange',
    energy_class: 'C'
  }
]

export default function NavDatabase() {
  const [searchTerm, setSearchTerm] = useState('')
  const [listings, setListings] = useState(MOCK_LISTINGS)
  const [filterCity, setFilterCity] = useState('Alle')
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopyFeedback(text)
    setTimeout(() => setCopyFeedback(null), 2000)
  }

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
      <div style={{ marginBottom: 'var(--space-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Link href="/" className="nav-link" style={{ marginLeft: '-1rem', marginBottom: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            ← Oversikt
          </Link>
          <h1 style={{ fontSize: '2.75rem' }}>Boligbasen</h1>
          <p style={{ fontSize: '1.125rem', opacity: 0.8 }}>Effektivt verktøy for å finne trygge hjem til dine klienter.</p>
        </div>
        <div style={{ 
          background: 'rgba(59, 130, 246, 0.1)', 
          padding: 'var(--space-3) var(--space-5)', 
          borderRadius: '12px', 
          border: '1px solid rgba(59, 130, 246, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)'
        }}>
          <div style={{ width: '8px', height: '8px', background: 'var(--color-teal)', borderRadius: '50%', boxShadow: '0 0 10px var(--color-teal)' }}></div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Systemet er oppdatert</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Filters Sidebar */}
        <aside className="card no-hover" style={{ position: 'sticky', top: 'calc(var(--space-10) + 20px)', padding: 'var(--space-5)', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', fontSize: '1.1rem' }}>
            <Filter size={18} /> Filtrering
          </h3>
          
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label className="label" style={{ fontSize: '0.75rem' }}>Hurtigsøk</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="input" 
                placeholder="Adresse, bydel..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.75rem', marginBottom: 0 }}
              />
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '14px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-5)' }}>
            <label className="label" style={{ fontSize: '0.75rem' }}>Region</label>
            <select className="input" value={filterCity} onChange={(e) => setFilterCity(e.target.value)} style={{ marginBottom: 0 }}>
              <option value="Alle">Hele landet</option>
              <option value="Oslo">Oslo</option>
              <option value="Bergen">Bergen</option>
              <option value="Trondheim">Trondheim</option>
            </select>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <span className="text-sm">Treff i basen</span>
              <strong style={{ color: 'var(--color-sky-blue)' }}>{listings.length}</strong>
            </div>
            <p className="text-sm" style={{ opacity: 0.6, fontSize: '0.75rem' }}>Bruk piltastene for å navigere raskt (kommer snart).</p>
          </div>
        </aside>

        {/* Listings Grid */}
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {listings.length > 0 ? (
            listings.map((item, index) => (
              <div key={item.id} className={`card animate-delay-${(index % 3) + 1}`} style={{ 
                display: 'grid', 
                gridTemplateColumns: '160px 1fr auto', 
                gap: 'var(--space-6)', 
                alignItems: 'center',
                padding: 'var(--space-4)',
                background: 'rgba(15, 23, 42, 0.4)'
              }}>
                <div style={{ 
                  height: '110px', 
                  background: 'linear-gradient(135deg, rgba(125, 211, 252, 0.1) 0%, rgba(125, 211, 252, 0.05) 100%)', 
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-sky-blue)',
                  border: '1px solid rgba(125, 211, 252, 0.1)'
                }}>
                  <HomeIcon size={40} strokeWidth={1.2} />
                </div>
                
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                    <h3 style={{ margin: 0, fontSize: '1.35rem' }}>{item.address}</h3>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <span style={{ 
                        fontSize: '0.65rem', 
                        background: 'rgba(32, 187, 175, 0.1)', 
                        color: 'var(--color-teal)', 
                        padding: '2px 8px', 
                        borderRadius: '4px',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        {item.type}
                      </span>
                      <span style={{ 
                        fontSize: '0.65rem', 
                        background: 'rgba(59, 130, 246, 0.1)', 
                        color: 'var(--color-sky-blue)', 
                        padding: '2px 8px', 
                        borderRadius: '4px',
                        fontWeight: 700
                      }}>
                        Klasse {item.energy_class}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 'var(--space-5)', marginTop: 'var(--space-2)' }}>
                    <span className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} className="text-sky-blue" /> {item.city} • {item.distance_to_center}
                    </span>
                    <span className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} className="text-sky-blue" /> {item.beds} senger
                    </span>
                    <span className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-teal)' }}>
                      <ShieldCheck size={14} /> Verifisert: {item.last_verified}
                    </span>
                  </div>

                  <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)' }}>
                    <button 
                      onClick={() => handleCopy(item.address)}
                      className="text-sm"
                      style={{ 
                        background: 'rgba(255,255,255,0.05)', 
                        border: 'none', 
                        padding: '4px 10px', 
                        borderRadius: '6px', 
                        cursor: 'pointer',
                        color: copyFeedback === item.address ? 'var(--color-teal)' : 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {copyFeedback === item.address ? 'Kopiert!' : 'Kopier adresse'}
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
                  <div style={{ minWidth: '110px' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.75rem', color: 'var(--text-on-dark)', lineHeight: 1 }}>{item.price_per_night},-</div>
                    <div className="text-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '6px', opacity: 0.6 }}>per døgn</div>
                  </div>
                  <button className="button" style={{ padding: 'var(--space-4)', borderRadius: '14px' }}>
                    Se detaljer
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)', background: 'rgba(15, 23, 42, 0.4)' }}>
              <Info size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--color-muted-blue)' }} />
              <p>Ingen boliger matcher dine søkekriterier.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
