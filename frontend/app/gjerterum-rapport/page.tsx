import type { CSSProperties } from 'react'
import Link from 'next/link'

const h1: CSSProperties = {
  fontSize: '2rem',
  fontWeight: 700,
  color: 'var(--text-main)',
  marginBottom: 'var(--space-2)',
}

const card: CSSProperties = {
  padding: 'var(--space-8)',
  lineHeight: 1.75,
}

export default function GjerterumRapportPage() {
  const pdfUrl = '/Gjerterum_Digital_Lukket_Del_Rapport_Soknad.pdf'

  return (
    <main className="container" style={{ paddingBottom: 'var(--space-12)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <Link href="/" className="nav-link" style={{ display: 'inline-block', marginBottom: '1rem' }}>
          ← Tilbake
        </Link>

        <h1 style={h1}>Gjerterum — digital lukket del</h1>
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-6)', fontSize: '1.05rem' }}>
          Rapport og prosjektsøknad for deling med UiT Narvik og Nav Narvik.
        </p>

        <div className="card" style={card}>
          <p style={{ marginBottom: 'var(--space-4)' }}>
            Dokumentet beskriver idéen om den digitale lukkede delen av Gjerterum, kobling til
            forskningsressurser ved UiT Narvik, samt muligheter gjennom Boly og Husbanken.
          </p>

          <a
            href={pdfUrl}
            download="Gjerterum_Digital_Lukket_Del_Rapport_Soknad.pdf"
            className="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: 'var(--space-4)',
              textDecoration: 'none',
            }}
          >
            Last ned PDF
          </a>

          <p style={{ fontSize: '0.95rem', color: 'var(--text-body)', margin: 0 }}>
            På iPad: trykk «Last ned PDF» og velg «Last ned» eller «Åpne i Files». Du kan også
            holde inne lenken og velge «Last ned koblet fil».
          </p>
        </div>

        <p style={{ marginTop: 'var(--space-4)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Versjon 1.0 · 30. juni 2026 · Gamechanging AS
        </p>
      </div>
    </main>
  )
}
