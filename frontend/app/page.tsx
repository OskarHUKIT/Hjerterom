'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <main className="container">
      <div style={{ marginBottom: '4rem', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '3.5rem', 
          fontWeight: 800, 
          background: 'linear-gradient(135deg, var(--color-dark-navy) 0%, var(--color-royal-blue) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem',
          letterSpacing: '-0.02em'
        }}>
          Boligformidling gjort enkelt.
        </h1>
        <p style={{ fontSize: '1.4rem', color: 'var(--color-dark-navy)', opacity: 0.8, maxWidth: '700px', margin: '0 auto' }}>
          En sømløs plattform for NAV-ansatte å finne trygge hjem, og for boligeiere å leie ut med mening.
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '2.5rem', 
        marginBottom: '4rem' 
      }}>
        {/* NAV Worker Portal */}
        <div className="card" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          borderTop: '8px solid var(--color-teal)',
          height: '100%'
        }}>
          <div>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '20px', 
              background: 'rgba(32, 187, 175, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              fontSize: '2.5rem'
            }}>
              🔍
            </div>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>For NAV-ansatte</h2>
            <p style={{ marginBottom: '2rem', fontSize: '1.1rem' }}>
              Få tilgang til vår database over tilgjengelige boliger for korttidsleie. Filtrer på behov, lokasjon og pris for å hjelpe dine klienter raskt.
            </p>
            <ul className="feature-list" style={{ marginBottom: '2.5rem' }}>
              <li>Sanntidsoversikt over ledige boliger</li>
              <li>Filtrering på antall senger og pris</li>
              <li>Direkte kontakt med boligeiere</li>
              <li>Trygg og verifisert boligmasse</li>
            </ul>
          </div>
          <Link href="/nav/database" className="button button-accent" style={{ textAlign: 'center', fontSize: '1.2rem' }}>
            Utforsk boligbasen
          </Link>
        </div>

        {/* Homeowner Portal */}
        <div className="card" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          borderTop: '8px solid var(--color-royal-blue)',
          height: '100%'
        }}>
          <div>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '20px', 
              background: 'rgba(47, 76, 160, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              fontSize: '2.5rem'
            }}>
              🏠
            </div>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>For boligeiere</h2>
            <p style={{ marginBottom: '2rem', fontSize: '1.1rem' }}>
              Lei ut din bolig til de som trenger det mest. Du har full kontroll over tilgjengelighet og kan enkelt skru av/på utleie når det passer deg.
            </p>
            <ul className="feature-list" style={{ marginBottom: '2.5rem' }}>
              <li>Enkel registrering av bolig</li>
              <li>Styr tilgjengelighet med ett klikk</li>
              <li>Sikker utbetaling og avtaleverk</li>
              <li>Bidra til lokal boligstøtte</li>
            </ul>
          </div>
          <Link href="/homeowner/manage" className="button" style={{ textAlign: 'center', fontSize: '1.2rem' }}>
            Administrer min bolig
          </Link>
        </div>
      </div>

      {/* Info Section */}
      <div className="card" style={{ background: 'var(--color-dark-navy)', color: 'white', padding: '3rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem' }}>
          <div>
            <h3 style={{ color: 'var(--color-sky-blue)', marginBottom: '1rem' }}>Vårt oppdrag</h3>
            <p style={{ color: 'white', opacity: 0.9 }}>
              Boly kobler sammen offentlig sektor og private utleiere for å løse akutte boligbehov på en verdig og effektiv måte.
            </p>
          </div>
          <div>
            <h3 style={{ color: 'var(--color-sky-blue)', marginBottom: '1rem' }}>Sikkerhet</h3>
            <p style={{ color: 'white', opacity: 0.9 }}>
              Alle brukere verifiseres gjennom BankID, og vi sørger for at alle avtaler følger norske lover og regler for utleie.
            </p>
          </div>
          <div>
            <h3 style={{ color: 'var(--color-sky-blue)', marginBottom: '1rem' }}>Støtte</h3>
            <p style={{ color: 'white', opacity: 0.9 }}>
              Har du spørsmål? Vårt support-team er tilgjengelig for både NAV-ansatte og boligeiere alle hverdager 08-16.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}






