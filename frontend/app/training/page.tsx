'use client'

import Link from 'next/link'

export default function Training() {
  return (
    <div>
      <header className="header">
        <div className="container">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1>Boligbanken - Kunnskapstrening IT</h1>
          </Link>
        </div>
      </header>

      <main className="container">
        <div className="card">
          <h2 style={{ marginBottom: '1rem', color: '#1f2937' }}>
            IT Kunnskapstrening
          </h2>
          <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
            Treningsmateriale og kunnskapsbase for IT-systemer.
          </p>

          <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '6px', marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#1f2937' }}>
              Behov boligbanken - Kunnskapstrening IT
            </h3>
            <p style={{ color: '#6b7280' }}>
              Basert på dokumentet: <strong>251001 Behov boligbanken - oversendes Kunnskapstrening IT.docx (2).pdf</strong>
            </p>
          </div>

          <div>
            <h3 style={{ marginBottom: '1rem', color: '#1f2937' }}>Treningsmoduler</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '6px' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Modul 1: Systemoversikt</h4>
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  Grunnleggende oversikt over Boligbanken systemet
                </p>
              </div>
              <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '6px' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Modul 2: Søknadshåndtering</h4>
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  Hvordan håndtere boliglånsøknader
                </p>
              </div>
              <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '6px' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Modul 3: Dokumenthåndtering</h4>
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  Administrasjon av dokumenter og vilkårsavtaler
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}






