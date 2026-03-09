'use client'

import Link from 'next/link'

export default function Terms() {
  return (
    <main className="container">
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          ← Tilbake til forsiden
        </Link>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-dark-navy)', marginBottom: '0.5rem' }}>
          Vilkår og betingelser
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--color-dark-navy)', opacity: 0.8 }}>
          Se og administrer vilkårsavtaler for Bo.ly
        </p>
      </div>

      <div className="card">
        <div style={{ 
          padding: '2rem', 
          background: 'linear-gradient(135deg, rgba(32, 187, 175, 0.1) 0%, rgba(4, 93, 116, 0.05) 100%)',
          borderRadius: '12px',
          border: '2px solid rgba(32, 187, 175, 0.2)',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ 
              width: '50px', 
              height: '50px', 
              borderRadius: '10px', 
              background: 'linear-gradient(135deg, var(--color-teal) 0%, var(--color-dark-teal) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}>
              📄
            </div>
            <div>
              <h3 style={{ margin: 0, color: 'var(--color-dark-navy)' }}>Vilkårsavtale Boligbank</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-dark-navy)', opacity: 0.7 }}>
                Dokument: Vilkårsavtale Boligbank.docx
              </p>
            </div>
          </div>
        </div>

        <div style={{ 
          padding: '2rem', 
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid rgba(107, 137, 197, 0.2)',
          minHeight: '400px'
        }}>
          <p style={{ color: 'var(--color-dark-navy)', opacity: 0.8, lineHeight: '1.8', fontSize: '1.05rem' }}>
            Vilkårsavtale innhold vil vises her basert på dokumentet: 
            <strong style={{ color: 'var(--color-dark-navy)' }}> Vilkårsavtale Boligbank.docx</strong>
          </p>
          <div style={{ 
            marginTop: '2rem', 
            padding: '1.5rem', 
            background: 'linear-gradient(135deg, var(--color-sky-blue) 0%, rgba(170, 223, 240, 0.3) 100%)',
            borderRadius: '10px',
            border: '1px dashed var(--color-muted-blue)'
          }}>
            <p style={{ color: 'var(--color-dark-navy)', opacity: 0.7, fontStyle: 'italic', margin: 0 }}>
              Dokumentinnhold vil bli lastet og vist her når dokumenthåndtering er implementert.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}






