'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Home() {
  return (
    <div>
      <header className="header">
        <div className="container">
          <h1>Boligbanken</h1>
        </div>
      </header>

      <main className="container">
        <div className="card">
          <h2 style={{ marginBottom: '1rem', color: '#1f2937' }}>
            Velkommen til Boligbanken
          </h2>
          <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
            Ditt system for boliglån og boligbanktjenester.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/applications" className="button">
              Søknader
            </Link>
            <Link href="/terms" className="button">
              Vilkår og betingelser
            </Link>
            <Link href="/documents" className="button">
              Dokumenter
            </Link>
            <Link href="/training" className="button">
              Kunnskapstrening
            </Link>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem', color: '#1f2937' }}>
            Funksjoner
          </h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
              ✓ Boliglånsøknader
            </li>
            <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
              ✓ Vilkårsavtale håndtering
            </li>
            <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
              ✓ Dokumentadministrasjon
            </li>
            <li style={{ padding: '0.5rem 0' }}>
              ✓ IT kunnskapstrening
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}






