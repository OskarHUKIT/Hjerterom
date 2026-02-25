'use client'

import Link from 'next/link'

export default function Documents() {
  return (
    <main className="container">
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          ← Tilbake til forsiden
        </Link>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-dark-navy)', marginBottom: '0.5rem' }}>
          Dokumentadministrasjon
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--color-dark-navy)', opacity: 0.8 }}>
          Last opp og administrer dokumenter
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Last opp dokument</h2>
        <div style={{ 
          padding: '2rem', 
          border: '2px dashed var(--color-muted-blue)', 
          borderRadius: '12px',
          background: 'linear-gradient(135deg, var(--color-sky-blue) 0%, rgba(170, 223, 240, 0.3) 100%)',
          textAlign: 'center'
        }}>
          <input 
            type="file" 
            className="input" 
            style={{ 
              marginBottom: '1rem',
              border: 'none',
              background: '#ffffff',
              padding: '1.5rem',
              cursor: 'pointer'
            }} 
          />
          <button className="button button-accent">Last opp dokument</button>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '1.5rem' }}>Eksisterende dokumenter</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { name: 'Vilkårsavtale Boligbanken', file: 'VilkarsavtaleBoligbanken.pdf', desc: 'Vilkårsavtale for Boligbanken' },
            { name: 'Overtakelsesrapport', file: 'Overtakelsesrapport.pdf', desc: 'Mal for overtakelsesrapport' },
            { name: 'Kontaktinfoskjema', file: 'Kontaktinfoschema.pdf', desc: 'Skjema for kontaktinfo' }
          ].map(doc => {
            const url = `https://ayddwbmkclujefnhsaqv.supabase.co/storage/v1/object/public/documents/${doc.file}`
            return (
              <a
                key={doc.file}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '1.25rem',
                  background: 'linear-gradient(135deg, rgba(170, 223, 240, 0.2) 0%, rgba(107, 137, 197, 0.1) 100%)',
                  borderRadius: '10px',
                  border: '1px solid rgba(107, 137, 197, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  color: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(4px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(33, 51, 102, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ fontSize: '2rem' }}>📄</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-dark-navy)', marginBottom: '0.25rem' }}>{doc.name}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-dark-navy)', opacity: 0.6 }}>{doc.desc} · PDF</div>
                </div>
              </a>
            )
          })}
        </div>
      </div>
    </main>
  )
}






