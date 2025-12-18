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
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <Link href="/homeowner/manage" className="nav-link" style={{ marginLeft: '-1rem', marginBottom: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <ArrowLeft size={18} /> Avbryt
        </Link>
        <h1 style={{ fontSize: '2.75rem' }}>Registrer ny bolig</h1>
        <p style={{ maxWidth: '700px' }}>Fyll ut detaljene for din utleiebolig. Informasjonen brukes av NAV-ansatte for å vurdere boligens egnethet for deres klienter.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--space-6)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
          
          {/* Main Details Section */}
          <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
            <section className="form-section">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', color: 'var(--color-dark-navy)' }}>
                <MapPin size={20} /> Beliggenhet
              </h3>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label className="label">Gateadresse</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="F.eks. Storgata 1" 
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="form-grid">
                <div>
                  <label className="label">By / Sted</label>
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
                    maxLength={4}
                    value={formData.postalCode}
                    onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                  />
                </div>
              </div>
            </section>

            <section className="form-section">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', color: 'var(--color-dark-navy)' }}>
                <FileText size={20} /> Detaljer og beskrivelse
              </h3>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label className="label">Beskrivelse av boligen</label>
                <textarea 
                  className="input" 
                  style={{ minHeight: '160px' }}
                  placeholder="Fortell om boligen, fasiliteter og nærområdet..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>
              <div>
                <label className="label">Husregler og viktige opplysninger</label>
                <textarea 
                  className="input" 
                  placeholder="F.eks. røykfritt, ingen husdyr, parkering inkludert..."
                  value={formData.rules}
                  onChange={(e) => setFormData({...formData, rules: e.target.value})}
                ></textarea>
              </div>
            </section>
          </div>

          {/* Right Sidebar Details */}
          <div style={{ display: 'grid', gap: 'var(--space-6)', position: 'sticky', top: 'calc(var(--space-10) + 20px)' }}>
            <section className="form-section">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', color: 'var(--color-dark-navy)' }}>
                <Tag size={20} /> Pris og kapasitet
              </h3>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label className="label">Pris per døgn (NOK)</label>
                <input 
                  type="number" 
                  className="input" 
                  required
                  placeholder="0"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                />
              </div>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label className="label">Sengeplasser</label>
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
                <label className="label">Type bolig</label>
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
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', color: 'var(--color-dark-navy)' }}>
                <Camera size={20} /> Bilder
              </h3>
              <div style={{ 
                border: '2px dashed var(--border-medium)', 
                padding: 'var(--space-6)', 
                textAlign: 'center', 
                borderRadius: '16px',
                background: 'var(--bg-app)'
              }}>
                <div style={{ color: 'var(--color-muted-blue)', marginBottom: 'var(--space-3)' }}>
                  <Camera size={40} strokeWidth={1.5} style={{ margin: '0 auto' }} />
                </div>
                <p className="text-sm" style={{ marginBottom: 'var(--space-4)' }}>Last opp bilder for å vise boligen fra sin beste side.</p>
                <button type="button" className="button" style={{ backgroundColor: 'var(--color-muted-blue)', fontSize: '0.875rem' }}>
                  Velg filer
                </button>
              </div>
            </section>
          </div>
        </div>

        <div style={{ 
          marginTop: 'var(--space-4)', 
          padding: 'var(--space-5) var(--space-6)', 
          background: 'rgba(15, 23, 42, 0.9)', 
          borderRadius: '20px', 
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-medium)',
          display: 'flex',
          justifyContent: 'flex-end',
          position: 'sticky',
          bottom: 'var(--space-4)',
          zIndex: 10,
          backdropFilter: 'blur(16px)'
        }}>
          <button type="submit" className="button" style={{ padding: 'var(--space-4) var(--space-10)', fontSize: '1.125rem', borderRadius: '14px' }}>
            <Save size={22} /> Publiser og gjør tilgjengelig
          </button>
        </div>
      </form>
    </main>
  )
}

