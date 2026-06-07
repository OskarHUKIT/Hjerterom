import type { CSSProperties } from 'react'
import Link from 'next/link'

const h2: CSSProperties = {
  color: 'var(--text-main)',
  fontSize: '1.35rem',
  marginTop: 'var(--space-6)',
  marginBottom: 'var(--space-3)',
  borderBottom: '2px solid var(--border-subtle)',
  paddingBottom: 'var(--space-2)',
}
const p: CSSProperties = { color: 'var(--text-body)', marginBottom: 'var(--space-4)' }

export default function OmBolyPage() {
  return (
    <main className="container" style={{ paddingBottom: 'var(--space-12)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Link
            href="/"
            className="nav-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            ← Tilbake til forsiden
          </Link>
          <h1
            style={{
              fontSize: '2.25rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Om Boly
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-body)', lineHeight: 1.6 }}>
            Kort informasjon om tjenesten og samarbeidet bak den.
          </p>
        </div>

        <div
          className="card"
          style={{
            padding: 'var(--space-8)',
            lineHeight: 1.75,
            fontSize: '1.05rem',
          }}
        >
          <h2 style={{ ...h2, marginTop: 0 }}>Hva er Boly?</h2>
          <p style={p}>
            Boly er en digital tjeneste som hjelper kommuner med å finne og formidle egnede boliger
            fra private utleiere til personer som trenger det. Utleiere kan registrere boliger og
            relevant informasjon, mens autorisert
            kommunepersonell kan bruke tjenesten i sitt formidlingsarbeid innenfor gjeldende regler
            og interne rutiner.
          </p>

          <h2 style={h2}>Samarbeid og utvikling</h2>
          <p style={p}>
            Løsningen er utviklet i et samarbeid mellom Gamechanging og Nav Narvik, med støtte fra
            Narvik kommune i tråd med prosjektets mandat. Den endelige ansvarsfordelingen mellom
            kommune, leverandører og brukere reguleres av avtaler og vilkår som fastsettes for
            produksjon.
          </p>

          <h2 style={h2}>Mer informasjon</h2>
          <p style={{ ...p, marginBottom: 'var(--space-3)' }}>
            For juridiske temaer, se sidene for{' '}
            <Link prefetch={false} href="/brukervilkar/" style={{ color: 'var(--color-accent)' }}>
              brukervilkår
            </Link>{' '}
            og{' '}
            <Link prefetch={false} href="/personvern/" style={{ color: 'var(--color-accent)' }}>
              personvern
            </Link>
            .
          </p>
          <p style={{ ...p, marginBottom: 0 }}>
            Generelle spørsmål:{' '}
            <a href="mailto:info@bolynorge.no" style={{ color: 'var(--color-accent)' }}>
              info@bolynorge.no
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
