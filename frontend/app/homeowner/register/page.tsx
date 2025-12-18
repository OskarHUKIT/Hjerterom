'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, MapPin, Bed, Tag, FileText, Camera } from 'lucide-react'

export default function HomeownerRegister() {
  const [formData, setFormData] = useState({
    address: '',
    city: 'Oslo',
    postalCode: '',
    price: '',
    beds: '1',
    propertyType: 'Leilighet',
    description: '',
    rules: '',
    contactName: '',
    contactPhone: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Logic to save to Supabase would go here
    alert('Bolig registrert! (Demo)')
    window.location.href = '/homeowner/manage'
  }

  return (
    <main className="container">
      <div style={{ marginBottom: '3rem' }}>
        <Link href="/homeowner/manage" className="nav-link" style={{ marginLeft: '-1rem', marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={18} /> Avbryt og gå tilbake
        </Link>
        <h1 style={{ fontSize: '2.5rem' }}>Registrer ny utleiebolig</h1>
        <p>Fyll ut detaljene for din bolig. Jo mer info du legger til, jo enklere er det for NAV-ansatte å vurdere boligen.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '2rem' }}>
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          
          {/* Main Details Section */}
          <div style={{ display: 'grid', gap: '2rem' }}>
            <section className="form-section">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <MapPin size={18} /> Adresse og Beliggenhet
              </h3>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Adresse</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Gatenavn og nummer" 
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="form-grid">
                <div>
                  <label className="label">By</label>
                  <select 
                    className="input"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                  >
                    <option>Oslo</option>
                    <option>Bergen</option>
                    <option>Trondheim</option>
                    <option>Stavanger</option>
                    <option>Kristiansand</option>
                  </select>
                </div>
                <div>
                  <label className="label">Postnummer</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="4 siffer"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                  />
                </div>
              </div>
            </section>

            <section className="form-section">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <FileText size={18} /> Beskrivelse
              </h3>
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">Kort oppsummering</label>
                <textarea 
                  className="input" 
                  style={{ minHeight: '120px' }}
                  placeholder="Beskriv boligen, nabolaget og hvem den passer for..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>
              <div>
                <label className="label">Husregler (valgfritt)</label>
                <textarea 
                  className="input" 
                  placeholder="F.eks. røyking forbudt, ingen husdyr..."
                  value={formData.rules}
                  onChange={(e) => setFormData({...formData, rules: e.target.value})}
                ></textarea>
              </div>
            </section>
          </div>

          {/* Right Sidebar Details */}
          <div style={{ display: 'grid', gap: '2rem' }}>
            <section className="form-section">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <Tag size={18} /> Pris og Kapasitet
              </h3>
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">Pris per døgn (NOK)</label>
                <input 
                  type="number" 
                  className="input" 
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">Antall sengeplasser</label>
                <select 
                  className="input"
                  value={formData.beds}
                  onChange={(e) => setFormData({...formData, beds: e.target.value})}
                >
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                  <option>5+</option>
                </select>
              </div>
              <div>
                <label className="label">Boligtype</label>
                <select 
                  className="input"
                  value={formData.propertyType}
                  onChange={(e) => setFormData({...formData, propertyType: e.target.value})}
                >
                  <option>Leilighet</option>
                  <option>Enebolig</option>
                  <option>Rekkehus</option>
                  <option>Hybel</option>
                </select>
              </div>
            </section>

            <section className="form-section">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <Camera size={18} /> Bilder
              </h3>
              <div style={{ 
                border: '2px dashed var(--border-light)', 
                padding: '2rem', 
                textAlign: 'center', 
                borderRadius: '8px',
                background: 'var(--background-light)'
              }}>
                <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Last opp bilder av boligen</p>
                <button type="button" className="button" style={{ background: 'var(--color-muted-blue)', fontSize: '0.85rem' }}> Velg filer</button>
              </div>
            </section>
          </div>
        </div>

        <div style={{ 
          marginTop: '2rem', 
          padding: '2rem', 
          background: 'white', 
          borderRadius: '12px', 
          boxShadow: '0 -10px 25px -5px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'flex-end',
          position: 'sticky',
          bottom: '2rem',
          zIndex: 10
        }}>
          <button type="submit" className="button" style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>
            <Save size={20} /> Publiser og gjør tilgjengelig
          </button>
        </div>
      </form>
    </main>
  )
}

