'use client'

import Link from 'next/link'
import { Search, Home as HomeIcon, ShieldCheck, HelpCircle, ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <main className="container">
      <div style={{ padding: 'var(--space-10) 0', maxWidth: '900px' }}>
        <h1 className="animate-delay-1" style={{ marginBottom: 'var(--space-4)' }}>
          Forenklet boligformidling for offentlig sektor.
        </h1>
        <p className="animate-delay-2" style={{ fontSize: '1.25rem', marginBottom: 'var(--space-8)', maxWidth: '700px', color: 'var(--text-body)' }}>
          Boly er den profesjonelle bindeleddet mellom NAV og private boligeiere. Vi gjør det trygt og effektivt å løse akutte boligbehov.
        </p>
      </div>

      <div className="grid-portal animate-delay-3">
        {/* NAV Worker Portal */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '12px', 
              background: 'rgba(32, 187, 175, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-4)',
              color: 'var(--color-teal)'
            }}>
              <Search size={28} />
            </div>
            <h2>For NAV-ansatte</h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
              Søk i vår sanntidsoversikt over ledige boliger. Filtrer på kapasitet, lokasjon og pris for å gi dine klienter en rask og trygg løsning.
            </p>
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 'var(--space-4)' }}>
            <Link href="/nav/database" className="button button-accent" style={{ width: '100%' }}>
              Åpne boligbasen <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        {/* Homeowner Portal */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '12px', 
              background: 'rgba(47, 76, 160, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-4)',
              color: 'var(--color-royal-blue)'
            }}>
              <HomeIcon size={28} />
            </div>
            <h2>For boligeiere</h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
              Registrer din eiendom for korttidsutleie. Du beholder full kontroll over tilgjengelighet og administrerer alt fra et enkelt dashbord.
            </p>
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 'var(--space-4)' }}>
            <Link href="/homeowner/manage" className="button" style={{ width: '100%' }}>
              Administrer utleie <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>

      {/* Trust & Support Section */}
      <div className="animate-delay-3" style={{ 
        marginTop: 'var(--space-10)', 
        padding: 'var(--space-8)', 
        background: 'var(--color-dark-navy)', 
        borderRadius: '24px',
        color: 'var(--text-on-dark)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 'var(--space-8)'
      }}>
        <div>
          <div style={{ color: 'var(--color-sky-blue)', marginBottom: 'var(--space-3)' }}>
            <ShieldCheck size={36} />
          </div>
          <h3 style={{ color: 'white', fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>Sikkerhet i fokus</h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}>
            Alle leieforhold er dekket av juridisk kvalitetssikrede avtaler som følger gjeldende norske standarder for offentlig boligformidling.
          </p>
        </div>
        <div>
          <div style={{ color: 'var(--color-sky-blue)', marginBottom: 'var(--space-3)' }}>
            <HelpCircle size={36} />
          </div>
          <h3 style={{ color: 'white', fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>Alltid tilgjengelig</h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}>
            Vårt dedikerte support-team er tilgjengelig for å bistå saksbehandlere og utleiere med både tekniske og praktiske utfordringer.
          </p>
        </div>
      </div>
    </main>
  )
}
