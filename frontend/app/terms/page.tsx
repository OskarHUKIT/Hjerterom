'use client'

import Link from 'next/link'

export default function Terms() {
  return (
    <div>
      <header className="header">
        <div className="container">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1>Boligbanken - Vilkår og betingelser</h1>
          </Link>
        </div>
      </header>

      <main className="container">
        <div className="card">
          <h2 style={{ marginBottom: '1rem', color: '#1f2937' }}>
            Vilkårsavtale
          </h2>
          <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
            Her kan du se og administrere vilkårsavtaler for Boligbanken.
          </p>

          <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '6px' }}>
            <p style={{ color: '#6b7280' }}>
              Vilkårsavtale innhold vil vises her basert på dokumentet: 
              <strong> Vilkårsavtale Boligbanken.docx</strong>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}






