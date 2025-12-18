'use client'

import { useState } from 'react'
import Link from 'next/link'

// Mock data for user's listings
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
  const [showAddForm, setShowAddForm] = useState(false)
  const [newListing, setNewListing] = useState({
    address: '',
    city: 'Oslo',
    price: '',
    description: ''
  })

  const toggleAvailability = (id: string) => {
    setMyListings(myListings.map(item => 
      item.id === id ? { ...item, is_available: !item.is_available } : item
    ))
  }

  const handleAddListing = (e: React.FormEvent) => {
    e.preventDefault()
    const item = {
      id: Date.now().toString(),
      address: newListing.address,
      city: newListing.city,
      is_available: true,
      price_per_night: parseInt(newListing.price)
    }
    setMyListings([...myListings, item])
    setShowAddForm(false)
    setNewListing({ address: '', city: 'Oslo', price: '', description: '' })
  }

  return (
    <main className="container">
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          ← Tilbake til portalen
        </Link>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-dark-navy)' }}>
          Administrer dine boliger
        </h1>
        <p style={{ opacity: 0.8 }}>Her kan du legge til nye boliger og styre tilgjengelighet for eksisterende utleieenheter.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left: Summary and Actions */}
        <div style={{ position: 'sticky', top: '2rem' }}>
          <div className="card" style={{ background: 'var(--color-dark-navy)', color: 'white' }}>
            <h2 style={{ color: 'white', marginBottom: '1.5rem', fontSize: '1.5rem' }}>Dine statistikker</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Totale utleieenheter</div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>{myListings.length}</div>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(32, 187, 175, 0.2)', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Aktive nå</div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>{myListings.filter(l => l.is_available).length}</div>
              </div>
            </div>
            <button 
              className="button button-accent" 
              style={{ width: '100%', marginTop: '2rem' }}
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? 'Avbryt' : '+ Legg til ny bolig'}
            </button>
          </div>
        </div>

        {/* Right: Listings and Form */}
        <div>
          {showAddForm && (
            <div className="card" style={{ border: '2px solid var(--color-teal)', animation: 'slideDown 0.3s ease' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Ny utleiebolig</h2>
              <form onSubmit={handleAddListing}>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="label">Adresse</label>
                  <input 
                    type="text" 
                    className="input" 
                    required 
                    value={newListing.address}
                    onChange={(e) => setNewListing({...newListing, address: e.target.value})}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="label">By</label>
                    <select 
                      className="input"
                      value={newListing.city}
                      onChange={(e) => setNewListing({...newListing, city: e.target.value})}
                    >
                      <option>Oslo</option>
                      <option>Bergen</option>
                      <option>Trondheim</option>
                      <option>Stavanger</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Pris per døgn (NOK)</label>
                    <input 
                      type="number" 
                      className="input" 
                      required 
                      value={newListing.price}
                      onChange={(e) => setNewListing({...newListing, price: e.target.value})}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="label">Kort beskrivelse</label>
                  <textarea 
                    className="input" 
                    style={{ minHeight: '100px', resize: 'vertical' }}
                    value={newListing.description}
                    onChange={(e) => setNewListing({...newListing, description: e.target.value})}
                  ></textarea>
                </div>
                <button type="submit" className="button" style={{ width: '100%' }}>Publiser bolig</button>
              </form>
            </div>
          )}

          <h2 style={{ marginBottom: '1.5rem' }}>Mine boliger</h2>
          {myListings.map(listing => (
            <div key={listing.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>{listing.address}</h3>
                <p style={{ margin: 0, opacity: 0.6 }}>{listing.city} • {listing.price_per_night},- per døgn</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 600, 
                  color: listing.is_available ? 'var(--color-teal)' : 'var(--color-muted-blue)'
                }}>
                  {listing.is_available ? 'TILGJENGELIG' : 'AVSKRUDD'}
                </span>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
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
                    backgroundColor: listing.is_available ? 'var(--color-teal)' : '#ccc',
                    transition: '.4s',
                    borderRadius: '34px'
                  }}>
                    <span style={{ 
                      position: 'absolute', 
                      content: '""', 
                      height: '26px', 
                      width: '26px', 
                      left: listing.is_available ? '26px' : '4px', 
                      bottom: '4px', 
                      backgroundColor: 'white', 
                      transition: '.4s',
                      borderRadius: '50%'
                    }}></span>
                  </span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  )
}

