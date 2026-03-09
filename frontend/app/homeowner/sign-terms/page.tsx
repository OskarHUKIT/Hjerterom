'use client'

import { use, useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, FileText, ChevronDown, CheckCircle2, Lock, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function SignTermsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [isSigned, setIsSigned] = useState<boolean | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkAgreement = async () => {
      const signedParam = searchParams.get('signed')
      if (signedParam != null && typeof window !== 'undefined') {
        try {
          const bankIdStorage = window.sessionStorage.getItem('supabase-auth-bankid')
          if (bankIdStorage) {
            const parsed = JSON.parse(bankIdStorage)
            const session = parsed?.currentSession ?? parsed
            const access_token = session?.access_token
            const refresh_token = session?.refresh_token
            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token })
            }
          }
        } catch (_) {}
        await supabase.auth.refreshSession()
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('user_agreements')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_terminated', false)
        .maybeSingle()

      setIsSigned(!!data)
    }
    checkAgreement()
  }, [router, searchParams])

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      // If within 50px of bottom, consider it scrolled
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        setHasScrolledToBottom(true)
      }
    }
  }

  const handleSign = async () => {
    if (!hasScrolledToBottom) {
      alert('Scroll ned i avtalen først for å aktivere signering.')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Logg inn på nytt og prøv igjen.')

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      if (!anonKey?.trim()) {
        throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY mangler i .env.local. Legg til anon-nøkkelen fra Supabase Dashboard → Settings → API.')
      }
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || anonKey
      const body = {
        userId: user.id,
        agreementVersion: '1.0',
        origin: typeof window !== 'undefined' ? window.location.origin : '',
      }
      const res = await fetch(`${supabaseUrl}/functions/v1/sign-agreement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        throw new Error(
          '401 ved signering: Edge Function godtar ikke forespørselen. ' +
          'Sjekk at du er logget inn (prøv å logg ut og inn på nytt). ' +
          'Hvis det fortsatt feiler: i Supabase Dashboard → Edge Functions → sign-agreement → sett «Enforce JWT» av, eller deploy med: supabase functions deploy sign-agreement --no-verify-jwt.'
        )
      }
      if (!res.ok) {
        const msg = (data?.message ?? data?.error ?? res.statusText) || 'Kunne ikke starte signering.'
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
      }
      if (data?.url) {
        window.location.href = data.url
        return
      }
      const errMsg = data?.error ?? data?.message ?? 'Kunne ikke starte signering.'
      throw new Error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg))
    } catch (err: any) {
      alert('Feil ved start av signering: ' + (err?.message || String(err)))
      setLoading(false)
    }
  }

  const handleTerminate = async () => {
    if (!confirm('Er du sikker på at du vil si opp avtalen? Du mister tilgang til Boligbank med en gang. Informasjon om deg og boligene dine bevares for kommunens historikk.')) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 1. Mark agreement as terminated (listings og brukerdata bevares for kommunens historikk)
      const { error: termError } = await supabase
        .from('user_agreements')
        .update({ is_terminated: true, terminated_at: new Date().toISOString() })
        .eq('user_id', user.id)

      if (termError) throw termError

      // 2. Log the termination
      await supabase.from('audit_logs').insert([{
        user_id: user.id,
        action_type: 'TERMINATE_AGREEMENT',
        details: { version: '1.0' }
      }])

      alert('Avtalen er nå sagt opp. Du logges ut. Kommunen beholder historikk over boliger og avtale.')
      await supabase.auth.signOut()
      router.push('/')
    } catch (err: any) {
      alert('Feil ved oppsigelse: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (isSigned === null) {
    return (
      <main className="container">
        <div style={{ maxWidth: '800px', margin: '0 auto', minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Sjekker avtale...</div>
        </div>
      </main>
    )
  }

  if (isSigned) {
    return (
      <main className="container">
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <Link href="/homeowner/manage" className="nav-link" style={{ marginLeft: '-1rem', marginBottom: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              ← Mine boliger
            </Link>
            <h1 style={{ fontSize: '2.5rem' }}>Din signerte avtale</h1>
            <p style={{ fontSize: '1.125rem', opacity: 0.8 }}>Her kan du se din aktive avtale med Kommune-boligbank.</p>
          </div>

          <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-teal)', marginBottom: 'var(--space-4)' }}>
              <ShieldCheck size={64} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{ marginBottom: 'var(--space-2)' }}>Avtalen er aktiv</h2>
            <p style={{ marginBottom: 'var(--space-6)', opacity: 0.7 }}>Signert med BankID v1.0</p>

            <a
              href="https://ayddwbmkclujefnhsaqv.supabase.co/storage/v1/object/public/documents/VilkarsavtaleBoligbanken.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="button"
              style={{ width: '100%', maxWidth: '400px', margin: '0 auto var(--space-4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', textDecoration: 'none' }}
            >
              <FileText size={20} /> Les avtalen du signerte (PDF)
            </a>
            
            <div style={{ display: 'grid', gap: 'var(--space-4)', maxWidth: '400px', margin: '0 auto' }}>
              <Link href="/homeowner/manage" className="button" style={{ width: '100%' }}>
                Gå til mine boliger
              </Link>
              
              <button 
                onClick={handleTerminate}
                disabled={loading}
                className="button-accent"
                style={{ 
                  width: '100%', 
                  padding: 'var(--space-4)', 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  color: '#ef4444', 
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {loading ? 'Behandler...' : 'Si opp avtale'}
              </button>

              <button 
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser()
                  if (user) {
                    await supabase.from('user_agreements').delete().eq('user_id', user.id)
                    window.location.reload()
                  }
                }}
                style={{ 
                  background: 'none', border: '1px dashed var(--border-subtle)', 
                  color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 'var(--space-4)',
                  cursor: 'pointer', padding: '8px', borderRadius: '8px'
                }}
              >
                DEBUG: Nullstill avtale (for å teste ekte signering)
              </button>
            </div>

            <p className="text-sm" style={{ marginTop: 'var(--space-6)', color: '#ef4444' }}>
              <CheckCircle2 size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: '#94a3b8' }} />
              Ved oppsigelse mister du tilgang umiddelbart. Informasjon om deg og boligene bevares for kommunens historikk.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="container">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <Link href="/" className="nav-link" style={{ marginLeft: '-1rem', marginBottom: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <ArrowLeft size={18} /> Avbryt og gå tilbake
          </Link>
          <h1 style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>Signering av vilkår</h1>
          <p style={{ fontSize: '1.125rem', opacity: 0.8 }}>For å bruke Boligbank må du lese og signere kommunens vilkårsavtale med BankID.</p>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-medium)', background: '#ffffff' }}>
          <div style={{ padding: 'var(--space-4) var(--space-6)', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <FileText size={18} style={{ color: '#0f172a' }} />
              <span style={{ fontWeight: 700, color: '#0f172a' }}>Vilkårsavtale Boligbank v1.0</span>
            </div>
            {!hasScrolledToBottom && (
              <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ChevronDown size={14} /> Les helt til bunnen for å aktivere signering
              </div>
            )}
          </div>

          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            style={{ 
              height: '450px', 
              overflowY: 'auto', 
              padding: 'var(--space-8)', 
              background: '#ffffff', 
              color: '#1e293b',
              lineHeight: '1.8',
              fontSize: '1.1rem'
            }}
          >
            <h2 style={{ color: '#0f172a', fontSize: '1.6rem', marginBottom: 'var(--space-6)', borderBottom: '2px solid #f1f5f9', paddingBottom: 'var(--space-2)' }}>Vilkår for bruk av Boligbank</h2>
            
            <section style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ color: '#0f172a', fontSize: '1.25rem', marginBottom: 'var(--space-2)' }}>1. Formål</h3>
              <p style={{ color: '#334155' }}>Boligbank skal lette formidlingen av egnede boliger fra private utleiere til personer som har behov for bistand fra kommunen til å skaffe bolig. Systemet fungerer som en brobygger for å sikre trygge boforhold.</p>
            </section>
            
            <section style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ color: '#0f172a', fontSize: '1.25rem', marginBottom: 'var(--space-2)' }}>2. Utleiers forpliktelser</h3>
              <p style={{ color: '#334155' }}>Utleier plikter å gi korrekt informasjon om boligen ved registrering. Dette inkluderer nøyaktige opplysninger om pris, størrelse, fasiliteter og tilgjengelighet. Utleier skal holde informasjonen i Boligbank oppdatert til enhver tid.</p>
            </section>
            
            <section style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ color: '#0f172a', fontSize: '1.25rem', marginBottom: 'var(--space-2)' }}>3. Personvern og Data</h3>
              <p style={{ color: '#334155' }}>Behandling av personopplysninger i Boligbank skjer i samsvar med gjeldende personvernregelverk (GDPR). Utleiers kontaktinformasjon gjøres kun tilgjengelig for autoriserte kommune-ansatte for formidlingsformål.</p>
            </section>
            
            <section style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ color: '#0f172a', fontSize: '1.25rem', marginBottom: 'var(--space-2)' }}>4. Varighet og oppsigelse</h3>
              <p style={{ color: '#334155' }}>Denne avtalen gjelder inntil den sies opp av en av partene. Utleier kan når som helst si opp avtalen via portalen. Ved oppsigelse slettes utleiers tilgang. Bolig- og brukerdata bevares for kommunens historikk.</p>
            </section>
            
            <section style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ color: '#0f172a', fontSize: '1.25rem', marginBottom: 'var(--space-2)' }}>5. Ansvarsforhold</h3>
              <p style={{ color: '#334155' }}>Eventuelle tvister knyttet til selve leieforholdet er et privatrettslig forhold mellom utleier og leietaker. Kommunen er ikke part i selve leieavtalen med mindre det foreligger en spesifikk garanti eller avtale om dette.</p>
            </section>

            <div style={{ marginTop: 'var(--space-10)', padding: 'var(--space-8)', background: '#f8fafc', borderRadius: '16px', textAlign: 'center', border: '2px solid #e2e8f0' }}>
              <ShieldCheck size={48} style={{ color: '#059669', margin: '0 auto var(--space-4)' }} />
              <p style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a', margin: 0 }}>Du har nå gjennomgått hele avtalen.</p>
              <p style={{ color: '#64748b', marginTop: '4px' }}>Vennligst bekreft nedenfor for å fortsette.</p>
            </div>
          </div>

          <div style={{ padding: 'var(--space-6) var(--space-8)', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              <div style={{ marginTop: '4px' }}>
                <CheckCircle2 size={20} style={{ color: hasScrolledToBottom ? '#059669' : '#94a3b8' }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0, color: '#0f172a' }}>Jeg bekrefter at jeg har lest og forstått vilkårene</p>
                <p style={{ fontSize: '0.9rem', color: '#475569', marginTop: '2px' }}>Ved å trykke på knappen nedenfor signerer du avtalen digitalt med BankID.</p>
              </div>
            </div>

            <button 
              onClick={handleSign}
              disabled={!hasScrolledToBottom || loading}
              className="button"
              style={{ 
                width: '100%', 
                padding: 'var(--space-4)', 
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-3)',
                background: hasScrolledToBottom ? 'var(--color-royal-blue)' : '#e2e8f0',
                color: hasScrolledToBottom ? 'white' : '#94a3b8',
                cursor: hasScrolledToBottom ? 'pointer' : 'not-allowed'
              }}
            >
              {loading ? <Lock size={20} style={{ opacity: 0.7 }} /> : <ShieldCheck size={20} />}
              {loading ? 'Signerer med BankID...' : 'Signer med BankID'}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)', justifyContent: 'center' }}>
          <Lock size={14} />
          <span style={{ fontSize: '0.8rem' }}>Sikker signering levert av BankID</span>
        </div>
      </div>
    </main>
  )
}

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> }

export default function SignTerms(props: PageProps) {
  use(props.searchParams ?? Promise.resolve({}))
  return (
    <Suspense fallback={<div className="container" style={{ minHeight: '80vh' }} />}>
      <SignTermsContent />
    </Suspense>
  )
}
