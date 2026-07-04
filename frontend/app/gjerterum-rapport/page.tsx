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
  const digitalLosPdf = '/Digital_Los_KI_Partnerproposisjon_2s.pdf'
  const gjerterumPdf = '/Gjerterum_Digital_Lukket_Del_Rapport_Soknad.pdf'

  return (
    <main className="container" style={{ paddingBottom: 'var(--space-12)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <Link href="/" className="nav-link" style={{ display: 'inline-block', marginBottom: '1rem' }}>
          ← Tilbake
        </Link>

        <h1 style={h1}>Prosjektdokumenter</h1>
        <p style={{ color: 'var(--text-body)', marginBottom: 'var(--space-6)', fontSize: '1.05rem' }}>
          Nedlasting av rapporter og partnerproposisjoner for deling med UiT Narvik og Nav Narvik.
        </p>

        <div className="card" style={{ ...card, marginBottom: 'var(--space-4)' }}>
          <h2 style={{ marginTop: 0, marginBottom: 'var(--space-3)', color: 'var(--text-main)' }}>
            Kunstig intelligens i sosial boligformidling
          </h2>
          <p style={{ marginBottom: 'var(--space-4)' }}>
            2-siders partnerproposisjon — klar til avsending til UiT Narvik og Nav Narvik.
          </p>
          <a
            href={digitalLosPdf}
            download="Digital_Los_KI_Partnerproposisjon_2s.pdf"
            className="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: 'var(--space-3)',
              textDecoration: 'none',
            }}
          >
            Last ned PDF (2 sider)
          </a>
        </div>

        <div className="card" style={card}>
          <h2 style={{ marginTop: 0, marginBottom: 'var(--space-3)', color: 'var(--text-main)' }}>
            Gjerterum — digital lukket del
          </h2>
          <p style={{ marginBottom: 'var(--space-4)' }}>
            Full rapport og prosjektsøknad.
          </p>
          <a
            href={gjerterumPdf}
            download="Gjerterum_Digital_Lukket_Del_Rapport_Soknad.pdf"
            className="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: 'var(--space-3)',
              textDecoration: 'none',
            }}
          >
            Last ned PDF
          </a>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-body)', margin: 0 }}>
            På iPad: trykk «Last ned PDF» og velg «Last ned» eller «Åpne i Files».
          </p>
        </div>

        <p style={{ marginTop: 'var(--space-4)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Gamechanging AS · Juni 2026
        </p>
      </div>
    </main>
  )
}
