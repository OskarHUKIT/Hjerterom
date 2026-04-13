'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, FileText, Search } from 'lucide-react'

export default function Applications() {
  const [applications, setApplications] = useState([])

  return (
    <main className="container">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <Link
          href="/"
          className="nav-link"
          style={{
            marginLeft: '-1rem',
            marginBottom: 'var(--space-2)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <ArrowLeft size={18} /> Oversikt
        </Link>
        <h1 style={{ fontSize: '2.75rem' }}>Boligsøknader</h1>
        <p>Her finner du oversikt over dine innsendte søknader og deres status.</p>
      </div>

      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-6)',
          }}
        >
          <h2 style={{ margin: 0 }}>Mine søknader</h2>
          <button className="button">
            <Plus size={18} /> Ny søknad
          </button>
        </div>

        <div
          style={{
            padding: 'var(--space-10)',
            textAlign: 'center',
            background: 'var(--bg-app)',
            borderRadius: '16px',
            border: '2px dashed var(--border-medium)',
          }}
        >
          {applications.length === 0 ? (
            <div style={{ maxWidth: '400px', margin: '0 auto' }}>
              <div style={{ color: 'var(--color-muted-blue)', marginBottom: 'var(--space-4)' }}>
                <FileText size={48} strokeWidth={1.5} style={{ margin: '0 auto' }} />
              </div>
              <h3 style={{ marginBottom: 'var(--space-2)' }}>Ingen aktive søknader</h3>
              <p className="text-sm">
                Du har ikke sendt inn noen boligsøknader ennå. Klikk på knappen over for å starte en
                ny prosess.
              </p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
              {/* Future application items */}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
