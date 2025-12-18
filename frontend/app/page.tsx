'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <main className="container">
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '3rem', 
          fontWeight: 700, 
          background: 'linear-gradient(135deg, var(--color-dark-navy) 0%, var(--color-royal-blue) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem'
        }}>
          Velkommen til Bo.ly
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--color-dark-navy)', opacity: 0.8 }}>
          Ditt moderne system for boliglån og boligbanktjenester
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <Link href="/applications" className="card" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, var(--color-royal-blue) 0%, var(--color-muted-blue) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            fontSize: '2rem'
          }}>
            📋
          </div>
          <h3>Søknader</h3>
          <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>
            Administrer og opprett nye boliglånsøknader
          </p>
        </Link>

        <Link href="/terms" className="card" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, var(--color-teal) 0%, var(--color-dark-teal) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            fontSize: '2rem'
          }}>
            📄
          </div>
          <h3>Vilkår og betingelser</h3>
          <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>
            Se og administrer vilkårsavtaler
          </p>
        </Link>

        <Link href="/documents" className="card" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, var(--color-muted-blue) 0%, var(--color-sky-blue) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            fontSize: '2rem'
          }}>
            📁
          </div>
          <h3>Dokumenter</h3>
          <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>
            Last opp og administrer dokumenter
          </p>
        </Link>

        <Link href="/training" className="card" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, var(--color-dark-teal) 0%, var(--color-teal) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            fontSize: '2rem'
          }}>
            🎓
          </div>
          <h3>Kunnskapstrening</h3>
          <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>
            IT kunnskapstrening og ressurser
          </p>
        </Link>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '1.5rem' }}>Funksjoner</h2>
        <ul className="feature-list">
          <li>Boliglånsøknader</li>
          <li>Vilkårsavtale håndtering</li>
          <li>Dokumentadministrasjon</li>
          <li>IT kunnskapstrening</li>
        </ul>
      </div>
    </main>
  )
}






