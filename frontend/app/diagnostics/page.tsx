'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Loader2,
  ClipboardCopy,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import {
  runSupabaseDiagnostics,
  measureGetSessionMs,
  type SupabaseDiagnosticReport,
} from '../lib/supabaseDiagnostics'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'

export default function DiagnosticsPage() {
  const [running, setRunning] = useState(false)
  const [report, setReport] = useState<SupabaseDiagnosticReport | null>(null)
  const [sessionProbe, setSessionProbe] = useState<{
    ms: number
    session: boolean
    error?: string
  } | null>(null)
  const [copyDone, setCopyDone] = useState(false)
  const autoRunOnce = useRef(false)

  const run = useCallback(async () => {
    setRunning(true)
    setReport(null)
    setSessionProbe(null)
    setCopyDone(false)
    try {
      const r = await runSupabaseDiagnostics()
      setReport(r)

      if (isSupabaseConfigured) {
        const bounded = await Promise.race([
          measureGetSessionMs(supabase),
          new Promise<{ ms: number; session: boolean; error: string }>((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ms: 35000,
                  session: false,
                  error: 'Avbrutt etter 35s (hengende getSession)',
                }),
              35000
            )
          ),
        ])
        setSessionProbe(bounded)
      }
    } finally {
      setRunning(false)
    }
  }, [])

  useEffect(() => {
    if (autoRunOnce.current) return
    autoRunOnce.current = true
    void run()
  }, [run])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as Window & { bolyRunDiagnostics?: typeof runSupabaseDiagnostics }
    w.bolyRunDiagnostics = runSupabaseDiagnostics
    return () => {
      delete w.bolyRunDiagnostics
    }
  }, [])

  const copy = useCallback(async () => {
    if (!report) return
    const extra = sessionProbe
      ? {
          ...JSON.parse(report.copyText),
          sessionProbe,
        }
      : JSON.parse(report.copyText)
    await navigator.clipboard.writeText(JSON.stringify(extra, null, 2))
    setCopyDone(true)
    setTimeout(() => setCopyDone(false), 2000)
  }, [report, sessionProbe])

  return (
    <main className="container" style={{ maxWidth: 720, padding: 'var(--space-8) var(--space-4)' }}>
      <p style={{ marginBottom: 'var(--space-4)' }}>
        <Link
          href="/"
          className="nav-link"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <ArrowLeft size={18} /> Til forsiden
        </Link>
      </p>
      <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-2)' }}>
        Tilkoblingsdiagnostikk
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
        Kjører automatiske sjekker av miljøvariabler, nøkkelformat, HTTP mot Supabase og (valgfritt){' '}
        <code style={{ fontSize: '0.9em' }}>getSession()</code>. Bruk «Kopier rapport» og send til
        support ved behov. Ingen full nøkkel vises.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 'var(--space-6)' }}>
        <Button
          type="button"
          variant="accent"
          onClick={() => void run()}
          disabled={running}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          {running ? <Loader2 size={18} className="app-spin" /> : <RefreshCw size={18} />}
          {running ? 'Kjører…' : 'Kjør sjekker på nytt'}
        </Button>
        {report && (
          <Button
            type="button"
            variant="primary"
            onClick={() => void copy()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <ClipboardCopy size={18} />
            {copyDone ? 'Kopiert!' : 'Kopier rapport (JSON)'}
          </Button>
        )}
      </div>

      {report && (
        <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
            {report.steps.some((s) => s.status === 'fail') ? (
              <AlertTriangle size={22} style={{ color: '#ef4444', flexShrink: 0 }} />
            ) : (
              <CheckCircle2 size={22} style={{ color: 'var(--color-teal)', flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Oppsummering</div>
              <div style={{ fontSize: '0.95rem', color: 'var(--text-body)' }}>
                {report.summaryText}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8 }}>
                Kode: <code>{report.summaryCode}</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {sessionProbe && (
        <div
          className="card"
          style={{
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
            border: '1px solid var(--border-medium)',
          }}
        >
          <strong>Ekstra: getSession()</strong>
          <p style={{ margin: '8px 0 0', fontSize: '0.95rem' }}>
            {sessionProbe.error ? (
              <span style={{ color: '#ef4444' }}>{sessionProbe.error}</span>
            ) : (
              <>
                {sessionProbe.ms} ms — innlogget session: {sessionProbe.session ? 'ja' : 'nei'}
              </>
            )}
          </p>
          {!sessionProbe.error && sessionProbe.session && sessionProbe.ms >= 12_000 && (
            <p
              style={{
                margin: '12px 0 0',
                fontSize: '0.9rem',
                color: 'var(--text-body)',
                lineHeight: 1.5,
              }}
            >
              Du er <strong>innlogget</strong>, men <code>getSession()</code> brukte{' '}
              {sessionProbe.ms} ms — ofte treg <strong>token-fornyelse</strong> mot Supabase
              (nettverk / kald start), ikke feil nøkkel. Hvis appen føles treg første gang etter
              åpning, kan det være dette. Prøv hard oppdatering eller annen nettleser for
              sammenligning.
            </p>
          )}
          {!sessionProbe.error &&
            sessionProbe.ms >= 28_000 &&
            sessionProbe.ms <= 32_000 &&
            !sessionProbe.session && (
              <p
                style={{
                  margin: '12px 0 0',
                  fontSize: '0.9rem',
                  color: 'var(--text-body)',
                  lineHeight: 1.5,
                }}
              >
                Ca. 30 s uten session betyr ofte at <strong>auth-timeout</strong> slo inn (utløpt
                eller ødelagt refresh-token).
                <strong> Auth /health er likevel OK</strong> — typisk lokal lagring. Prøv «Tøm lokal
                innlogging» under.
              </p>
            )}
          <button
            type="button"
            className="button"
            style={{ marginTop: 12 }}
            onClick={async () => {
              await supabase.auth.signOut({ scope: 'local' })
              window.location.href = '/login'
            }}
          >
            Tøm lokal innlogging og gå til logg inn
          </button>
        </div>
      )}

      {report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {report.steps.map((step) => (
            <div
              key={step.id}
              className="card"
              style={{
                padding: 'var(--space-3) var(--space-4)',
                borderLeft: `4px solid ${
                  step.status === 'ok'
                    ? 'var(--color-teal)'
                    : step.status === 'warn'
                      ? '#f59e0b'
                      : '#ef4444'
                }`,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{step.label}</div>
              <div
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-body)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {step.detail}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>
                {step.code}
                {step.ms != null ? ` · ${step.ms} ms` : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {!report && !running && (
        <p style={{ color: 'var(--text-muted)' }}>Trykk «Kjør sjekker på nytt» for å starte.</p>
      )}
    </main>
  )
}
