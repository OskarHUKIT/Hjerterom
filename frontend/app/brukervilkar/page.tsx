import Link from 'next/link'
import { BrukervilkarContent } from '../components/legal/BrukervilkarContent'

export default function BrukervilkarPage() {
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
            Brukervilkår
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-body)', lineHeight: 1.6 }}>
            Her er de preliminære brukervilkårene for Boly. Selve signeringen skjer via BankID
            hos Signicat – der vises det endelige dokumentet som kommunen har godkjent for din
            region.
          </p>
        </div>

        <div
          className="card"
          style={{
            padding: 'var(--space-8)',
            lineHeight: 1.8,
            fontSize: '1.05rem',
          }}
        >
          <BrukervilkarContent showDisclaimer />
        </div>
      </div>
    </main>
  )
}
