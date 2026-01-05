'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { 
  MapPin, 
  Bed, 
  Users, 
  ShieldCheck, 
  ArrowLeft, 
  Calendar, 
  Info, 
  Phone, 
  User, 
  Home as HomeIcon,
  Loader2,
  CheckCircle2
} from 'lucide-react'

export default function ListingDetails() {
  const { id } = useParams()
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchListing() {
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        setListing(data)
      } catch (err) {
        console.error('Error fetching listing:', err)
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchListing()
  }, [id])

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" size={48} color="var(--color-royal-blue)" />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
        <h2>Boligen ble ikke funnet</h2>
        <Link href="/nav/database" className="button" style={{ marginTop: 'var(--space-4)' }}>
          Tilbake til boligbasen
        </Link>
      </div>
    )
  }

  return (
    <main className="container">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link href="/nav/database" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', marginLeft: '-1rem' }}>
          <ArrowLeft size={18} /> Tilbake til boligbasen
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-8)', alignItems: 'start' }}>
        {/* Left Column: Media and Description */}
        <div>
          <div style={{ 
            width: '100%', 
            aspectRatio: '16/9', 
            background: 'rgba(15, 23, 42, 0.6)', 
            borderRadius: '24px',
            overflow: 'hidden',
            border: '1px solid var(--border-medium)',
            position: 'relative',
            marginBottom: 'var(--space-6)'
          }}>
            {listing.image_url ? (
              <img 
                src={listing.image_url} 
                alt={listing.address} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-sky-blue)', opacity: 0.5 }}>
                <HomeIcon size={120} strokeWidth={1} />
              </div>
            )}
            
            <div style={{ 
              position: 'absolute', 
              top: 'var(--space-4)', 
              left: 'var(--space-4)',
              background: 'rgba(45, 212, 191, 0.9)',
              color: 'white',
              padding: '6px 16px',
              borderRadius: '30px',
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              backdropFilter: 'blur(8px)'
            }}>
              {listing.type}
            </div>
          </div>

          <section className="card" style={{ padding: 'var(--space-8)' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>{listing.address}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--color-sky-blue)', marginBottom: 'var(--space-6)' }}>
              <MapPin size={20} />
              <span style={{ fontSize: '1.2rem' }}>{listing.city} {listing.postal_code}</span>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: 'var(--space-4)',
              marginBottom: 'var(--space-8)',
              borderTop: '1px solid var(--border-subtle)',
              borderBottom: '1px solid var(--border-subtle)',
              padding: 'var(--space-6) 0'
            }}>
              <div style={{ textAlign: 'center' }}>
                <Bed size={24} style={{ color: 'var(--color-sky-blue)', marginBottom: 'var(--space-2)' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{listing.beds}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase' }}>Sengeplasser</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <ShieldCheck size={24} style={{ color: 'var(--color-teal)', marginBottom: 'var(--space-2)' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Klasse {listing.energy_class || 'C'}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase' }}>Energiklasse</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Calendar size={24} style={{ color: 'var(--color-sky-blue)', marginBottom: 'var(--space-2)' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Umiddelbart</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase' }}>Ledighet</div>
              </div>
            </div>

            <h3 style={{ marginBottom: 'var(--space-4)' }}>Om boligen</h3>
            <p style={{ whiteSpace: 'pre-wrap', marginBottom: 'var(--space-8)' }}>
              {listing.description || 'Ingen beskrivelse tilgjengelig.'}
            </p>

            {listing.rules && (
              <>
                <h3 style={{ marginBottom: 'var(--space-4)' }}>Husregler</h3>
                <p style={{ whiteSpace: 'pre-wrap', marginBottom: 'var(--space-8)', fontSize: '1rem', opacity: 0.8 }}>
                  {listing.rules}
                </p>
              </>
            )}
          </section>
        </div>

        {/* Right Column: Contact and Booking Info */}
        <div style={{ position: 'sticky', top: 'var(--space-10)' }}>
          <div className="card" style={{ 
            padding: 'var(--space-8)', 
            background: 'var(--color-dark-navy)', 
            border: '1px solid var(--color-royal-blue)'
          }}>
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{listing.price_per_night},-</span>
              <span style={{ fontSize: '1rem', opacity: 0.6, marginLeft: 'var(--space-2)' }}>per døgn</span>
            </div>

            <div style={{ display: 'grid', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
              <div style={{ 
                padding: 'var(--space-4)', 
                background: 'rgba(255,255,255,0.05)', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)'
              }}>
                <CheckCircle2 size={18} style={{ color: 'var(--color-teal)' }} />
                <span style={{ fontSize: '0.9rem' }}>Strøm og internett inkludert</span>
              </div>
              <div style={{ 
                padding: 'var(--space-4)', 
                background: 'rgba(255,255,255,0.05)', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)'
              }}>
                <CheckCircle2 size={18} style={{ color: 'var(--color-teal)' }} />
                <span style={{ fontSize: '0.9rem' }}>Standard NAV-leiekontrakt</span>
              </div>
            </div>

            <button className="button" style={{ width: '100%', padding: 'var(--space-4)', fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>
              Start formidling
            </button>
            <button className="button" style={{ 
              width: '100%', 
              padding: 'var(--space-4)', 
              background: 'none', 
              border: '1px solid var(--border-medium)',
              fontSize: '1rem'
            }}>
              Kontakt saksbehandler
            </button>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-6)', padding: 'var(--space-6)' }}>
            <h4 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <User size={18} /> Utleierinformasjon
            </h4>
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>{listing.contact_name || 'Navn ikke oppgitt'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.9rem', opacity: 0.8 }}>
                <Phone size={14} /> {listing.contact_phone || 'Telefon ikke oppgitt'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

