'use client'

/**
 * Root-level error UI (replaces layout when triggered).
 * Helps avoid an empty dark screen when the client bundle throws.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="nb">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          padding: 24,
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          fontFamily: 'system-ui, sans-serif',
          background: '#020617',
          color: '#f8fafc',
        }}
      >
        <h1 style={{ fontSize: '1.25rem', margin: '0 0 12px' }}>Noe gikk galt</h1>
        <p style={{ opacity: 0.85, margin: 0, maxWidth: 520 }}>{error.message}</p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: 20,
            padding: '12px 20px',
            borderRadius: 10,
            border: '1px solid rgba(148, 163, 184, 0.4)',
            background: '#0f172a',
            color: '#f8fafc',
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          Prøv igjen
        </button>
        <p style={{ marginTop: 24, fontSize: 14, opacity: 0.65, maxWidth: 480 }}>
          Tøm nettleserbuffer eller åpne i et privat vindu hvis dette gjentar seg. Sjekk også at
          konsollen (F12) ikke viser røde feil.
        </p>
      </body>
    </html>
  )
}
