import Link from 'next/link'
import { PreliminaryLegalDisclaimer } from '../components/legal/PreliminaryLegalDisclaimer'

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
            Kort, preliminær informasjon om tjenesten og samarbeidet bak den.
          </p>
        </div>

        <div
          className="card"
          style={{
            padding: 'var(--space-8)',
            background: '#ffffff',
            color: '#1e293b',
            lineHeight: 1.75,
            fontSize: '1.05rem',
          }}
        >
          <PreliminaryLegalDisclaimer />

          <h2
            style={{
              color: '#0f172a',
              fontSize: '1.35rem',
              marginBottom: 'var(--space-3)',
              borderBottom: '2px solid #f1f5f9',
              paddingBottom: 'var(--space-2)',
            }}
          >
            Hva er Boly?
          </h2>
          <p style={{ color: '#334155', marginBottom: 'var(--space-4)' }}>
            Boly er en digital tjeneste som hjelper kommuner med å finne og formidle egnede boliger
            fra private utleiere til personer som trenger bostøtte eller annen kommunal bistand til
            bolig. Utleiere kan registrere boliger og relevant informasjon, mens autorisert
            kommunepersonell kan bruke tjenesten i sitt formidlingsarbeid innenfor gjeldende regler
            og interne rutiner.
          </p>

          <h2
            style={{
              color: '#0f172a',
              fontSize: '1.35rem',
              marginTop: 'var(--space-6)',
              marginBottom: 'var(--space-3)',
              borderBottom: '2px solid #f1f5f9',
              paddingBottom: 'var(--space-2)',
            }}
          >
            Samarbeid og utvikling
          </h2>
          <p style={{ color: '#334155', marginBottom: 'var(--space-4)' }}>
            Løsningen er utviklet i et samarbeid mellom Nav Narvik og Gamechanging, med støtte fra
            Narvik kommune i tråd med prosjektets mandat. Den endelige ansvarsfordelingen mellom
            kommune, leverandører og brukere reguleres av avtaler og vilkår som fastsettes for
            produksjon.
          </p>

          <h2
            style={{
              color: '#0f172a',
              fontSize: '1.35rem',
              marginTop: 'var(--space-6)',
              marginBottom: 'var(--space-3)',
              borderBottom: '2px solid #f1f5f9',
              paddingBottom: 'var(--space-2)',
            }}
          >
            Mer informasjon
          </h2>
          <p style={{ color: '#334155', marginBottom: 'var(--space-3)' }}>
            For juridiske temaer viser vi til de preliminære sidene for{' '}
            <Link href="/brukervilkar/" style={{ color: 'var(--color-royal-blue, #2563eb)' }}>
              brukervilkår
            </Link>{' '}
            og{' '}
            <Link href="/personvern/" style={{ color: 'var(--color-royal-blue, #2563eb)' }}>
              personvern
            </Link>
            .
          </p>
          <p style={{ color: '#334155', marginBottom: 0 }}>
            Generelle spørsmål:{' '}
            <a
              href="mailto:info@bolynorge.no"
              style={{ color: 'var(--color-royal-blue, #2563eb)' }}
            >
              info@bolynorge.no
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
