'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Applications() {
  const [applications, setApplications] = useState([])

  return (
    <main className="container">
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          ← Tilbake til forsiden
        </Link>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-dark-navy)', marginBottom: '0.5rem' }}>
          Boliglånsøknader
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--color-dark-navy)', opacity: 0.8 }}>
          Administrer og opprett nye boliglånsøknader
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ margin: 0 }}>Mine søknader</h2>
          <button className="button">
            + Ny søknad
          </button>
        </div>

        <div style={{ 
          padding: '3rem 2rem', 
          textAlign: 'center',
          background: 'linear-gradient(135deg, var(--color-sky-blue) 0%, rgba(170, 223, 240, 0.3) 100%)',
          borderRadius: '12px',
          border: '2px dashed var(--color-muted-blue)'
        }}>
          {applications.length === 0 ? (
            <>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📋</div>
              <p style={{ color: 'var(--color-dark-navy)', fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                Ingen søknader funnet
              </p>
              <p style={{ color: 'var(--color-dark-navy)', opacity: 0.7 }}>
                Opprett en ny søknad for å komme i gang
              </p>
            </>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
              {applications.map((app, index) => (
                <li key={index} style={{ 
                  padding: '1rem', 
                  background: '#ffffff', 
                  borderRadius: '8px', 
                  marginBottom: '0.75rem',
                  border: '1px solid rgba(107, 137, 197, 0.2)'
                }}>
                  {app}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}






