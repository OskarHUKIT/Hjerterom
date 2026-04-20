'use client'

import Link from 'next/link'

export default function Training() {
  const modules = [
    {
      title: 'Modul 1: Systemoversikt',
      description: 'Grunnleggende oversikt over Boly',
      icon: '🏠',
      color: 'var(--color-royal-blue)',
    },
    {
      title: 'Modul 2: Søknadshåndtering',
      description: 'Hvordan håndtere boliglånsøknader',
      icon: '📋',
      color: 'var(--color-teal)',
    },
    {
      title: 'Modul 3: Dokumenthåndtering',
      description: 'Administrasjon av dokumenter og vilkårsavtaler',
      icon: '📁',
      color: 'var(--color-muted-blue)',
    },
  ]

  return (
    <main className="container">
      <div className="page-hero">
        <Link href="/" className="nav-link page-hero-back">
          ← Tilbake til forsiden
        </Link>
        <h1
          style={{
            fontSize: 'clamp(1.75rem, 1.2rem + 2vw, 2.5rem)',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '0.5rem',
          }}
        >
          IT Kunnskapstrening
        </h1>
        <p
          style={{
            fontSize: 'clamp(0.95rem, 0.9rem + 0.3vw, 1.1rem)',
            color: 'var(--text-muted)',
          }}
        >
          Treningsmateriale og kunnskapsbase for IT-systemer
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            padding: '1.5rem',
            background:
              'linear-gradient(135deg, rgba(32, 187, 175, 0.1) 0%, rgba(4, 93, 116, 0.05) 100%)',
            borderRadius: '12px',
            border: '2px solid rgba(32, 187, 175, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              background:
                'linear-gradient(135deg, var(--color-teal) 0%, var(--color-dark-teal) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
            }}
          >
            📚
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Behov boligbank – Kunnskapstrening IT
            </h3>
            <p
              style={{
                margin: 0,
                color: 'var(--text-muted)',
                fontSize: '0.95rem',
              }}
            >
              Basert på dokumentet:{' '}
              <strong>
                251001 Behov boligbank – oversendes Kunnskapstrening IT.docx (2).pdf
              </strong>
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '1.5rem' }}>Treningsmoduler</h2>
        <div
          className="training-modules-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {modules.map((module, index) => (
            <div
              key={index}
              className="training-module-card"
              style={{
                padding: '1.5rem',
                background:
                  'linear-gradient(135deg, rgba(170, 223, 240, 0.2) 0%, rgba(107, 137, 197, 0.1) 100%)',
                borderRadius: '12px',
                border: `2px solid ${module.color}40`,
                transition: 'all 0.3s',
                cursor: 'pointer',
                minHeight: 'var(--touch-target)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = `0 8px 16px ${module.color}30`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '10px',
                  background: `linear-gradient(135deg, ${module.color} 0%, ${module.color}dd 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginBottom: '1rem',
                }}
              >
                {module.icon}
              </div>
              <h4
                style={{
                  marginBottom: '0.75rem',
                  color: 'var(--text-main)',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                {module.title}
              </h4>
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  margin: 0,
                }}
              >
                {module.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
