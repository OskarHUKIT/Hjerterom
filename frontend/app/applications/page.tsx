'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Applications() {
  const [applications, setApplications] = useState([])

  return (
    <div>
      <header className="header">
        <div className="container">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1>Boligbanken - Søknader</h1>
          </Link>
        </div>
      </header>

      <main className="container">
        <div className="card">
          <h2 style={{ marginBottom: '1rem', color: '#1f2937' }}>
            Boliglånsøknader
          </h2>
          <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
            Administrer og opprett nye boliglånsøknader.
          </p>

          <button className="button" style={{ marginBottom: '2rem' }}>
            Ny søknad
          </button>

          <div>
            {applications.length === 0 ? (
              <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                Ingen søknader funnet. Opprett en ny søknad for å komme i gang.
              </p>
            ) : (
              <ul>
                {applications.map((app, index) => (
                  <li key={index}>{app}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}






