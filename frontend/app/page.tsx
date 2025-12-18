'use client'

import Link from 'next/link'
import { Search, Home as HomeIcon, ShieldCheck, HelpCircle, ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <main className="container">
      <div style={{ padding: '4rem 0', maxWidth: '800px' }}>
        <h1 style={{ marginBottom: '1.5rem' }}>
          Effektiv boligformidling for offentlig sektor.
        </h1>
        <p style={{ fontSize: '1.25rem', marginBottom: '3rem', maxWidth: '600px' }}>
          Boly kobler NAV-ansatte med private boligeiere for å løse akutte boligbehov gjennom en trygg og oversiktlig plattform.
        </p>
      </div>

      <div className="grid-portal">
        {/* NAV Worker Portal */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '10px', 
              background: 'rgba(32, 187, 175, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              color: 'var(--color-teal)'
            }}>
              <Search size={24} />
            </div>
            <h2>For NAV-ansatte</h2>
            <p style={{ marginBottom: '1.5rem' }}>
              Finn og book ledige boliger i sanntid. Filtrer på pris, lokasjon og kapasitet for å hjelpe dine klienter raskt.
            </p>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <Link href="/nav/database" className="button button-accent" style={{ width: '100%' }}>
              Åpne boligbasen <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        {/* Homeowner Portal */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '10px', 
              background: 'rgba(47, 76, 160, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              color: 'var(--color-royal-blue)'
            }}>
              <HomeIcon size={24} />
            </div>
            <h2>For boligeiere</h2>
            <p style={{ marginBottom: '1.5rem' }}>
              Registrer din bolig for korttidsutleie. Du har full kontroll over tilgjengelighet og styrer alt fra ditt dashbord.
            </p>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <Link href="/homeowner/manage" className="button" style={{ width: '100%' }}>
              Administrer utleie <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>

      {/* Trust & Support Section */}
      <div style={{ 
        marginTop: '6rem', 
        padding: '4rem', 
        background: 'var(--color-dark-navy)', 
        borderRadius: '24px',
        color: 'white',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '4rem'
      }}>
        <div>
          <div style={{ color: 'var(--color-sky-blue)', marginBottom: '1rem' }}>
            <ShieldCheck size={32} />
          </div>
          <h3 style={{ color: 'white', fontSize: '1.25rem' }}>Sikkerhet i fokus</h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
            Alle avtaler er juridisk kvalitetssikret og følger norske standarder for utleie i offentlig regi.
          </p>
        </div>
        <div>
          <div style={{ color: 'var(--color-sky-blue)', marginBottom: '1rem' }}>
            <HelpCircle size={32} />
          </div>
          <h3 style={{ color: 'white', fontSize: '1.25rem' }}>Alltid tilgjengelig</h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
            Vårt support-team hjelper både saksbehandlere og utleiere med tekniske og praktiske spørsmål.
          </p>
        </div>
      </div>
    </main>
  )
}
