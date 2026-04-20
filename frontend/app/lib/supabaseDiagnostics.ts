/**
 * Kjører konkrete sjekker av Supabase-miljø og nettverk slik at vi kan se
 * nøyaktig hvor det feiler (env, nøkkel, prosjektmismatch, HTTP, auth-timeout).
 * Ingen hemmeligheter logges fullt ut — nøkkel maskeres i rapporten.
 */

export type DiagnosticStatus = 'ok' | 'warn' | 'fail'

export type DiagnosticStep = {
  id: string
  label: string
  status: DiagnosticStatus
  detail: string
  code?: string
  ms?: number
}

export type SupabaseDiagnosticReport = {
  generatedAt: string
  origin: string
  userAgent: string
  steps: DiagnosticStep[]
  summaryCode: string
  summaryText: string
  copyText: string
}

function maskKey(key: string): string {
  const t = key.trim()
  if (t.length <= 12) return '(for kort til å maskes)'
  return `${t.slice(0, 8)}…${t.slice(-4)} (${t.length} tegn)`
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/$/, '')
}

/** Fra legacy anon JWT: payload.ref skal matche *.supabase.co host. */
function jwtPayload(jwt: string): { ref?: string; role?: string } | null {
  if (!jwt.startsWith('eyJ')) return null
  try {
    const payload = jwt.split('.')[1]
    if (!payload) return null
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(b64)) as { ref?: string; role?: string }
  } catch {
    return null
  }
}

function jwtProjectRefFromAnonKey(jwt: string): string | null {
  const j = jwtPayload(jwt)
  return typeof j?.ref === 'string' ? j.ref : null
}

function hostProjectRef(url: string): string | null {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    const m = u.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/i)
    return m ? m[1].toLowerCase() : null
  } catch {
    return null
  }
}

function keyFormatHint(key: string): { label: string; code: string } {
  const k = key.trim()
  if (!k) return { label: 'mangler', code: 'KEY_MISSING' }
  if (k.startsWith('eyJ'))
    return { label: 'JWT (legacy anon / service — skal være anon)', code: 'KEY_JWT' }
  if (k.startsWith('sb_publishable_'))
    return { label: 'Publishable (sb_publishable_*)', code: 'KEY_PUBLISHABLE' }
  if (k.startsWith('sb_')) return { label: 'Supabase-nøkkel (sb_*)', code: 'KEY_SB_PREFIX' }
  return { label: 'ukjent format — verifiser i Dashboard → API', code: 'KEY_UNKNOWN_FORMAT' }
}

async function timedFetch(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<{ res: Response | null; err: string | null; ms: number }> {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, cache: 'no-store' })
    const ms = Math.round(
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0
    )
    return { res, err: null, ms }
  } catch (e) {
    const ms = Math.round(
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0
    )
    const msg = e instanceof Error ? e.message : String(e)
    const err = msg.includes('abort') ? `Timeout etter ${timeoutMs} ms` : msg
    return { res: null, err, ms }
  } finally {
    clearTimeout(to)
  }
}

/**
 * Full rapport — trygg å lime inn i support (nøkkel er masket).
 */
export async function runSupabaseDiagnostics(): Promise<SupabaseDiagnosticReport> {
  const steps: DiagnosticStep[] = []
  const urlRaw = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const keyRaw = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''

  const push = (s: DiagnosticStep) => {
    steps.push(s)
  }

  // --- Env ---
  if (!urlRaw) {
    push({
      id: 'env_url',
      label: 'NEXT_PUBLIC_SUPABASE_URL',
      status: 'fail',
      detail: 'Mangler (tom streng). Sett i Vercel og .env.local, deretter redeploy.',
      code: 'ENV_URL_MISSING',
    })
  } else {
    push({
      id: 'env_url',
      label: 'NEXT_PUBLIC_SUPABASE_URL',
      status: 'ok',
      detail: normalizeUrl(urlRaw),
      code: 'ENV_URL_OK',
    })
  }

  if (!keyRaw) {
    push({
      id: 'env_key',
      label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      status: 'fail',
      detail: 'Mangler. Bruk publishable eller anon public fra Supabase → Settings → API.',
      code: 'ENV_KEY_MISSING',
    })
  } else {
    const masked = maskKey(keyRaw)
    const fmt = keyFormatHint(keyRaw)
    const pl = jwtPayload(keyRaw)
    const isServiceRole = pl?.role === 'service_role'
    push({
      id: 'env_key',
      label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      status: isServiceRole ? 'fail' : fmt.code === 'KEY_UNKNOWN_FORMAT' ? 'warn' : 'ok',
      detail: isServiceRole
        ? `${masked} — FEIL: Dette er service_role (hemmelig). Bruk publishable/anon public i frontend.`
        : `${masked} — ${fmt.label}`,
      code: isServiceRole ? 'KEY_IS_SERVICE_ROLE' : fmt.code,
    })
  }

  // URL-form
  let urlOk = false
  if (urlRaw) {
    try {
      const nu = normalizeUrl(urlRaw)
      const u = new URL(nu)
      const host = u.hostname
      const ref = hostProjectRef(nu)
      if (u.protocol !== 'https:') {
        push({
          id: 'url_https',
          label: 'URL-protokoll',
          status: 'warn',
          detail: `Forventet https, fikk ${u.protocol}`,
          code: 'URL_NOT_HTTPS',
        })
      } else {
        urlOk = true
        push({
          id: 'url_https',
          label: 'URL-protokoll',
          status: 'ok',
          detail: 'https',
          code: 'URL_HTTPS_OK',
        })
      }
      if (!host.endsWith('.supabase.co')) {
        push({
          id: 'url_host',
          label: 'URL-host',
          status: 'warn',
          detail: `Uvanlig host «${host}» (forventer *.supabase.co)`,
          code: 'URL_HOST_UNUSUAL',
        })
      } else if (ref) {
        push({
          id: 'url_ref',
          label: 'Prosjekt-ref i URL',
          status: 'ok',
          detail: ref,
          code: 'URL_REF_OK',
        })
      }
    } catch {
      push({
        id: 'url_parse',
        label: 'URL parsing',
        status: 'fail',
        detail: 'Kunne ikke parse URL',
        code: 'URL_PARSE_FAIL',
      })
    }
  }

  // JWT ref vs URL (kun legacy anon JWT)
  if (urlRaw && keyRaw.startsWith('eyJ')) {
    const hrefRef = hostProjectRef(normalizeUrl(urlRaw))
    const keyRef = jwtProjectRefFromAnonKey(keyRaw)
    if (keyRef && hrefRef && keyRef.toLowerCase() !== hrefRef.toLowerCase()) {
      push({
        id: 'jwt_ref_match',
        label: 'JWT ref ↔ URL',
        status: 'fail',
        detail: `Mismatch: nøkkel ref=${keyRef} men URL ref=${hrefRef}. Begge må være samme Supabase-prosjekt.`,
        code: 'JWT_REF_URL_MISMATCH',
      })
    } else if (keyRef && hrefRef) {
      push({
        id: 'jwt_ref_match',
        label: 'JWT ref ↔ URL',
        status: 'ok',
        detail: `ref=${keyRef} samsvarer med URL`,
        code: 'JWT_REF_MATCH_OK',
      })
    }
  } else if (keyRaw.startsWith('sb_')) {
    push({
      id: 'jwt_ref_match',
      label: 'JWT ref ↔ URL',
      status: 'ok',
      detail:
        'Publishable-nøkkel — ingen JWT-ref å sammenligne (normalt). Verifiser heller at /auth/v1/health er OK.',
      code: 'KEY_PUBLISHABLE_OK',
    })
  }

  const HTTP_TIMEOUT = 12_000

  // Nettverk: Auth API
  if (urlRaw && keyRaw) {
    const base = normalizeUrl(urlRaw)
    const { res, err, ms } = await timedFetch(
      `${base}/auth/v1/health`,
      {
        method: 'GET',
        headers: {
          apikey: keyRaw,
          Authorization: `Bearer ${keyRaw}`,
        },
      },
      HTTP_TIMEOUT
    )
    if (err) {
      push({
        id: 'http_auth_health',
        label: 'HTTP GET /auth/v1/health',
        status: 'fail',
        detail: err,
        code: 'HTTP_AUTH_HEALTH_FAIL',
        ms,
      })
    } else if (res) {
      const body = await res.text()
      const ok = res.ok
      push({
        id: 'http_auth_health',
        label: 'HTTP GET /auth/v1/health',
        status: ok ? 'ok' : res.status === 401 || res.status === 403 ? 'fail' : 'warn',
        detail: `HTTP ${res.status} på ${ms}ms — ${body.slice(0, 160)}`,
        code: ok
          ? 'HTTP_AUTH_HEALTH_OK'
          : res.status === 401
            ? 'HTTP_401_INVALID_KEY'
            : `HTTP_${res.status}`,
        ms,
      })
    }
  }

  // Nettverk: REST root (åpen metadata)
  if (urlRaw && keyRaw) {
    const base = normalizeUrl(urlRaw)
    const { res, err, ms } = await timedFetch(
      `${base}/rest/v1/`,
      {
        method: 'GET',
        headers: {
          apikey: keyRaw,
          Authorization: `Bearer ${keyRaw}`,
          Accept: 'application/json',
        },
      },
      HTTP_TIMEOUT
    )
    if (err) {
      push({
        id: 'http_rest_root',
        label: 'HTTP GET /rest/v1/',
        status: 'fail',
        detail: err,
        code: 'HTTP_REST_FAIL',
        ms,
      })
    } else if (res) {
      const snippet = await res.text()
      /**
       * Rot-URL `/rest/v1/` er ikke det samme som `from('tabell')`. Med **anon**-nøkkel svarer
       * ofte 401 (eldre: «schema forbidden», nyere: «Secret API key required») — forventet og ufarlig.
       * Ekte data går via tabell-endepunkter fra supabase-js.
       */
      const restRoot401ExpectedForAnon =
        res.status === 401 &&
        /schema is forbidden|Access to schema|only allowed using a secret|Secret API key required|Only secret API keys can be used for this endpoint/i.test(
          snippet
        )
      if (restRoot401ExpectedForAnon) {
        push({
          id: 'http_rest_root',
          label: 'HTTP GET /rest/v1/ (rot)',
          status: 'ok',
          detail: `HTTP ${res.status} forventet med anon-nøkkel på API-rot (ikke tabell-kall). Appen bruker supabase-js mot konkrete tabeller — ikke denne URL-en. Se GET /auth/v1/health over.`,
          code: 'HTTP_REST_ROOT_ANON_401_EXPECTED_OK',
          ms,
        })
      } else {
        push({
          id: 'http_rest_root',
          label: 'HTTP GET /rest/v1/ (rot)',
          status: res.ok || res.status === 404 ? 'ok' : 'warn',
          detail: `HTTP ${res.status} på ${ms}ms — ${snippet.slice(0, 120)}`,
          code: res.ok ? 'HTTP_REST_OK' : `HTTP_REST_${res.status}`,
          ms,
        })
      }
    }
  }

  // Oppsummering
  const failed = steps.filter((s) => s.status === 'fail')
  const warns = steps.filter((s) => s.status === 'warn')
  const summaryCode =
    failed.length > 0
      ? failed.map((f) => f.code || f.id).join(',')
      : warns.length > 0
        ? `WARN:${warns.map((w) => w.code || w.id).join(',')}`
        : 'ALL_OK'

  const summaryText =
    failed.length > 0
      ? `Feil: ${failed.map((f) => f.label).join('; ')}`
      : warns.length > 0
        ? `Advarsler: ${warns.map((w) => w.label).join('; ')}`
        : 'Alle automatiske sjekker OK.'

  const reportObj = {
    generatedAt: new Date().toISOString(),
    origin,
    userAgent: ua,
    summaryCode,
    summaryText,
    steps,
  }

  const copyText = JSON.stringify(reportObj, null, 2)

  return {
    generatedAt: reportObj.generatedAt,
    origin,
    userAgent: ua,
    steps,
    summaryCode,
    summaryText,
    copyText,
  }
}

/** Kjør getSession med tidsmåling — oppdager heng uten å vente 22s. */
export async function measureGetSessionMs(supabase: {
  auth: { getSession: () => Promise<unknown> }
}): Promise<{ ms: number; error?: string; session: boolean }> {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  try {
    const { data } = (await supabase.auth.getSession()) as {
      data: { session: unknown }
    }
    const ms = Math.round(
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0
    )
    return { ms, session: !!data?.session }
  } catch (e) {
    const ms = Math.round(
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0
    )
    return { ms, session: false, error: e instanceof Error ? e.message : String(e) }
  }
}
