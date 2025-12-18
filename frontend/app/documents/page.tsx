'use client'

import Link from 'next/link'

export default function Documents() {
  return (
    <div>
      <header className="header">
        <div className="container">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1>Boligbanken - Dokumenter</h1>
          </Link>
        </div>
      </header>

      <main className="container">
        <div className="card">
          <h2 style={{ marginBottom: '1rem', color: '#1f2937' }}>
            Dokumentadministrasjon
          </h2>
          <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
            Last opp og administrer dokumenter.
          </p>

          <div style={{ marginBottom: '1.5rem' }}>
            <input type="file" className="input" style={{ marginBottom: '1rem' }} />
            <button className="button">Last opp dokument</button>
          </div>

          <div>
            <h3 style={{ marginBottom: '1rem', color: '#1f2937' }}>Eksisterende dokumenter</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '6px', marginBottom: '0.5rem' }}>
                📄 251001 Behov boligbanken - oversendes Kunnskapstrening IT.docx (2).pdf
              </li>
              <li style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '6px', marginBottom: '0.5rem' }}>
                📄 Vilkårsavtale Boligbanken.docx
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}






