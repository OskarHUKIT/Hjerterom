'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ShieldCheck,
  FileText,
  CheckCircle2,
  Lock,
  ArrowLeft,
  History,
} from 'lucide-react'
import { supabase, getAuthUserDeduped } from '../../lib/supabase'
import { useLanguage } from '../../../context/LanguageContext'
import {
  readPendingFirstListingDraft,
  insertListingFromPendingDraft,
  EXPECT_PENDING_LISTING_AFTER_SIGN_KEY,
} from '../lib/pendingFirstListing'
import { formatDateNo } from '../../lib/dateFormat'
import type { TranslationKey } from '../../../lib/translations'
import { isKommuneStaffRole } from '../../lib/kommuneRoles'
import { logError } from '@/app/lib/appLogger'
import { publicDocumentsFileUrl } from '../../lib/storagePublicUrl'

type SignedTermsCard = {
  id: string
  signedAt: string
  pdfHref: string | null
  versionLine: string | null
  regionLabel: string | null
  status: 'active' | 'superseded'
}

function SignedAgreementCard({
  item: a,
  variant,
  t,
  fallbackTermsPdfHref,
}: {
  item: SignedTermsCard
  variant: 'active' | 'historic'
  t: (key: TranslationKey) => string
  fallbackTermsPdfHref: string
}) {
  const historic = variant === 'historic'
  return (
    <div
      className="card"
      style={{
        padding: 'var(--space-6)',
        textAlign: 'left',
        border: historic ? '1px solid rgba(148, 163, 184, 0.4)' : '1px solid var(--border-medium)',
        background: 'var(--bg-card)',
        boxShadow: historic ? 'none' : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '8px',
              background: historic ? 'rgba(148, 163, 184, 0.12)' : 'rgba(45, 212, 191, 0.15)',
              color: historic ? 'var(--text-muted)' : 'var(--color-teal)',
              border: historic
                ? '1px solid rgba(148, 163, 184, 0.3)'
                : '1px solid rgba(45, 212, 191, 0.35)',
            }}
          >
            {a.regionLabel ?? t('termsScopeGlobalBadge')}
          </span>
          {historic ? (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#d97706',
                border: '1px solid rgba(245, 158, 11, 0.35)',
              }}
            >
              {t('termsStatusSuperseded')}
            </span>
          ) : null}
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {t('termsSignedOn').replace('{date}', formatDateNo(a.signedAt))}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}
      >
        {historic ? (
          <History size={28} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
        ) : (
          <ShieldCheck
            size={28}
            style={{ color: 'var(--color-teal)', flexShrink: 0, marginTop: 2 }}
          />
        )}
        <div>
          <h2 style={{ margin: '0 0 var(--space-2)', fontSize: '1.15rem' }}>
            {historic ? t('termsHistoricalCardTitle') : 'Avtalen er aktiv'}
          </h2>
          <p style={{ margin: 0, opacity: 0.75, fontSize: '0.9rem' }}>
            {historic ? t('termsHistoricalCardNote') : 'Signert med BankID v1.0'}
          </p>
        </div>
      </div>
      {a.versionLine ? (
        <p
          className="text-sm"
          style={{ marginBottom: 'var(--space-4)', color: 'var(--text-body)', lineHeight: 1.5 }}
        >
          {a.versionLine}
        </p>
      ) : (
        <p
          className="text-sm"
          style={{ marginBottom: 'var(--space-4)', color: 'var(--text-muted)', lineHeight: 1.5 }}
        >
          {t('termsNoDbVersion')}
        </p>
      )}
      <a
        href={a.pdfHref ?? fallbackTermsPdfHref}
        target="_blank"
        rel="noopener noreferrer"
        className="button"
        style={{
          width: '100%',
          maxWidth: '360px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          textDecoration: 'none',
          opacity: historic ? 0.95 : 1,
        }}
      >
        <FileText size={20} /> Les avtalen du signerte (PDF)
      </a>
    </div>
  )
}

function SignTermsContent() {
  const { t, locale: appLocale } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [pageReady, setPageReady] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [signCity, setSignCity] = useState('')
  const [termsDoc, setTermsDoc] = useState<{
    id: string
    title: string
    body: string | null
    version: number
    pdf_bucket?: string | null
    pdf_storage_path?: string | null
  } | null>(null)
  const [signedAcceptances, setSignedAcceptances] = useState<SignedTermsCard[]>([])

  const fallbackTermsPdfHref = publicDocumentsFileUrl('VilkarsavtaleBoligbanken.pdf')

  const cityParam = searchParams.get('city')?.trim() || ''
  const returnToRaw = searchParams.get('returnTo')?.trim() || ''
  const safeReturnHref =
    returnToRaw.startsWith('/') && !returnToRaw.startsWith('//') ? returnToRaw : '/homeowner/manage'

  useEffect(() => {
    const checkAgreement = async () => {
      setPageReady(false)
      const signedParam = searchParams.get('signed')
      /**
       * Token-restore kjøres KUN når signering faktisk fullførte (`signed=true`).
       * Ved avbrudd (`signed=false`) eller browser-back går vi aldri via auth-refresh —
       * det ville risikere å nullstille en gyldig økt og sende brukeren til /login
       * (blink + utlogging). Cancel skal oppføre seg som vanlig navigasjon.
       */
      let sessionReadyFromStorage = false
      if (signedParam === 'true' && typeof window !== 'undefined') {
        try {
          const bankIdStorage = window.sessionStorage.getItem('supabase-auth-bankid')
          if (bankIdStorage) {
            const parsed = JSON.parse(bankIdStorage)
            const session = parsed?.currentSession ?? parsed
            const access_token = session?.access_token
            const refresh_token = session?.refresh_token
            if (access_token && refresh_token) {
              const { data: sessData, error: sessErr } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              })
              sessionReadyFromStorage = !sessErr && !!sessData.session
            }
          }
        } catch (_) {}
        if (!sessionReadyFromStorage) {
          await supabase.auth.refreshSession()
        }
      }

      /** Ved avbrudd fra Signicat: rydd `?signed=false&error=...` fra URL så det ikke henger igjen. */
      if (signedParam === 'false' && typeof window !== 'undefined') {
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, '', cleanUrl)
      }
      const user = await getAuthUserDeduped()
      if (!user) {
        router.push('/login')
        return
      }

      const listingPromise = cityParam
        ? Promise.resolve({ data: null as { city?: string | null } | null, error: null })
        : supabase
            .from('listings')
            .select('city')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

      const [{ data: profile }, { data: ua }, listingRes] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        supabase.from('user_agreements').select('*').eq('user_id', user.id).maybeSingle(),
        listingPromise,
      ])
      if (isKommuneStaffRole(profile?.role)) {
        router.replace('/nav/database')
        return
      }

      if (ua?.is_terminated && ua?.terminated_by_kommune) {
        router.replace('/homeowner/kommune-terminated')
        return
      }

      const isActiveAgreement = !!ua && !ua.is_terminated
      setIsSigned(isActiveAgreement)

      let effectiveCity = cityParam
      if (!effectiveCity) {
        effectiveCity = listingRes.data?.city?.trim() || ''
      }
      setSignCity(effectiveCity)

      const docRpc = supabase.rpc('get_terms_document_for_signing', {
        p_user_id: user.id,
        p_city: effectiveCity.trim() || null,
      })

      type DocRow = {
        id: string
        title: string
        body: string | null
        version: number
        pdf_bucket?: string | null
        pdf_storage_path?: string | null
      }

      let docRows: unknown
      let docErr: { message: string } | null = null
      let accRows:
        | {
            id: string
            signed_at: string
            status: string
            terms_documents: unknown
          }[]
        | null = null

      if (isActiveAgreement) {
        const [docResult, accResult] = await Promise.all([
          docRpc,
          supabase
            .from('user_terms_acceptances')
            .select(
              'id, signed_at, status, terms_documents ( title, version, pdf_bucket, pdf_storage_path, kommune_region )'
            )
            .eq('user_id', user.id)
            .in('status', ['active', 'superseded'])
            .order('signed_at', { ascending: false }),
        ])
        docRows = docResult.data
        docErr = docResult.error
        accRows = accResult.data
      } else {
        const docResult = await docRpc
        docRows = docResult.data
        docErr = docResult.error
      }

      if (!docErr && docRows && Array.isArray(docRows) && docRows[0]) {
        setTermsDoc(docRows[0] as DocRow)
      } else {
        setTermsDoc(null)
      }

      if (isActiveAgreement) {
        const cards: SignedTermsCard[] = []
        for (const row of accRows || []) {
          const rawTd = row.terms_documents as
            | {
                title?: string
                version?: number
                pdf_bucket?: string | null
                pdf_storage_path?: string | null
                kommune_region?: string | null
              }
            | Array<{
                title?: string
                version?: number
                pdf_bucket?: string | null
                pdf_storage_path?: string | null
                kommune_region?: string | null
              }>
            | null
          const td = Array.isArray(rawTd) ? rawTd[0] : rawTd
          if (!td) continue
          let pdfHref: string | null = null
          if (td.pdf_storage_path?.trim()) {
            pdfHref = supabase.storage
              .from(td.pdf_bucket || 'documents')
              .getPublicUrl(td.pdf_storage_path.trim()).data.publicUrl
          }
          const versionLine =
            td.title != null && td.version != null
              ? t('termsSignedVersionLine')
                  .replace('{title}', td.title)
                  .replace('{version}', String(td.version))
              : null
          const regionLabel = td.kommune_region?.trim() ? td.kommune_region.trim() : null
          const st = row.status === 'superseded' ? 'superseded' : 'active'
          cards.push({
            id: row.id,
            signedAt: row.signed_at,
            pdfHref,
            versionLine,
            regionLabel,
            status: st,
          })
        }
        setSignedAcceptances(cards)
      } else {
        setSignedAcceptances([])
      }

      if (typeof window !== 'undefined' && searchParams.get('signed') !== 'true') {
        try {
          if (!readPendingFirstListingDraft()) {
            sessionStorage.removeItem(EXPECT_PENDING_LISTING_AFTER_SIGN_KEY)
          }
        } catch {
          /* ignore */
        }
      }

      setPageReady(true)
    }
    checkAgreement()
  }, [router, searchParams, cityParam, t])

  useEffect(() => {
    const signedParam = searchParams.get('signed')
    if (signedParam !== 'true' || typeof window === 'undefined') return
    if (!readPendingFirstListingDraft()) return

    const lockKey = 'boly_pending_insert_lock'
    if (sessionStorage.getItem(lockKey)) return
    sessionStorage.setItem(lockKey, '1')
    ;(async () => {
      try {
        await supabase.auth.refreshSession()
        const user = await getAuthUserDeduped()
        if (!user) return
        const result = await insertListingFromPendingDraft(user.id)
        if (!result) return
        router.replace('/homeowner/manage')
      } catch (e: unknown) {
        logError(e)
        const msg = e instanceof Error ? e.message : String(e)
        alert(t('signTermsListingAfterSignError') + msg)
      } finally {
        sessionStorage.removeItem(lockKey)
      }
    })()
  }, [searchParams, router, t])

  /** Etter BankID: utkast til bolig kan mangle (annen nettleser / tømt lagring) — ikke la brukeren tro at boligen er registrert. */
  useEffect(() => {
    const signedParam = searchParams.get('signed')
    if (signedParam !== 'true' || typeof window === 'undefined') return
    if (readPendingFirstListingDraft()) return
    let expect: string | null = null
    try {
      expect = sessionStorage.getItem(EXPECT_PENDING_LISTING_AFTER_SIGN_KEY)
    } catch {
      return
    }
    if (expect !== '1') return
    try {
      sessionStorage.removeItem(EXPECT_PENDING_LISTING_AFTER_SIGN_KEY)
    } catch {
      /* ignore */
    }
    alert(t('signTermsPendingDraftLost'))
    router.replace('/homeowner/register')
  }, [searchParams, router, t])

  const canProceedToSign = !!termsDoc

  const handleSign = async () => {
    if (!termsDoc) {
      alert(t('signTermsNoApprovedDocument'))
      return
    }

    setLoading(true)
    try {
      const user = await getAuthUserDeduped()
      if (!user) throw new Error('Logg inn på nytt og prøv igjen.')

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      if (!anonKey?.trim()) {
        throw new Error(
          'NEXT_PUBLIC_SUPABASE_ANON_KEY mangler i .env.local. Legg til anon-nøkkelen fra Supabase Dashboard → Settings → API.'
        )
      }
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token || anonKey
      const body = {
        userId: user.id,
        agreementVersion: '1.0',
        origin: typeof window !== 'undefined' ? window.location.origin : '',
        appLocale,
        ...(signCity.trim() ? { city: signCity.trim() } : {}),
      }
      const res = await fetch(`${supabaseUrl}/functions/v1/sign-agreement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
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
      if (res.status === 403) {
        const msg =
          typeof data?.message === 'string' && data.message.trim()
            ? data.message
            : t('signTermsBlockedTerminated')
        throw new Error(msg)
      }
      if (!res.ok) {
        const msg =
          (data?.message ?? data?.error ?? res.statusText) || 'Kunne ikke starte signering.'
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
      }
      if (data?.url) {
        window.location.href = data.url
        return
      }
      const errMsg = data?.error ?? data?.message ?? 'Kunne ikke starte signering.'
      throw new Error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg))
    } catch (err: any) {
      const raw = err?.message || String(err)
      const fetchLikely =
        /failed to fetch|load failed|networkerror|network error when attempting to fetch/i.test(
          String(raw)
        )
      alert(
        t('signTermsStartError') +
          raw +
          (fetchLikely ? t('signTermsStartErrorFailedFetchHint') : '')
      )
      setLoading(false)
    }
  }

  const handleTerminate = async () => {
    if (!confirm(t('signTermsTerminateConfirm'))) return

    setLoading(true)
    try {
      const user = await getAuthUserDeduped()
      if (!user) throw new Error('Not authenticated')

      // 1. Mark agreement as terminated (listings og brukerdata bevares for kommunens historikk)
      const { error: termError } = await supabase
        .from('user_agreements')
        .update({
          is_terminated: true,
          terminated_at: new Date().toISOString(),
          terminated_by_kommune: false,
        })
        .eq('user_id', user.id)

      if (termError) throw termError

      // 2. Log the termination
      await supabase.from('audit_logs').insert([
        {
          user_id: user.id,
          action_type: 'TERMINATE_AGREEMENT',
          details: { version: '1.0' },
        },
      ])

      alert(t('signTermsTerminatedSuccess'))
      await supabase.auth.signOut()
      router.push('/')
    } catch (err: any) {
      alert(t('signTermsTerminateError') + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!pageReady) {
    return (
      <main className="container">
        <div
          style={{
            maxWidth: '800px',
            margin: '0 auto',
            minHeight: '50vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Sjekker avtale...</div>
        </div>
      </main>
    )
  }

  if (isSigned && !termsDoc) {
    const activeAcceptances = signedAcceptances.filter((x) => x.status === 'active')
    const historicAcceptances = signedAcceptances.filter((x) => x.status === 'superseded')

    return (
      <main className="container">
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <Link
              href="/homeowner/manage"
              className="nav-link"
              style={{
                marginLeft: '-1rem',
                marginBottom: 'var(--space-2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
              }}
            >
              ← Mine boliger
            </Link>
            <h1 style={{ fontSize: 'var(--fluid-h1-hero)' }}>{t('termsSignedAgreementsTitle')}</h1>
            <p style={{ fontSize: '1.125rem', opacity: 0.8, lineHeight: 1.5 }}>
              {t('termsSignedAgreementsIntro')}
            </p>
            <p
              style={{
                fontSize: '0.9rem',
                opacity: 0.75,
                marginTop: 'var(--space-3)',
                lineHeight: 1.5,
              }}
            >
              {t('termsBankidUmbrellaNote')}
            </p>
          </div>

          {signedAcceptances.length === 0 ? (
            <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
              <div style={{ color: 'var(--color-teal)', marginBottom: 'var(--space-4)' }}>
                <ShieldCheck size={64} style={{ margin: '0 auto' }} />
              </div>
              <h2 style={{ marginBottom: 'var(--space-2)' }}>Avtalen er aktiv</h2>
              <p style={{ marginBottom: 'var(--space-3)', opacity: 0.7 }}>
                Signert med BankID v1.0
              </p>
              <p
                className="text-sm"
                style={{
                  marginBottom: 'var(--space-6)',
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                }}
              >
                {t('termsNoDbVersion')}
              </p>
              <a
                href={fallbackTermsPdfHref}
                target="_blank"
                rel="noopener noreferrer"
                className="button"
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  margin: '0 auto var(--space-4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-2)',
                  textDecoration: 'none',
                }}
              >
                <FileText size={20} /> Les avtalen du signerte (PDF)
              </a>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--space-8)', marginBottom: 'var(--space-6)' }}>
              <section aria-labelledby="terms-active-heading">
                <h2
                  id="terms-active-heading"
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    margin: '0 0 var(--space-2)',
                    color: 'var(--text-main)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {t('termsActiveSectionTitle')}
                </h2>
                <p
                  style={{
                    margin: '0 0 var(--space-4)',
                    fontSize: '0.9rem',
                    opacity: 0.8,
                    lineHeight: 1.5,
                  }}
                >
                  {t('termsActiveSectionHint')}
                </p>
                <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                  {activeAcceptances.length === 0 ? (
                    <p style={{ fontSize: '0.9rem', opacity: 0.75, margin: 0 }}>
                      {t('termsActiveEmptyFallback')}
                    </p>
                  ) : (
                    activeAcceptances.map((a) => (
                      <SignedAgreementCard
                        key={a.id}
                        item={a}
                        variant="active"
                        t={t}
                        fallbackTermsPdfHref={fallbackTermsPdfHref}
                      />
                    ))
                  )}
                </div>
              </section>

              {historicAcceptances.length > 0 ? (
                <section
                  aria-labelledby="terms-historical-heading"
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: 'var(--space-6)',
                  }}
                >
                  <h2
                    id="terms-historical-heading"
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      margin: '0 0 var(--space-2)',
                      color: 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <History size={22} style={{ opacity: 0.85 }} />
                    {t('termsHistoricalSectionTitle')}
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: 'rgba(148, 163, 184, 0.15)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {historicAcceptances.length}
                    </span>
                  </h2>
                  <p
                    style={{
                      margin: '0 0 var(--space-4)',
                      fontSize: '0.9rem',
                      opacity: 0.8,
                      lineHeight: 1.5,
                    }}
                  >
                    {t('termsHistoricalSectionHint')}
                  </p>
                  <details
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: 'var(--space-2) var(--space-4)',
                      background: 'rgba(0,0,0,0.12)',
                    }}
                  >
                    <summary
                      style={{
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        padding: 'var(--space-2) 0',
                        listStyle: 'none',
                      }}
                    >
                      {t('termsHistoricalDetailsSummary')} ({historicAcceptances.length})
                    </summary>
                    <div
                      style={{
                        display: 'grid',
                        gap: 'var(--space-4)',
                        marginTop: 'var(--space-4)',
                      }}
                    >
                      {historicAcceptances.map((a) => (
                        <SignedAgreementCard
                          key={a.id}
                          item={a}
                          variant="historic"
                          t={t}
                          fallbackTermsPdfHref={fallbackTermsPdfHref}
                        />
                      ))}
                    </div>
                  </details>
                </section>
              ) : null}
            </div>
          )}

          <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div
              style={{
                display: 'grid',
                gap: 'var(--space-4)',
                maxWidth: '400px',
                margin: '0 auto',
              }}
            >
              <Link href="/homeowner/manage" className="button" style={{ width: '100%' }}>
                Gå til mine boliger
              </Link>

              <button
                type="button"
                onClick={handleTerminate}
                disabled={loading}
                className="button button-danger"
                style={{
                  width: '100%',
                  padding: 'var(--space-4)',
                  borderRadius: '10px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Behandler...' : 'Si opp avtale'}
              </button>

              <button
                type="button"
                onClick={async () => {
                  const user = await getAuthUserDeduped()
                  if (user) {
                    await supabase.from('user_agreements').delete().eq('user_id', user.id)
                    window.location.reload()
                  }
                }}
                style={{
                  background: 'none',
                  border: '1px dashed var(--border-subtle)',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  marginTop: 'var(--space-4)',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                }}
              >
                DEBUG: Nullstill avtale (for å teste ekte signering)
              </button>
            </div>

            <p className="text-sm" style={{ marginTop: 'var(--space-6)', color: '#ef4444' }}>
              <CheckCircle2
                size={14}
                style={{
                  display: 'inline',
                  marginRight: '4px',
                  verticalAlign: 'middle',
                  color: '#94a3b8',
                }}
              />
              Ved oppsigelse mister du tilgang umiddelbart. Informasjon om deg og boligene bevares
              for kommunens historikk.
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
          <Link
            href={isSigned ? '/homeowner/manage' : safeReturnHref}
            className="nav-link"
            style={{
              marginLeft: '-1rem',
              marginBottom: 'var(--space-2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <ArrowLeft size={18} /> Avbryt og gå tilbake
          </Link>
          <h1 style={{ fontSize: 'var(--fluid-h1-hero)', marginBottom: 'var(--space-2)' }}>
            {t('signTermsPageTitle')}
          </h1>
          <p style={{ fontSize: '1.125rem', opacity: 0.85, lineHeight: 1.55 }}>
            {isSigned
              ? t('signTermsIntroAdditionalSigning')
              : signCity.trim()
                ? t('signTermsIntroFirstTimeWithCity').replace('{city}', signCity.trim())
                : t('signTermsIntroFirstTimeNoCity')}
          </p>
          {isSigned && signCity.trim() ? (
            <p
              style={{
                fontSize: '1rem',
                marginTop: 12,
                color: 'var(--text-body)',
                lineHeight: 1.5,
              }}
            >
              {t('signTermsCityHint').replace('{city}', signCity.trim())}
            </p>
          ) : null}
        </div>

        <div
          className="card"
          style={{
            padding: 'var(--space-6) var(--space-8)',
            border: '1px solid var(--border-medium)',
            background: '#ffffff',
          }}
        >
          {!termsDoc ? (
            <div
              style={{
                padding: 'var(--space-6)',
                background: '#fffbeb',
                border: '1px solid #fcd34d',
                borderRadius: 12,
                color: '#78350f',
                lineHeight: 1.6,
                marginBottom: 'var(--space-6)',
              }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>{t('signTermsNoApprovedDocument')}</p>
              <p style={{ margin: '12px 0 0', fontSize: '0.95rem' }}>
                <Link href="/homeowner/manage" className="nav-link" style={{ fontWeight: 600 }}>
                  {t('myProperties')}
                </Link>
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-4) var(--space-5)',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                marginBottom: 'var(--space-6)',
              }}
            >
              <FileText size={20} style={{ color: '#0f172a', flexShrink: 0 }} />
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {termsDoc.title} · v{termsDoc.version}
              </span>
            </div>
          )}

          <button
            onClick={handleSign}
            disabled={!canProceedToSign || loading}
            className="button"
            style={{
              width: '100%',
              padding: 'var(--space-4)',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-3)',
              background: canProceedToSign ? 'var(--color-royal-blue)' : '#e2e8f0',
              color: canProceedToSign ? 'white' : '#94a3b8',
              cursor: canProceedToSign ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? <Lock size={20} style={{ opacity: 0.7 }} /> : <ShieldCheck size={20} />}
            {loading ? 'Signerer med BankID...' : 'Signer med BankID'}
          </button>
        </div>

        <div
          style={{
            marginTop: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            color: 'var(--text-muted)',
            justifyContent: 'center',
          }}
        >
          <Lock size={14} />
          <span style={{ fontSize: '0.8rem' }}>Sikker signering levert av BankID</span>
        </div>
      </div>
    </main>
  )
}

export default function SignTerms() {
  return (
    <Suspense fallback={<div className="container" style={{ minHeight: '80vh' }} />}>
      <SignTermsContent />
    </Suspense>
  )
}
